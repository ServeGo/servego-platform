import prisma from '../prisma/client.js';
import {
  submitQuotation,
  getLiveQuotation,
  confirmQuotation,
  declineQuotation,
  getServiceFeeDefault
} from '../services/quotationService.js';
import {
  notifyQuotationReceived,
  notifyQuotationAccepted,
  notifyQuotationDeclined
} from '../services/notificationService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { buildLeadPayload } from '../services/leadService.js';

export const QuotationController = {
  /** GET /bookings/:id/quotation — the latest quotation for the booking. */
  getQuotation: async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await prisma.booking.findUnique({
        where: { id },
        select: { id: true, customerId: true, providerId: true, status: true, serviceCategory: true }
      });
      if (!booking) return sendApiError(res, 404, 'NOT_FOUND', 'Booking not found.');
      if (req.user.role === 'customer' && booking.customerId !== req.user.id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only view your own booking quotations.');
      }
      if (req.user.role === 'provider') {
        const provider = await prisma.provider.findUnique({ where: { userId: req.user.id }, select: { id: true } });
        if (!provider || booking.providerId !== provider.id) {
          return sendApiError(res, 403, 'FORBIDDEN', 'You can only view quotations for your assigned bookings.');
        }
      }

      const quotation = await getLiveQuotation(id);
      if (!quotation) return sendApiError(res, 404, 'QUOTATION_NOT_FOUND', 'No quotation has been submitted for this booking yet.');
      return sendApiSuccess(res, 200, { booking, quotation });
    } catch (err) {
      console.error('[QuotationController.getQuotation] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch the quotation.', err.message);
    }
  },

  /** POST /bookings/:id/quotation — provider submits/revises the live quotation. */
  submit: async (req, res) => {
    try {
      const { id } = req.params;
      const provider = await prisma.provider.findUnique({
        where: { userId: req.user.id },
        select: { id: true, accountStatus: true, userId: true }
      });
      if (!provider) return sendApiError(res, 403, 'FORBIDDEN', 'Provider profile not found.');
      if (provider.accountStatus === 'BLOCKED') {
        return sendApiError(res, 403, 'PROVIDER_BLOCKED', 'Blocked providers cannot manage bookings.');
      }

      const { booking, quotation } = await submitQuotation({
        bookingId: id,
        providerId: provider.id,
        items: req.body?.items || []
      });

      const io = req.app.get('socketio');
      await notifyQuotationReceived(io, booking, quotation, provider.userId);

      return sendApiSuccess(res, 200, { booking, quotation });
    } catch (err) {
      console.error('[QuotationController.submit] Error:', err);
      const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
      return sendApiError(res, code === 'INTERNAL_ERROR' ? 500 : code === 'QUOTATION_NOT_FOUND' ? 404 : 409, code,
        code === 'INTERNAL_ERROR' ? 'Failed to submit the quotation.' : err.message,
        process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
    }
  },

  /** POST /bookings/:id/quotation/confirm — customer confirms; work starts. */
  confirm: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await confirmQuotation({ bookingId: id, actorId: req.user.id });

      const io = req.app.get('socketio');
      const providerUserId = await getProviderUserId(result.booking?.providerId);

      await notifyQuotationAccepted(io, result.booking, result.quotation, providerUserId);
      if (io && result.booking) {
        io.to(`user:${result.booking.customerId}`).emit('booking:statusChanged', { bookingId: result.booking.id, status: 'ONGOING' });
        if (providerUserId) io.to(`user:${providerUserId}`).emit('booking:statusChanged', { bookingId: result.booking.id, status: 'ONGOING' });
      }

      return sendApiSuccess(res, 200, result);
    } catch (err) {
      console.error('[QuotationController.confirm] Error:', err);
      const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
      return sendApiError(res, code === 'INTERNAL_ERROR' ? 500 : code === 'QUOTATION_NOT_FOUND' ? 404 : 409, code,
        code === 'INTERNAL_ERROR' ? 'Failed to confirm the quotation.' : err.message,
        process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
    }
  },

  /** POST /bookings/:id/quotation/cancel — customer cancels, pays service fee. */
  cancel: async (req, res) => {
    try {
      const { id } = req.params;
      const anotherProvider = req.body?.anotherProvider === true;
      const note = req.body?.note || null;

      const result = await declineQuotation({ bookingId: id, actorId: req.user.id, anotherProvider, note });

      const io = req.app.get('socketio');
      const providerUserId = await getProviderUserId(result.booking?.providerId);

      if (result.nextProvider && result.booking) {
        const payload = buildLeadPayload(result.lead, result.booking, result.nextProvider);
        await notifyQuotationDeclined(io, result.booking, result.quotation, providerUserId, false);
        if (io) {
          io.to(`user:${result.booking.customerId}`).emit('booking:statusChanged', { bookingId: result.booking.id, status: 'PENDING' });
        }
        return sendApiSuccess(res, 200, { ...result, payload });
      }

      await notifyQuotationDeclined(io, result.booking, result.quotation, providerUserId, result.cancelled === true);
      if (io && result.cancelled) {
        io.to(`user:${result.booking.customerId}`).emit('booking:cancelled', { bookingId: result.booking.id, status: 'CANCELLED' });
        if (providerUserId) io.to(`user:${providerUserId}`).emit('booking:cancelled', { bookingId: result.booking.id, status: 'CANCELLED' });
      }

      return sendApiSuccess(res, 200, result);
    } catch (err) {
      console.error('[QuotationController.cancel] Error:', err);
      const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
      const status = code === 'QUOTATION_NOT_FOUND' ? 404 : code === 'INSUFFICIENT_BALANCE' ? 400 : code === 'INTERNAL_ERROR' ? 500 : 409;
      return sendApiError(res, status, code,
        code === 'INTERNAL_ERROR' ? 'Failed to cancel the quotation.' : err.message,
        process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
    }
  }
};

async function getProviderUserId(providerId) {
  if (!providerId) return null;
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { userId: true }
  });
  return provider?.userId || null;
}