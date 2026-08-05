import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import {
  raiseDispute,
  listMyDisputes,
  getDispute,
  addDisputeMessage,
  resolveDispute,
  rejectDispute,
  listAdminDisputes,
  getDisputeStats
} from '../services/disputeService.js';
import { createNotification } from '../services/notificationService.js';

function isInvolvedUser(req, dispute) {
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'customer') return dispute.customerId === req.user.id;
  // provider: compare provider.userId
  return dispute.provider?.user?.id === req.user.id;
}

function resolveOtherPartyId(dispute, senderRole) {
  if (senderRole === 'customer') return dispute.provider?.user?.id || null;
  if (senderRole === 'provider') return dispute.customerId;
  return null;
}

export const DisputeController = {
  /** Customer or provider raises a dispute against a booking. */
  create: async (req, res) => {
    try {
      const { bookingId, reason, description, evidence, raisedBy } = req.body || {};
      const actor = raisedBy || (req.user.role === 'customer' ? 'CUSTOMER' : 'PROVIDER');

      const dispute = await raiseDispute({
        bookingId,
        userId: req.user.id,
        raisedBy: actor,
        reason,
        description,
        evidence
      });

      const io = req.app?.get('socketio');
      if (io) io.to('room:admin').emit('dispute:created', { disputeId: dispute.id, bookingId, status: 'OPEN' });

      return sendApiSuccess(res, 201, dispute);
    } catch (err) {
      const status = ['FORBIDDEN', 'BOOKING_NOT_FOUND', 'MISSING_FIELDS', 'SHORT_DESCRIPTION', 'INVALID_ACTOR'].includes(err.code) ? 400 : err.code === 'DUPLICATE_DISPUTE' ? 409 : 500;
      return sendApiError(res, status, err.code || 'INTERNAL_ERROR', err.message || 'Failed to raise dispute');
    }
  },

  /** Customer or provider: their own disputes. */
  getMine: async (req, res) => {
    try {
      const disputes = await listMyDisputes(req.user.id, req.user.role);
      return sendApiSuccess(res, 200, disputes);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load disputes', err.message);
    }
  },

  /** Scoped single dispute (customer / provider / admin). */
  getById: async (req, res) => {
    try {
      const dispute = await getDispute(req.params.id, req.user.id, req.user.role);
      return sendApiSuccess(res, 200, dispute);
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 500;
      return sendApiError(res, status, err.code || 'INTERNAL_ERROR', err.message || 'Failed to load dispute');
    }
  },

  /** Party (or admin) replies within a dispute conversation. */
  addMessage: async (req, res) => {
    try {
      const { message } = req.body || {};
      const dispute = await getDispute(req.params.id, req.user.id, req.user.role);
      if (!isInvolvedUser(req, dispute)) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You cannot post in this dispute.');
      }

      const senderRole = req.user.role === 'admin' ? 'admin' : (dispute.customerId === req.user.id ? 'customer' : 'provider');
      const created = await addDisputeMessage({
        disputeId: dispute.id,
        senderId: req.user.id,
        senderRole,
        message
      });

      const io = req.app?.get('socketio');
      if (io) {
        io.to(`user:${dispute.customerId}`).emit('dispute:message', { disputeId: dispute.id, message: created });
        if (dispute.provider?.user?.id) io.to(`user:${dispute.provider.user.id}`).emit('dispute:message', { disputeId: dispute.id, message: created });
        if (senderRole !== 'admin') io.to('room:admin').emit('dispute:message', { disputeId: dispute.id, message: created });
      }
      const notifyUserId = resolveOtherPartyId(dispute, senderRole);
      if (notifyUserId && senderRole !== 'admin') {
        await createNotification(notifyUserId, 'New dispute reply', 'The other party replied to your dispute.', 'DISPUTE');
      }

      return sendApiSuccess(res, 201, created);
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : ['EMPTY_MESSAGE', 'MESSAGE_TOO_LONG', 'DISPUTE_CLOSED'].includes(err.code) ? 400 : 500;
      return sendApiError(res, status, err.code || 'INTERNAL_ERROR', err.message || 'Failed to send message');
    }
  },

  /** Admin resolves a dispute, optionally refunding the customer wallet. */
  resolve: async (req, res) => {
    try {
      const { resolutionType, refundAmount, adminNote } = req.body || {};
      const updated = await resolveDispute({
        disputeId: req.params.id,
        adminId: req.user.id,
        resolutionType,
        refundAmount,
        adminNote
      });

      await createNotification(updated.customerId, 'Dispute resolved', 'Your dispute has been resolved by the support team.', 'DISPUTE');
      if (updated.provider?.user?.id) await createNotification(updated.provider.user.id, 'Dispute resolved', 'A dispute on your booking has been resolved.', 'DISPUTE');

      const io = req.app?.get('socketio');
      if (io) {
        io.to(`user:${updated.customerId}`).emit('dispute:resolved', { disputeId: updated.id, status: 'RESOLVED' });
        if (updated.provider?.user?.id) io.to(`user:${updated.provider.user.id}`).emit('dispute:resolved', { disputeId: updated.id, status: 'RESOLVED' });
      }

      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'ALREADY_RESOLVED' ? 409 : ['INVALID_RESOLUTION', 'INVALID_REFUND', 'REFUND_EXCEEDS_AMOUNT'].includes(err.code) ? 400 : 500;
      return sendApiError(res, status, err.code || 'INTERNAL_ERROR', err.message || 'Failed to resolve dispute');
    }
  },

  /** Admin rejects a dispute with no refund. */
  reject: async (req, res) => {
    try {
      const { adminNote } = req.body || {};
      const updated = await rejectDispute({
        disputeId: req.params.id,
        adminId: req.user.id,
        adminNote
      });

      await createNotification(updated.customerId, 'Dispute closed', 'Your dispute was reviewed and closed without a refund.', 'DISPUTE');
      if (updated.provider?.user?.id) await createNotification(updated.provider.user.id, 'Dispute closed', 'A dispute on your booking has been closed.', 'DISPUTE');

      const io = req.app?.get('socketio');
      if (io) {
        io.to(`user:${updated.customerId}`).emit('dispute:resolved', { disputeId: updated.id, status: 'REJECTED' });
        if (updated.provider?.user?.id) io.to(`user:${updated.provider.user.id}`).emit('dispute:resolved', { disputeId: updated.id, status: 'REJECTED' });
      }

      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'ALREADY_RESOLVED' ? 409 : 500;
      return sendApiError(res, status, err.code || 'INTERNAL_ERROR', err.message || 'Failed to reject dispute');
    }
  },

  /** Admin: paginated dispute list. */
  getAdminDisputes: async (req, res) => {
    try {
      const { page = 1, limit = 25, status } = req.query;
      const data = await listAdminDisputes({ status: status || null, page, limit });
      return sendApiSuccess(res, 200, data);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load disputes', err.message);
    }
  },

  /** Admin: dispute stats. */
  getAdminStats: async (req, res) => {
    try {
      const data = await getDisputeStats();
      return sendApiSuccess(res, 200, data);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load dispute stats', err.message);
    }
  }
};
