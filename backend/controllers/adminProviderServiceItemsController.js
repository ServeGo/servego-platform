import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { parsePagination, offsetMeta } from '../utils/pagination.js';

const SELECT_PROVIDER = {
  include: {
    provider: {
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatar: true }
        }
      }
    }
  }
};

export const AdminProviderServiceItemsController = {
  getAll: async (req, res) => {
    try {
      const { page, limit } = parsePagination(req.query, { limit: 50 });
      const [pendingRequests, deniedRequests, approvedLinks, pendingCount, deniedCount, approvedCount] = await Promise.all([
        prisma.providerServiceRequest.findMany({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          ...SELECT_PROVIDER
        }),

        prisma.providerServiceRequest.findMany({
          where: { status: 'DENIED' },
          orderBy: { createdAt: 'desc' },
          ...SELECT_PROVIDER
        }),

        prisma.providerService.findMany({
          ...SELECT_PROVIDER,
          include: { ...SELECT_PROVIDER.include, service: true },
          orderBy: { createdAt: 'desc' }
        }),

        prisma.providerServiceRequest.count({ where: { status: 'PENDING' } }),
        prisma.providerServiceRequest.count({ where: { status: 'DENIED' } }),
        prisma.providerService.count()
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

      const total = pendingCount + deniedCount + approvedCount;
      const items = combined.slice((page - 1) * limit, page * limit);

      return sendApiSuccess(res, 200, { items, pagination: offsetMeta(total, page, limit) });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch provider service items', err.message);
    }
  }
};

