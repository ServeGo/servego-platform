import prisma from '../prisma/client.js';
import { refreshAllProviderReputations, refreshProviderReputation } from '../services/providerReputationService.js';
import { notifyServiceApproved, notifyServiceDenied } from '../services/notificationService.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

const normalize = (s) => (s || '').toString().trim().toLowerCase();

export const AdminProviderServiceController = {
  getPendingRequests: async (req, res) => {
    try {
      const requestedStatus = String(req.query.status || 'PENDING').toUpperCase();
      if (!['PENDING', 'APPROVED', 'DENIED', 'REJECTED'].includes(requestedStatus)) {
        return sendApiError(res, 400, 'INVALID_STATUS', 'status must be PENDING, APPROVED, DENIED, or REJECTED.');
      }
      const requests = await prisma.providerServiceRequest.findMany({
        where: { status: requestedStatus },
        orderBy: { createdAt: 'desc' },
        include: {
          provider: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true, avatar: true } }
            }
          }
        }
      });
      return sendApiSuccess(res, 200, requests);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch provider service requests', err.message);
    }
  },

  approveService: async (req, res) => {
    try {
      const { id } = req.params;

      const request = await prisma.providerServiceRequest.findUnique({
        where: { id },
        include: { provider: { include: { user: true } } }
      });
      if (!request) return sendApiError(res, 404, 'NOT_FOUND', 'Service request not found.');
      if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
        return sendApiError(res, 409, 'INVALID_STATE', 'Only pending service requests can be approved.');
      }

      const wasAlreadyApproved = request.status === 'APPROVED';
      const requestedName = request.requestedServiceName;
      const nameNormalized = normalize(requestedName);

      // Expected flow: approval should only create/update ProviderService links,
      // while the Service row must already exist.
      let service = await prisma.service.findUnique({
        where: { nameNormalized },
        select: { id: true }
      });

      if (!service) {
        service = await prisma.service.create({
          data: {
            name: String(requestedName).trim(),
            nameNormalized,
            description: request.description || null
          },
          select: { id: true }
        });
      }






      const link = await prisma.providerService.upsert({


        where: {
          // ProviderService has @@unique([providerId, serviceId])

          providerId_serviceId: {
            providerId: request.providerId,
            serviceId: service.id
          }
        },
        update: {
          description: request.description,
          // keep request link if it already exists; otherwise set it
          providerServiceRequestId: request.id
        },
        create: {
          providerId: request.providerId,
          serviceId: service.id,
          description: request.description,
          providerServiceRequestId: request.id
        }
      });

      await prisma.providerServiceRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedBy: req.user.id,
          reviewedAt: new Date()
        }
      });
      await refreshProviderReputation(request.providerId);

      if (!wasAlreadyApproved && request?.provider?.user?.id) {
        await notifyServiceApproved(request.provider.user.id, requestedName);
        // Emit socket event so all open dashboards refresh the active-specialist count
        const io = req.app?.get('socketio');
        if (io) {
          io.emit('serviceApproved', { serviceId: service.id, serviceName: requestedName });
          io.to(`user:${request.provider.user.id}`).emit('providerService:approved', { providerServiceRequestId: request.id, serviceId: service.id });
          io.emit('category:activeCountChanged', { serviceId: service.id });
        }
      }

      await writeAuditLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'APPROVE_SERVICE_REQUEST',
        targetType: 'ProviderServiceRequest',
        targetId: id,
        oldValue: { status: request.status },
        newValue: { status: 'APPROVED' },
        ip: req.ip
      });

      sendApiSuccess(res, 200, { requestId: request.id, serviceId: service.id, providerServiceId: link.id });
    } catch (err) {
      sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to approve service request', err.message);
    }
  },

  denyService: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};

      if (!reason || !String(reason).trim()) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required field: reason.');
      }

      const request = await prisma.providerServiceRequest.findUnique({
        where: { id },
        include: { provider: { include: { user: true } } }
      });
      if (!request) return sendApiError(res, 404, 'NOT_FOUND', 'Service request not found.');
      if (request.status !== 'PENDING') {
        return sendApiError(res, 409, 'INVALID_STATE', 'Only pending service requests can be denied.');
      }

      await prisma.providerServiceRequest.update({
        where: { id },
        data: {
          status: 'DENIED',
          denialReason: String(reason).trim(),
          reviewedBy: req.user.id,
          reviewedAt: new Date()
        }
      });

      if (request?.provider?.user?.id) {
        await notifyServiceDenied(request.provider.user.id, request.requestedServiceName, String(reason).trim());
        const io = req.app?.get('socketio');
        if (io) io.to(`user:${request.provider.user.id}`).emit('providerService:rejected', { providerServiceRequestId: request.id });
      }

      await writeAuditLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'DENY_SERVICE_REQUEST',
        targetType: 'ProviderServiceRequest',
        targetId: id,
        oldValue: { status: request.status },
        newValue: { status: 'DENIED', denialReason: String(reason).trim() },
        ip: req.ip
      });

      sendApiSuccess(res, 200, { requestId: request.id });
    } catch (err) {
      sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to deny service request', err.message);
    }
  },

  refreshReputation: async (req, res) => {
    try {
      const providers = await refreshAllProviderReputations();
      sendApiSuccess(res, 200, { providersUpdated: providers.filter(Boolean).length });
    } catch (err) {
      sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to refresh provider reputation', err.message);
    }
  }
};
