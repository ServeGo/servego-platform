import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

const normalize = (s) => (s || '').toString().trim().toLowerCase();

export const ServiceController = {
  getCategoryBySlug: async (req, res) => {
    try {
      const slug = String(req.params.slug || '').trim();
      const normalized = slug.replace(/-/g, ' ').toLowerCase();
      const category = await prisma.service.findFirst({
        where: { isHidden: false, OR: [{ nameNormalized: normalized }, { name: { equals: slug.replace(/-/g, ' '), mode: 'insensitive' } }] }
      });
      if (!category) return sendApiError(res, 404, 'NOT_FOUND', 'Service category not found.');
      const location = String(req.query.zone || '').trim();
      const providers = await prisma.providerService.findMany({
        where: { serviceId: category.id, provider: { accountStatus: 'ACTIVE', isVerified: true, user: { status: 'ACTIVE' }, ...(location ? { serviceAreas: { array_contains: [location] } } : {}) } },
        include: { provider: { include: { user: { select: { id: true, name: true, avatar: true } }, badges: true } } },
        orderBy: { provider: String(req.query.sort) === 'experience' ? { experienceYears: 'desc' } : { rating: 'desc' } }
      });
      return sendApiSuccess(res, 200, { category, activeSpecialistCount: providers.length, providers: providers.map(({ provider, description }) => ({ ...provider, serviceDescription: description })) });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch service category', err.message);
    }
  },
  getActiveCount: async (req, res) => {
    try {
      const service = await prisma.service.findUnique({ where: { id: req.params.id }, select: { id: true } });
      if (!service) return sendApiError(res, 404, 'NOT_FOUND', 'Service category not found.');
      const activeSpecialistCount = await prisma.providerService.count({
        where: {
          serviceId: service.id,
          provider: { accountStatus: 'ACTIVE', isVerified: true, user: { status: 'ACTIVE' } }
        }
      });
      return sendApiSuccess(res, 200, { serviceId: service.id, activeSpecialistCount });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to count active specialists', err.message);
    }
  },

  getAll: async (req, res) => {
    try {
      // `/services` is the canonical public search endpoint.  Preserve the
      // legacy `/services/search` route, but never make the UI choose between
      // a static catalog and a separately-filtered catalog.
      if (String(req.query?.query || '').trim() || String(req.query?.location || '').trim() || String(req.query?.category || '').trim()) {
        return ServiceController.search(req, res);
      }
      const services = await prisma.service.findMany({ where: { isHidden: false } });

      // Derive active specialist count per service: providers with an approved
      // ProviderService link whose user account is ACTIVE and accountStatus is ACTIVE.
      const counts = await prisma.providerService.groupBy({
        by: ['serviceId'],
        _count: { providerId: true },
        where: {
          provider: {
            accountStatus: 'ACTIVE',
            isVerified: true,
            user: { status: 'ACTIVE' }
          }
        }
      });
      const countMap = Object.fromEntries(counts.map(c => [c.serviceId, c._count.providerId]));

      const result = services.map(s => ({ ...s, activeSpecialistCount: countMap[s.id] || 0 }));
      return sendApiSuccess(res, 200, result);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch services', err.message);
    }
  },

  search: async (req, res) => {
    try {
      const { query: q = '', location = '', category = '' } = req.query;
      const trimmed = String(q).trim();

      const where = { isHidden: false };
      if (trimmed) {
        where.OR = [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { description: { contains: trimmed, mode: 'insensitive' } }
        ];
      }
      if (String(category).trim()) {
        where.AND = [{
          OR: [
            { id: String(category).trim() },
            { name: { equals: String(category).trim(), mode: 'insensitive' } },
            { nameNormalized: String(category).trim().toLowerCase() }
          ]
        }];
      }

      const services = await prisma.service.findMany({ where });

      const counts = await prisma.providerService.groupBy({
        by: ['serviceId'],
        _count: { providerId: true },
        where: {
          provider: {
            accountStatus: 'ACTIVE',
            isVerified: true,
            user: { status: 'ACTIVE' },
            ...(location ? { serviceAreas: { array_contains: [location] } } : {})
          }
        }
      });
      const countMap = Object.fromEntries(counts.map(c => [c.serviceId, c._count.providerId]));

      const result = services.map(s => ({ ...s, activeSpecialistCount: countMap[s.id] || 0 }));
      return sendApiSuccess(res, 200, result);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to search services', err.message);
    }
  },

  create: async (req, res) => {
    try {
      const { name, description, popularIssues } = req.body;
      if (!name) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required field: name');
      }

      const nameNormalized = normalize(name);
      const existing = await prisma.service.findUnique({ where: { nameNormalized } });
      if (existing) {
        return sendApiError(res, 409, 'DUPLICATE_ENTRY', 'A service with this name already exists');
      }

      const created = await prisma.service.create({
        data: {
          name,
          nameNormalized,
          description: description || '',
          popularIssues: Array.isArray(popularIssues) ? popularIssues : []
        }
      });

      return sendApiSuccess(res, 201, created);
    } catch (err) {
      if (err.code === 'P2002') {
        return sendApiError(res, 409, 'DUPLICATE_ENTRY', 'A service with this name already exists');
      }
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to create service',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  },

  deleteOne: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing service id');

      const [service, activeProviders, bookings] = await Promise.all([
        prisma.service.findUnique({ where: { id }, select: { id: true } }),
        prisma.providerService.count({ where: { serviceId: id, provider: { accountStatus: 'ACTIVE' } } }),
        prisma.booking.count({ where: { serviceId: id, status: { in: ['PENDING', 'CONFIRMED', 'ONGOING'] } } })
      ]);
      if (!service) return sendApiError(res, 404, 'NOT_FOUND', 'Service not found');
      if (activeProviders || bookings) {
        return sendApiError(res, 409, 'CATEGORY_IN_USE', 'Reassign active providers and bookings before deleting this category.', { activeProviders, activeBookings: bookings });
      }
      if (String(req.query.confirm || req.body?.confirm) !== 'true') {
        return sendApiError(res, 400, 'CONFIRMATION_REQUIRED', 'Set confirm=true after verifying this category is safe to delete.');
      }
      await prisma.service.delete({ where: { id } });
      return sendApiSuccess(res, 200, { message: 'Service deleted successfully' });
    } catch (err) {
      if (err.code === 'P2002') {
        return sendApiError(res, 409, 'DUPLICATE_ENTRY', 'A service with this name already exists');
      }
      if (err.code === 'P2025') {
        return sendApiError(res, 404, 'NOT_FOUND', 'Service not found');
      }
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to delete service', err.message);
    }
  },

  updateOne: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing service id');

      const { name, description, popularIssues } = req.body || {};

      const existing = await prisma.service.findUnique({ where: { id }, select: { name: true, nameNormalized: true } });
      if (!existing) return sendApiError(res, 404, 'NOT_FOUND', 'Service not found');

      const nextName = name || existing.name;
      const updated = await prisma.service.update({
        where: { id },
        data: {
          name: nextName,
          nameNormalized: normalize(nextName),
          ...(description !== undefined ? { description } : {}),
          ...(Array.isArray(popularIssues) ? { popularIssues } : {})
        }
      });


      return sendApiSuccess(res, 200, { service: updated });
    } catch (err) {
      if (err.code === 'P2025') {
        return sendApiError(res, 404, 'NOT_FOUND', 'Service not found');
      }
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to update service', err.message);
    }
  },

  hideOne: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing service id');

      const { isHidden } = req.body || {};
      if (isHidden === undefined || isHidden === null) {
        return sendApiError(res, 400, 'INVALID_VALUE', 'isHidden must be true or false.');
      }
      const updated = await prisma.service.update({
        where: { id },
        data: {
          isHidden: isHidden === true || isHidden === 'true'
        }
      });

      return sendApiSuccess(res, 200, { service: updated });
    } catch (err) {
      if (err.code === 'P2025') {
        return sendApiError(res, 404, 'NOT_FOUND', 'Service not found');
      }
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to hide service', err.message);
    }
  }
};






