import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import {
  notifyAdminPermanentServiceRequest,
  notifyPermanentServiceRequestApproved,
  notifyPermanentServiceRequestRejected,
  notifyPermanentServiceRequestSubmitted
} from '../services/notificationService.js';

const REQUEST_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  assignedProvider: {
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatar: true } }
    }
  }
};

function parseOptionalInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const PermanentServiceRequestController = {
  create: async (req, res) => {
    try {
      const {
        serviceCategory,
        engagementType,
        startDate,
        contractDurationYears,
        contractDurationDays,
        monthlyBudget,
        additionalInfo
      } = req.body;

      const engagement = String(engagementType || '').trim().toUpperCase();
      if (!['PERMANENT', 'CONTRACT'].includes(engagement)) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'Engagement type must be PERMANENT or CONTRACT.');
      }

      const contractYears = parseOptionalInt(contractDurationYears);
      const contractDays = parseOptionalInt(contractDurationDays);
      if (engagement === 'CONTRACT' && !contractYears && !contractDays) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'Contract duration is required (years or days).');
      }

      const parsedStart = new Date(startDate);
      if (Number.isNaN(parsedStart.getTime())) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'Start date is invalid.');
      }

      const budget = Number(monthlyBudget);
      if (!Number.isFinite(budget) || budget <= 0) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'Monthly budget must be a positive number.');
      }

      const request = await prisma.permanentServiceRequest.create({
        data: {
          customerId: req.user.id,
          serviceCategory: String(serviceCategory || '').trim(),
          engagementType: engagement,
          startDate: parsedStart,
          contractDurationYears: contractYears,
          contractDurationDays: contractDays,
          monthlyBudget: budget,
          additionalInfo: additionalInfo ? String(additionalInfo).trim() : null,
          status: 'PENDING'
        },
        include: REQUEST_INCLUDE
      });

      await notifyPermanentServiceRequestSubmitted(req.user.id);
      const io = req.app.get('socketio');
      if (io) {
        await notifyAdminPermanentServiceRequest(io, {
          requestId: request.id,
          serviceCategory: request.serviceCategory,
          customerId: req.user.id
        });
      }

      return sendApiSuccess(res, 201, request);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to submit the service request', err.message);
    }
  },

  getMine: async (req, res) => {
    try {
      const { status } = req.query;
      const where = { customerId: req.user.id };
      if (status) where.status = String(status).toUpperCase();

      const requests = await prisma.permanentServiceRequest.findMany({
        where,
        include: REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' }
      });

      return sendApiSuccess(res, 200, requests);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load service requests', err.message);
    }
  },

  getById: async (req, res) => {
    try {
      const request = await prisma.permanentServiceRequest.findUnique({
        where: { id: req.params.id },
        include: REQUEST_INCLUDE
      });
      if (!request) return sendApiError(res, 404, 'NOT_FOUND', 'Service request not found.');
      if (req.user.role !== 'admin' && request.customerId !== req.user.id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only view your own service requests.');
      }
      return sendApiSuccess(res, 200, request);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load the service request', err.message);
    }
  },

  listAll: async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
      const skip = (page - 1) * limit;
      const { status } = req.query;
      const where = {};
      if (status) where.status = String(status).toUpperCase();

      const [requests, total] = await Promise.all([
        prisma.permanentServiceRequest.findMany({
          where,
          include: REQUEST_INCLUDE,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.permanentServiceRequest.count({ where })
      ]);

      return sendApiSuccess(res, 200, {
        requests,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load service requests', err.message);
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, assignedProviderId, adminNote } = req.body;

      const existing = await prisma.permanentServiceRequest.findUnique({ where: { id } });
      if (!existing) return sendApiError(res, 404, 'NOT_FOUND', 'Service request not found.');
      if (existing.status !== 'PENDING') {
        return sendApiError(res, 409, 'ALREADY_REVIEWED', `This request has already been ${existing.status.toLowerCase()}.`);
      }

      const nextStatus = String(status || '').toUpperCase();
      if (!['APPROVED', 'REJECTED'].includes(nextStatus)) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'Status must be APPROVED or REJECTED.');
      }

      let providerId = null;
      if (assignedProviderId) {
        const provider = await prisma.provider.findUnique({ where: { id: assignedProviderId }, select: { id: true } });
        if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Assigned provider not found.');
        providerId = provider.id;
      }
      if (nextStatus === 'APPROVED' && !providerId) {
        return sendApiError(res, 400, 'VALIDATION_ERROR', 'A provider must be assigned to approve this request.');
      }

      const updated = await prisma.permanentServiceRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          assignedProviderId: providerId,
          adminNote: adminNote ? String(adminNote).trim() : null
        },
        include: REQUEST_INCLUDE
      });

      const io = req.app.get('socketio');
      if (nextStatus === 'APPROVED') {
        await notifyPermanentServiceRequestApproved(existing.customerId, { requestId: id, assignedProviderId: providerId });
        if (io) io.to(`user:${existing.customerId}`).emit('permanentRequest:approved', { requestId: id, status: 'APPROVED' });
      } else {
        await notifyPermanentServiceRequestRejected(existing.customerId, { requestId: id, status: 'REJECTED', adminNote: updated.adminNote });
        if (io) io.to(`user:${existing.customerId}`).emit('permanentRequest:rejected', { requestId: id, status: 'REJECTED' });
      }

      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to update the service request', err.message);
    }
  },

  cancel: async (req, res) => {
    try {
      const existing = await prisma.permanentServiceRequest.findUnique({ where: { id: req.params.id } });
      if (!existing) return sendApiError(res, 404, 'NOT_FOUND', 'Service request not found.');
      if (existing.customerId !== req.user.id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only cancel your own service requests.');
      }
      if (existing.status !== 'PENDING') {
        return sendApiError(res, 409, 'ALREADY_REVIEWED', 'Only pending requests can be cancelled.');
      }

      const updated = await prisma.permanentServiceRequest.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED' },
        include: REQUEST_INCLUDE
      });

      return sendApiSuccess(res, 200, updated);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to cancel the service request', err.message);
    }
  }
};
