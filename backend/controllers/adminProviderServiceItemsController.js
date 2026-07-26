import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

export const AdminProviderServiceItemsController = {
  getAll: async (req, res) => {
    try {
      const [pendingRequests, deniedRequests, approvedLinks] = await Promise.all([
        prisma.providerServiceRequest.findMany({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          include: {
            provider: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, phone: true, avatar: true }
                }
              }
            }
          }
        }),

        prisma.providerServiceRequest.findMany({
          where: { status: 'DENIED' },
          orderBy: { createdAt: 'desc' },
          include: {
            provider: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, phone: true, avatar: true }
                }
              }
            }
          }
        }),

        prisma.providerService.findMany({
          include: {
            provider: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, phone: true, avatar: true }
                }
              }
            },
            service: true
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      const pendingMapped = pendingRequests.map((r) => ({
        type: 'PENDING',
        id: r.id,
        provider: r.provider,
        name: r.requestedServiceName,
        description: r.description || '-',
        experienceYears: r.experienceYears ?? r.provider?.experienceYears ?? null,
        createdAt: r.createdAt,
        approvalStatus: r.status
      }));

      const deniedMapped = deniedRequests.map((r) => ({
        type: 'DENIED',
        id: r.id,
        provider: r.provider,
        name: r.requestedServiceName,
        description: r.description || '-',
        experienceYears: r.experienceYears ?? r.provider?.experienceYears ?? null,
        createdAt: r.createdAt,
        approvalStatus: r.status,
        denialReason: r.denialReason || null
      }));

      const approvedMapped = approvedLinks.map((link) => ({
        type: 'APPROVED',
        id: `APP-${link.id}`,
        provider: link.provider,
        name: link.service.name,
        description: link.description || link.service.description || '-',
        experienceYears: link.provider?.experienceYears ?? null,
        createdAt: link.createdAt,
        approvalStatus: 'APPROVED'
      }));

      const statusPriority = { PENDING: 0, DENIED: 1, APPROVED: 2 };
      const combined = [...pendingMapped, ...deniedMapped, ...approvedMapped].sort((a, b) => {
        const pa = statusPriority[a.approvalStatus] ?? 3;
        const pb = statusPriority[b.approvalStatus] ?? 3;
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return sendApiSuccess(res, 200, combined);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch provider service items', err.message);
    }
  }
};

