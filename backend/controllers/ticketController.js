import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { parsePagination, offsetMeta } from '../utils/pagination.js';

export const TicketController = {
  getAll: async (req, res) => {
    try {
      if (!req.user) {
        return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      }

      const role = req.user.role;
      const { skip, take, page, limit } = parsePagination(req.query, { limit: 20 });

      const where = role !== 'admin'
        ? { OR: [{ userId: req.user.id }, { userId: null, requesterEmail: req.user.email }] }
        : {};

      const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
        prisma.ticket.count({ where })
      ]);

      return sendApiSuccess(res, 200, { tickets, pagination: offsetMeta(total, page, limit) });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to retrieve support tickets', err.message);
    }
  },


  create: async (req, res) => {
    try {
      const { subject, message, relatedBookingId } = req.body;
      const account = req.user
        ? await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true, email: true } })
        : null;
      const name = account?.name || req.body?.name;
      const email = account?.email || req.body?.email;
      if (!name || !email || !subject || !message) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing support claim parameters (name, email, subject, message)');
      }
      if (relatedBookingId && req.user) {
        const booking = await prisma.booking.findUnique({ where: { id: relatedBookingId }, select: { customerId: true } });
        if (!booking || (req.user.role === 'customer' && booking.customerId !== req.user.id)) {
          return sendApiError(res, 403, 'FORBIDDEN', 'You can only link your own booking to a support ticket.');
        }
      }

      const ticket = await prisma.ticket.create({
        data: {
          userId: req.user?.id || null,
          requesterName: name,
          requesterEmail: email,
          subject,
          message,
          relatedBookingId: relatedBookingId || null,
          status: 'OPEN'
        }
      });
      const io = req.app?.get('socketio');
      if (io) io.to('room:admin').emit('adminAlert:newSupportTicket', { ticketId: ticket.id });
      return sendApiSuccess(res, 201, ticket);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to file support ticket', err.message);
    }
  },

  resolve: async (req, res) => {
    try {
      if (!req.user) {
        return sendApiError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      }

      const role = req.user.role;
      if (role !== 'admin') return sendApiError(res, 403, 'FORBIDDEN', 'Admin access required');

      const { id } = req.params;
      if (!id || !String(id).trim()) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Ticket ID is required.');
      }

      const { response } = req.body;

      if (!response) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'An admin resolution comment string is required.');
      }

      const ticket = await prisma.ticket.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          adminResponse: response,
          resolvedAt: new Date()
        }
      });
      return sendApiSuccess(res, 200, ticket);
    } catch (err) {
      if (err.code === 'P2025') {
        return sendApiError(res, 404, 'NOT_FOUND', 'Support ticket not found');
      }
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to resolve support ticket', err.message);
    }
  }
  ,
  setStatus: async (req, res) => {
    try {
      if (!req.params.id || !String(req.params.id).trim()) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Ticket ID is required.');
      }
      const { status, response } = req.body || {};
      if (!['OPEN', 'RESOLVED', 'CLOSED'].includes(String(status).toUpperCase())) return sendApiError(res, 400, 'INVALID_STATUS', 'Status must be OPEN, RESOLVED, or CLOSED.');
      if (response !== undefined && String(response).trim().length > 2000) return sendApiError(res, 400, 'VALIDATION_ERROR', 'Response cannot exceed 2000 characters.');
      const data = { status: String(status).toUpperCase() };
      if (response !== undefined) data.adminResponse = String(response).trim() || null;
      if (data.status === 'RESOLVED') data.resolvedAt = new Date();
      const ticket = await prisma.ticket.update({ where: { id: req.params.id }, data });
      return sendApiSuccess(res, 200, ticket);
    } catch (err) {
      if (err.code === 'P2025') return sendApiError(res, 404, 'NOT_FOUND', 'Support ticket not found.');
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to update support ticket', err.message);
    }
  }
};

