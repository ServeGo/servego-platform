import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { parsePagination, offsetMeta } from '../utils/pagination.js';

export const SavedProController = {
  getMine: async (req, res) => {
    try {
      const customerId = req.user.id;
      const { skip, take, page, limit } = parsePagination(req.query, { limit: 20 });
      const where = { customerId };
      const [saved, total] = await Promise.all([
        prisma.savedPro.findMany({
          where,
          include: {
            provider: {
              include: {
                user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
                badges: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.savedPro.count({ where })
      ]);
      return sendApiSuccess(res, 200, { savedPros: saved, pagination: offsetMeta(total, page, limit) });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch saved pros', err.message);
    }
  },

  save: async (req, res) => {
    try {
      const customerId = req.user.id;
      const { providerId } = req.body;
      if (!providerId) return sendApiError(res, 400, 'MISSING_FIELDS', 'providerId is required.');

      const provider = await prisma.provider.findFirst({
        where: { id: providerId, accountStatus: 'ACTIVE', isVerified: true, user: { status: 'ACTIVE' } },
        select: { id: true }
      });
      if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Provider not found.');

      const saved = await prisma.savedPro.upsert({
        where: { customerId_providerId: { customerId, providerId } },
        update: {},
        create: { customerId, providerId }
      });
      return sendApiSuccess(res, 201, saved);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to save provider', err.message);
    }
  },

  unsave: async (req, res) => {
    try {
      const customerId = req.user.id;
      const { providerId } = req.params;
      await prisma.savedPro.deleteMany({ where: { customerId, providerId } });
      return sendApiSuccess(res, 200, { message: 'Provider removed from saved list.' });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to unsave provider', err.message);
    }
  }
};
