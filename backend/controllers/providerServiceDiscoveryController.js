import prisma from '../prisma/client.js';
import { resolveServiceForQuery } from '../services/searchService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { badgeItem } from '../utils/serializers.js';

/**
 * Providers approved for a given service.
 *
 * `adminView: false` is the PUBLIC discovery shape: only active, verified
 * providers and no account-status fields (customer-facing).
 *
 * `adminView: true` is the ADMIN shape used by the manual-booking queue: it
 * returns EVERY provider who has the service approved — including suspended or
 * unverified ones — because the admin needs to know who can service the request
 * and why each provider is (in)eligible. It exposes `eligible` plus the raw
 * account flags so the UI can label each provider; assignment itself is an
 * unconditional admin override and is not gated by these flags.
 */
async function discoverByServiceName(req, res, { adminView }) {
  try {
    const rawServiceName = req.query?.serviceName;
    if (!rawServiceName || !String(rawServiceName).trim()) {
      return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required query: serviceName');
    }

    const serviceName = String(rawServiceName).trim();
    const location = String(req.query?.location || '').trim();
    const sort = String(req.query?.sort || 'rating').trim();

    // Resolve the customer's free-text need to the single closest canonical
    // Service (exact > prefix > typo-tolerant trigram). Garbage queries that
    // clear no threshold 404 instead of silently redirecting to a lookalike.
    //
    // Admin view resolves the EXACT booked service first and ignores
    // `isHidden`, so a request whose service was later hidden still shows the
    // providers approved for that precise service rather than a fuzzy
    // lookalike (or nothing).
    const resolved = adminView
      ? await resolveExactService(serviceName)
      : await resolveServiceForQuery(serviceName);
    if (!resolved) {
      return sendApiError(res, 404, 'SERVICE_NOT_FOUND', 'No matching service found for the requested name.');
    }

    const orderBy = sort === 'experience'
      ? { experienceYears: 'desc' }
      : sort === 'priceAsc' || sort === 'priceDesc'
        // A provider rate is not modelled yet, so keep the API ordering stable
        // until Part 3 introduces the payment/rate source of truth.
        ? { rating: 'desc' }
        : { rating: 'desc' };

    const providerServices = await prisma.providerService.findMany({
      where: {
        serviceId: resolved.id,
        provider: adminView
          // Admin: every provider approved for the service, regardless of
          // account status — the point is to SEE who offers it.
          ? {}
          // Public discovery: only providers who can actually take work now.
          : {
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
              // Public endpoint: no contact fields. The serializer only
              // reads name/avatar (photo lives on the provider row).
              select: {
                id: true,
                name: true,
                avatar: true,
                ...(adminView ? { status: true } : {})
              }
            },
            // The response maps badges through `badgeItem`, which only
            // renders badgeType + awardedAt — don't pull full badge rows.
            badges: { select: { badgeType: true, awardedAt: true } }
          }
        }
      }
    });

    const unique = new Map();
    for (const link of providerServices) {
      const p = link.provider;
      if (!p) continue;
      if (!unique.has(p.id)) unique.set(p.id, { provider: p, link });
    }

    const rows = Array.from(unique.values()).map(({ provider: p, link }) => {
      const base = {
        id: p.id,
        userId: p.userId,
        name: p.user?.name || 'Unknown',
        avatar: p.photo || p.user?.avatar || null,
        category: linkSafeCategory(p, resolved.name),
        rating: p.rating,
        reviewCount: p.reviewCount,
        experienceYears: p.experienceYears,

        serviceDescription: link.description || p.bio,
        specialties: Array.isArray(p.specialties) ? p.specialties : [],
        serviceAreas: Array.isArray(p.serviceAreas) ? p.serviceAreas : [],
        isVerified: p.isVerified,
        verificationLevel: p.verificationLevel,
        badges: Array.isArray(p.badges) ? p.badges.map(badgeItem) : []
      };
      if (!adminView) return base;
      const eligible = p.isVerified === true && p.accountStatus === 'ACTIVE' && p.user?.status === 'ACTIVE';
      return {
        ...base,
        accountStatus: p.accountStatus,
        userStatus: p.user?.status || null,
        eligible,
        statusLabel: eligibilityLabel({ isVerified: p.isVerified, accountStatus: p.accountStatus, userStatus: p.user?.status })
      };
    });

    // Admin list: eligible providers first, then by rating, so the most likely
    // choices surface at the top — every row stays assignable.
    if (adminView) {
      rows.sort((a, b) => (
        Number(b.eligible) - Number(a.eligible) ||
        (Number(b.rating) || 0) - (Number(a.rating) || 0) ||
        String(a.name).localeCompare(String(b.name))
      ));
    }

    return sendApiSuccess(res, 200, rows);
  } catch (err) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to discover approved providers', err.message);
  }
}

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

  getApprovedProvidersByServiceName: (req, res) =>
    discoverByServiceName(req, res, { adminView: false }),

  // Admin manual-booking queue: every provider approved for the service,
  // eligible or not, with account status flags for the UI to label.
  getAdminApprovedProvidersByServiceName: (req, res) =>
    discoverByServiceName(req, res, { adminView: true })
};

/**
 * Admin resolution: exact canonical match only, and it does NOT filter out
 * `isHidden` services — a request already in the queue must keep showing the
 * providers approved for the service that was actually booked. Falls back to
 * the fuzzy resolver only when there is no exact name match.
 */
async function resolveExactService(serviceName) {
  const exact = await prisma.service.findFirst({
    where: { nameNormalized: serviceName.trim().toLowerCase() },
    select: { id: true, name: true }
  });
  if (exact) return exact;
  return resolveServiceForQuery(serviceName);
}

function eligibilityLabel({ isVerified, accountStatus, userStatus }) {
  if (isVerified !== true) return 'Not verified';
  if (accountStatus && accountStatus !== 'ACTIVE') return `Account ${String(accountStatus).toLowerCase()}`;
  if (userStatus && userStatus !== 'ACTIVE') return `User ${String(userStatus).toLowerCase()}`;
  return 'Eligible';
}

function linkSafeCategory(_provider, requestedServiceName) {
  return requestedServiceName;
}
