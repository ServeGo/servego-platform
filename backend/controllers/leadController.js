import prisma from '../prisma/client.js';
import {
  listProviderLeads,
  listCustomerLeads,
  listAllLeads,
  getLeadWithHistory,
  markLeadViewed,
  acceptLeadForBooking,
  rejectLead,
  buildLeadPayload
} from '../services/leadService.js';
import { cancelLeadExpiry } from '../services/leadExpiryService.js';
import {
  notifyLeadAccepted,
  notifyLeadCancelled,
  notifyNoProviderFound
} from '../services/notificationService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

const BOOKING_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  provider: {
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatar: true } }
    }
  },
  service: true,
};

async function resolveProviderId(req) {
  const provider = await prisma.provider.findUnique({
    where: { userId: req.user.id },
    select: { id: true }
  });
  return provider?.id || null;
}

function errorResponse(res, err, fallback) {
  const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
  return sendApiError(res, code === 'INTERNAL_ERROR' ? 500 : 409, code,
    code === 'INTERNAL_ERROR' ? fallback : err.message,
    process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
}

export const LeadController = {
  /** List leads for the authenticated provider or customer. */
  getMine: async (req, res) => {
    try {
      if (req.user.role === 'provider') {
        const providerId = await resolveProviderId(req);
        if (!providerId) {
          return sendApiSuccess(res, 200, { leads: [] });
        }
        const leads = await listProviderLeads(providerId);
        return sendApiSuccess(res, 200, { leads });
      }
      if (req.user.role === 'customer') {
        const leads = await listCustomerLeads(req.user.id);
        return sendApiSuccess(res, 200, { leads });
      }
      return sendApiError(res, 403, 'FORBIDDEN', 'Leads are only available to providers and customers.');
    } catch (err) {
      return errorResponse(res, err, 'Failed to load leads.');
    }
  },

  /** Single lead with its full assignment/transfer history (role-aware). */
  getById: async (req, res) => {
    try {
      const lead = await getLeadWithHistory(req.params.id);
      if (!lead) return sendApiError(res, 404, 'NOT_FOUND', 'Lead not found.');

      if (req.user.role === 'provider') {
        const providerId = await resolveProviderId(req);
        if (!providerId || lead.providerId !== providerId && !lead.assignmentHistory.some((a) => a.providerId === providerId)) {
          return sendApiError(res, 403, 'FORBIDDEN', 'You can only view leads assigned to you.');
        }
      } else if (req.user.role === 'customer' && lead.customerId !== req.user.id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only view your own leads.');
      }

      return sendApiSuccess(res, 200, lead);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load lead.');
    }
  },

  /** Provider opened the lead — NEW → VIEWED. */
  view: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');
      const lead = await markLeadViewed({ leadId: req.params.id, providerId });
      if (!lead) return sendApiError(res, 403, 'FORBIDDEN', 'This lead is not assigned to you.');
      return sendApiSuccess(res, 200, lead);
    } catch (err) {
      return errorResponse(res, err, 'Failed to mark lead as viewed.');
    }
  },

  /** Provider accepts the lead (booking PENDING → CONFIRMED, first-accept-wins). */
  accept: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');

      const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
      if (!lead) return sendApiError(res, 404, 'NOT_FOUND', 'Lead not found.');
      if (!lead.bookingId) return sendApiError(res, 409, 'NO_BOOKING', 'This lead has no active booking.');

      const offer = await prisma.leadAssignmentHistory.findFirst({
        where: { leadId: lead.id, providerId, isCurrent: true },
        select: { id: true }
      });
      if (!offer) return sendApiError(res, 403, 'FORBIDDEN', 'This booking request is no longer offered to you.');

      const result = await acceptLeadForBooking({ bookingId: lead.bookingId, providerId });
      cancelLeadExpiry(lead.id);

      const updated = await prisma.booking.findUnique({ where: { id: lead.bookingId }, include: BOOKING_INCLUDE });
      const io = req.app.get('socketio');
      await notifyLeadAccepted(io, updated.customerId, buildLeadPayload(result.lead ?? lead, updated));
      if (io) {
        io.to(`user:${updated.customerId}`).emit('booking:statusChanged', { bookingId: updated.id, status: 'CONFIRMED' });
        // Auto-cancel the remaining offers — tell every losing provider in
        // parallel (each is an independent notify + queue insert).
        await Promise.all(
          (result.cancelledProviders || []).map((loser) =>
            notifyLeadCancelled(io, loser.userId, buildLeadPayload(result.lead ?? lead, updated))
          )
        );
      }

      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      return errorResponse(res, err, 'Failed to accept lead.');
    }
  },

  /** Provider declines the lead — withdraws their own offer; others remain. */
  reject: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');

      const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
      if (!lead) return sendApiError(res, 404, 'NOT_FOUND', 'Lead not found.');

      const { reason } = req.body;
      const result = await rejectLead({ leadId: lead.id, providerId, reason: reason || 'PROVIDER_DECLINED' });

      const io = req.app.get('socketio');
      let updated = null;
      if (lead.bookingId) updated = await prisma.booking.findUnique({ where: { id: lead.bookingId }, include: BOOKING_INCLUDE });

      cancelLeadExpiry(result.lead?.id);

      if (result.settled) {
        if (updated) await notifyNoProviderFound(io, updated.customerId, buildLeadPayload(result.lead, updated));
        if (io && updated) io.to(`user:${updated.customerId}`).emit('booking:cancelled', { bookingId: updated.id, status: 'CANCELLED' });
      }

      return sendApiSuccess(res, 200, updated ?? result.lead);
    } catch (err) {
      return errorResponse(res, err, 'Failed to reject lead.');
    }
  }
};
