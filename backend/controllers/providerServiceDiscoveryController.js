import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

export const ProviderServiceDiscoveryController = {
  getApprovedProvidersByCategory: async (req, res) => {
    const slugName = String(req.params.slug || '').replace(/-/g, ' ').trim();
    const normalized = slugName.toLowerCase();
    const service = await prisma.service.findFirst({
      where: {
        isHidden: false,
        OR: [
          { nameNormalized: normalized },
          { name: { equals: slugName, mode: 'insensitive' } }
        ]
      },
      select: { name: true }
    });
    if (!service) return sendApiError(res, 404, 'NOT_FOUND', 'Service category not found.');
    const mergedQuery = { ...req.query, serviceName: service.name, location: req.query.zone || req.query.location || '' };
    return ProviderServiceDiscoveryController.getApprovedProvidersByServiceName({ ...req, query: mergedQuery }, res);
  },

  getApprovedProvidersByServiceName: async (req, res) => {
    try {
      const rawServiceName = req.query?.serviceName;
      if (!rawServiceName || !String(rawServiceName).trim()) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required query: serviceName');
      }

      const serviceName = String(rawServiceName).trim();
      const location = String(req.query?.location || '').trim();
      const sort = String(req.query?.sort || 'rating').trim();

      const orderBy = sort === 'experience'
        ? { experienceYears: 'desc' }
        : sort === 'priceAsc' || sort === 'priceDesc'
          // A provider rate is not modelled yet, so keep the API ordering stable
          // until Part 3 introduces the payment/rate source of truth.
          ? { rating: 'desc' }
          : { rating: 'desc' };

      const providerServices = await prisma.providerService.findMany({
        where: {
          service: {
            name: { equals: serviceName, mode: 'insensitive' }
          },
          provider: {
            accountStatus: 'ACTIVE',
            isVerified: true,
            user: { status: 'ACTIVE' },
            ...(location ? { serviceAreas: { array_contains: [location] } } : {})
          }
        },
        orderBy: { provider: orderBy },
        include: {
          provider: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  avatar: true
                }
              },
              reviews: true,
              badges: true
            }
          },
          service: true
        }
      });

      const unique = new Map();
      for (const link of providerServices) {
        const p = link.provider;
        if (!p) continue;
        if (!unique.has(p.id)) unique.set(p.id, { provider: p, link });
      }

      const formatted = Array.from(unique.values()).map(({ provider: p, link }) => ({
        id: p.id,
        userId: p.userId,
        name: p.user?.name || 'Unknown',
        avatar: p.photo || p.user?.avatar || null,
        category: linkSafeCategory(p, serviceName),
        rating: p.rating,
        reviewCount: p.reviewCount,
        experienceYears: p.experienceYears,

        serviceDescription: link.description || p.bio,
        specialties: Array.isArray(p.specialties) ? p.specialties : [],
        serviceAreas: Array.isArray(p.serviceAreas) ? p.serviceAreas : [],
        isVerified: p.isVerified,
        verificationLevel: p.verificationLevel,
        badges: p.badges || [],
        reviews: p.reviews || []
      }));

      return sendApiSuccess(res, 200, formatted);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to discover approved providers', err.message);
    }
  }
};

function linkSafeCategory(_provider, requestedServiceName) {
  return requestedServiceName;
}

