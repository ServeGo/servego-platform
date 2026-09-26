import prisma from '../prisma/client.js';
import { Prisma } from '@prisma/client';
import { rankedServiceRows } from '../services/searchService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { parsePagination, offsetMeta } from '../utils/pagination.js';
import { nextBusinessNumber } from '../utils/businessNumber.js';
import {
  getCachedServiceStats,
  invalidateServiceListCaches,
  resolveAdminList,
  resolveCatalog,
  resolveCategoryPage,
  resolveSearchResults,
  resolveStats,
  resolveTopRated,
  setCachedServiceStats
} from '../services/serviceCacheService.js';
import { markCacheHit, markStaleResponse, publicCache } from '../utils/httpCache.js';

const normalize = (s) => (s || '').toString().trim().toLowerCase();

/**
 * Per-service provider stats: how many active/verified providers serve it and
 * their average rating. Filtered exactly like the catalog count (approved link
 * + ACTIVE + verified + ACTIVE user, optional location scope). The average
 * only covers providers that actually have a rating (> 0), so unrated partners
 * don't drag a service's score down.
 *
 * The whole aggregation runs in one SQL statement (rule 12) â€” the previous
 * version shipped every linked provider row to Node and summed it in JS, which
 * grows linearly with the catalog on every cache miss and every search.
 */
async function getServiceStats({ location = null } = {}) {
  if (!location) {
    const cached = getCachedServiceStats();
    if (cached !== undefined) return cached;
  }

  const rows = await prisma.$queryRaw`
    SELECT ps."serviceId" AS id,
           COUNT(*)::int AS count,
           COALESCE(SUM(CASE WHEN p.rating > 0 THEN p.rating END), 0)::float8 AS "ratingSum",
           COUNT(CASE WHEN p.rating > 0 THEN 1 END)::int AS "ratedCount"
    FROM "ProviderService" ps
    JOIN "Provider" p ON p.id = ps."providerId"
    JOIN "User" u ON u.id = p."userId"
    WHERE p."accountStatus" = 'ACTIVE'
      AND p."isVerified" = true
      AND u.status = 'ACTIVE'
      ${location ? Prisma.sql`AND p."serviceAreas" @> ${JSON.stringify([location])}::jsonb` : Prisma.empty}
    GROUP BY ps."serviceId"`;

  const map = {};
  for (const r of rows) {
    map[r.id] = { count: r.count, ratingSum: Number(r.ratingSum), ratedCount: r.ratedCount };
  }

  if (!location) setCachedServiceStats(map);
  return map;
}

/**
 * Global provider stats, single-flighted. `/services`, `/services/top-rated`,
 * `/admin/services` and the unfiltered `/services` all need the exact same map;
 * on a cold process they used to fire the identical GROUP BY once per endpoint.
 * A failed aggregation falls back to the last known good map so the catalog
 * still renders its counts instead of zeroing every service out.
 */
function getSharedServiceStats() {
  return resolveStats(() => getServiceStats()).then((r) => r.value);
}

/** Merge a service row with its provider stats â€” shared by every catalog read. */
function withStats(services, statsMap) {
  return services.map((s) => {
    const st = statsMap[s.id];
    const { score: _score, ...svc } = s;
    return {
      ...svc,
      activeSpecialistCount: st?.count || 0,
      avgRating: st?.ratedCount ? Number((st.ratingSum / st.ratedCount).toFixed(1)) : 0
    };
  });
}

/**
 * Send a public catalog payload with the right cache + provenance headers.
 * `source` comes from the resolver: 'hit' (in-process TTL), 'miss' (computed),
 * 'stale' (refresh failed, last known good served).
 */
function sendCatalog(res, source, cacheKey, payload) {
  publicCache(res);
  if (source === 'stale') markStaleResponse(res);
  else markCacheHit(res, source === 'hit' ? cacheKey : undefined);
  return sendApiSuccess(res, 200, payload);
}

// --- Loaders ---------------------------------------------------------------
// The DB work for each public catalog read lives in a named loader so the
// controller and the boot-time warm-up run the exact same code path.

/** `GET /services` â€” the full public catalog with counts and ratings. */
async function loadCatalog() {
  // Catalog rows and the provider-stats aggregation are independent reads â€” run
  // them concurrently instead of paying two sequential round trips on every
  // cold cache miss (rule 12).
  const [services, statsMap] = await Promise.all([
    prisma.service.findMany({ where: { isHidden: false } }),
    getSharedServiceStats()
  ]);
  return withStats(services, statsMap);
}

/** `GET /admin/services` â€” same shape, but includes hidden categories. */
async function loadAdminServiceList() {
  const [rows, statsMap] = await Promise.all([
    prisma.service.findMany({ orderBy: { createdAt: 'desc' } }),
    getSharedServiceStats()
  ]);
  return withStats(rows, statsMap);
}

/** `GET /services/top-rated` â€” the hero/quick-search chips. */
async function loadTopRated(limit) {
  // Same rows + same stats map as the catalog; both single-flighted.
  const [services, statsMap] = await Promise.all([
    prisma.service.findMany({ where: { isHidden: false } }),
    getSharedServiceStats()
  ]);

  return services
    .map((s) => {
      const st = statsMap[s.id];
      return {
        id: s.id,
        name: s.name,
        popularIssues: Array.isArray(s.popularIssues) ? s.popularIssues : [],
        avgRating: st?.ratedCount ? Number((st.ratingSum / st.ratedCount).toFixed(1)) : 0,
        activeSpecialistCount: st?.count || 0,
      };
    })
    .sort((a, b) => b.avgRating - a.avgRating || b.activeSpecialistCount - a.activeSpecialistCount)
    .slice(0, limit);
}

/** `GET /services/search` â€” ranked catalog, optionally scoped by category/zone. */
async function loadSearchResults({ query, location, category }) {
  const trimmed = String(query || '').trim();
  const locationTrimmed = String(location || '').trim();
  const categoryId = String(category || '').trim();

  // Ranked, typo-tolerant id order from pg_trgm (see services/searchService.js).
  // Kept null when there is no query so the catalog falls back to popularity.
  let order = [];
  let serviceIds = null;
  let rankedRows = null;
  if (trimmed) {
    // Fused rank + fetch (+ category filter) in one SQL statement (rule 12).
    rankedRows = await rankedServiceRows(trimmed, { limit: 100, categoryId: categoryId || null });
    order = rankedRows.map((r) => r.id);
    serviceIds = order;
  }

  const where = { isHidden: false };
  if (serviceIds !== null) {
    where.id = { in: serviceIds };
  }
  if (categoryId && !trimmed) {
    where.AND = [{
      OR: [
        { id: categoryId },
        { name: { equals: categoryId, mode: 'insensitive' } },
        { nameNormalized: categoryId.toLowerCase() }
      ]
    }];
  }

  // The unfiltered search reads exactly the same rows as `GET /services` and
  // the exact same stats map, so it reuses the shared single-flight stats
  // instead of running its own aggregation.
  const [services, statsMap] = await Promise.all([
    rankedRows || prisma.service.findMany({ where }),
    locationTrimmed ? getServiceStats({ location: locationTrimmed }) : getSharedServiceStats()
  ]);

  // Lower score = higher search rank; popularity (active specialist count)
  // breaks ties, then alphabetical.
  const scoreMap = Object.fromEntries(order.map((id, i) => [id, order.length - i]));
  return withStats(services, statsMap).sort((a, b) => {
    if (order.length) {
      const diff = (scoreMap[b.id] || 0) - (scoreMap[a.id] || 0);
      if (diff !== 0) return diff;
    }
    if (b.activeSpecialistCount !== a.activeSpecialistCount) {
      return b.activeSpecialistCount - a.activeSpecialistCount;
    }
    return String(a.name).localeCompare(String(b.name));
  });
}

/** `GET /categories/:slug` â€” one category plus its paginated provider list. */
async function loadCategoryPage({ slug, location, sort, page, limit }) {
  const normalized = String(slug || '').trim().replace(/-/g, ' ').toLowerCase();
  const zone = String(location || '').trim();
  const { skip, take } = { skip: (page - 1) * limit, take: limit };

  const category = await prisma.service.findFirst({
    where: { isHidden: false, OR: [{ nameNormalized: normalized }, { name: { equals: slug.replace(/-/g, ' '), mode: 'insensitive' } }] }
  });
  if (!category) return null;

  const where = { serviceId: category.id, provider: { accountStatus: 'ACTIVE', isVerified: true, user: { status: 'ACTIVE' }, ...(zone ? { serviceAreas: { array_contains: [zone] } } : {}) } };
  const [providerLinks, activeSpecialistCount] = await Promise.all([
    prisma.providerService.findMany({
      where,
      include: { provider: { include: { user: { select: { id: true, name: true, avatar: true } }, badges: true } } },
      orderBy: { provider: sort === 'experience' ? { experienceYears: 'desc' } : { rating: 'desc' } },
      skip,
      take
    }),
    // Global (non-location) page: the count is exactly the cached provider
    // stats aggregation for this service â€” one less round-trip per view.
    zone ? prisma.providerService.count({ where }) : getSharedServiceStats().then((m) => m[category.id]?.count || 0)
  ]);

  const providers = providerLinks.map(({ provider, description }) => ({ ...provider, serviceDescription: description }));
  return { category, activeSpecialistCount, providers, pagination: offsetMeta(activeSpecialistCount, page, limit) };
}

export const ServiceController = {
  getCategoryBySlug: async (req, res) => {
    try {
      const { page, limit } = parsePagination(req.query, { limit: 20 });
      const params = {
        slug: String(req.params.slug || '').trim(),
        location: String(req.query.zone || '').trim(),
        sort: String(req.query.sort) === 'experience' ? 'experience' : 'rating',
        page,
        limit
      };

      // The whole category payload is a pure function of (slug, zone, sort,
      // cursor) and identical for every visitor, so cache the finished object
      // rather than only the underlying queries.
      const cacheKey = JSON.stringify([params.slug, params.location, params.sort, params.page, params.limit]);

      const { value: payload, source } = await resolveCategoryPage(cacheKey, () => loadCategoryPage(params));

      if (!payload) return sendApiError(res, 404, 'NOT_FOUND', 'Service category not found.');
      return sendCatalog(res, source, 'category', payload);
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

      const { value: result, source } = await resolveCatalog(loadCatalog);

      return sendCatalog(res, source, 'catalog', result);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch services', err.message);
    }
  },

  // Admin-only listing: includes hidden services so the ops console can manage
  // and un-hide them. Cached briefly and invalidated on every service write.
  adminList: async (req, res) => {
    try {
      const { value: result, source } = await resolveAdminList(loadAdminServiceList);

      // Private: the admin list includes hidden categories and is role-gated.
      res.set('Cache-Control', 'private, no-store');
      if (source === 'stale') markStaleResponse(res);
      return sendApiSuccess(res, 200, result);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch services', err.message);
    }
  },

  search: async (req, res) => {
    try {
      const { query: q = '', location = '', category = '' } = req.query;
      const trimmed = String(q).trim();
      const locationTrimmed = String(location).trim();
      const categoryId = String(category).trim();

      // The client fires the same search repeatedly (category tabs, filter
      // chips, page revisits). Cache the serialized result for 30s under the
      // exact (query, location, category) triple; every catalog/provider write
      // already clears it via invalidateServiceListCaches/Caches.
      const cacheKey = JSON.stringify([trimmed, locationTrimmed, categoryId]);

      const { value: result, source } = await resolveSearchResults(cacheKey, () => loadSearchResults({
        query: trimmed,
        location: locationTrimmed,
        category: categoryId
      }));

      return sendCatalog(res, source, 'search', result);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to search services', err.message);
    }
  },

  create: async (req, res) => {
    try {
      const { name, description, popularIssues, image } = req.body;
      if (!name) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'Missing required field: name');
      }
      if (!image || !String(image).trim()) {
        return sendApiError(res, 400, 'IMAGE_REQUIRED', 'A service photo is required to create a service.');
      }

      const nameNormalized = normalize(name);
      const existing = await prisma.service.findUnique({ where: { nameNormalized } });
      if (existing) {
        return sendApiError(res, 409, 'DUPLICATE_ENTRY', 'A service with this name already exists');
      }

      const created = await prisma.$transaction(async (tx) => {
        const serviceNumber = await nextBusinessNumber('SERVICE', tx);
        return tx.service.create({
          data: {
            serviceNumber,
            name,
            nameNormalized,
            description: description || '',
            popularIssues: Array.isArray(popularIssues) ? popularIssues : [],
            image: String(image).trim()
          }
        });
      });

      invalidateServiceListCaches();

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

      const [service, liveBookings] = await Promise.all([
        prisma.service.findUnique({ where: { id }, select: { id: true } }),
        prisma.booking.count({ where: { serviceId: id, status: { in: ['PENDING', 'CONFIRMED', 'ONGOING'] } } })
      ]);
      if (!service) return sendApiError(res, 404, 'NOT_FOUND', 'Service not found');
      if (liveBookings) {
        return sendApiError(res, 409, 'CATEGORY_IN_USE', 'This category has live bookings â€” complete or cancel them before deleting.', { activeBookings: liveBookings });
      }
      if (String(req.query.confirm || req.body?.confirm) !== 'true') {
        return sendApiError(res, 400, 'CONFIRMATION_REQUIRED', 'Set confirm=true after verifying this category is safe to delete.');
      }

      // ProviderService links are ON DELETE RESTRICT â€” clean them in the same
      // transaction so the category can actually be removed. This is the admin's
      // explicit, double-confirmed intent to delete the category wholesale.
      const { removedProviderLinks } = await prisma.$transaction(async (tx) => {
        const del = await tx.providerService.deleteMany({ where: { serviceId: id } });
        await tx.service.delete({ where: { id } });
        return { removedProviderLinks: del.count };
      });

      invalidateServiceListCaches();
      return sendApiSuccess(res, 200, { message: 'Service deleted successfully', removedProviderLinks });
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

      const { name, description, popularIssues, image } = req.body || {};

      const existing = await prisma.service.findUnique({ where: { id }, select: { name: true, nameNormalized: true } });
      if (!existing) return sendApiError(res, 404, 'NOT_FOUND', 'Service not found');

      const nextName = name || existing.name;
      const updated = await prisma.service.update({
        where: { id },
        data: {
          name: nextName,
          nameNormalized: normalize(nextName),
          ...(description !== undefined ? { description } : {}),
          ...(Array.isArray(popularIssues) ? { popularIssues } : {}),
          ...(image !== undefined ? { image: String(image).trim() || null } : {})
        }
      });

      invalidateServiceListCaches();

      return sendApiSuccess(res, 200, { service: updated });
    } catch (err) {
      if (err.code === 'P2002') {
        return sendApiError(res, 409, 'DUPLICATE_ENTRY', 'A service with this name already exists');
      }
      if (err.code === 'P2025') {
        return sendApiError(res, 404, 'NOT_FOUND', 'Service not found');
      }
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to update service', err.message);
    }
  },

  getTopRated: async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 10);
      const cacheKey = `top:${limit}`;

      const { value: ranked, source } = await resolveTopRated(cacheKey, () => loadTopRated(limit));

      return sendCatalog(res, source, 'top-rated', ranked);
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch top-rated services', err.message);
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

      invalidateServiceListCaches();

      return sendApiSuccess(res, 200, { service: updated });
    } catch (err) {
      if (err.code === 'P2025') {
        return sendApiError(res, 404, 'NOT_FOUND', 'Service not found');
      }
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to hide service', err.message);
    }
  }
};

/**
 * Precompute the public catalog and the top-rated chips while the process is
 * still booting, so the first visitor after a deploy never pays for the cold
 * `findMany` + provider-stats GROUP BY.
 *
 * Deliberately fire-and-forget: a failed warm-up is harmless (the resolvers
 * still single-flight and fall back to a stale snapshot), so a slow or
 * unreachable database must never delay `listen()` or the queue workers.
 */
export function warmServiceCaches() {
  const jobs = [
    ['catalog', () => resolveCatalog(loadCatalog)],
    ['top-rated', () => resolveTopRated('top:5', () => loadTopRated(5))]
  ];

  for (const [label, run] of jobs) {
    void run()
      .then(({ source }) => console.log(`ðŸ—‚ï¸  Service cache warm: ${label} ready (${source})`))
      .catch((err) => console.warn(`âš ï¸  Service cache warm skipped (${label}): ${err.message}`));
  }
}
