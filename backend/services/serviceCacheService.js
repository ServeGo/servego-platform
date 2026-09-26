import { createSingleFlight, createTtlCache } from '../utils/ttlCache.js';

// The services catalog, its per-service provider stats and the admin list are
// read-heavy and change only through a handful of admin writes. Each is cached
// briefly (rule 14): short TTL plus invalidation hooks on every write that can
// change it.
const TTL_MS = 30 * 1000;
const catalogCache = createTtlCache(TTL_MS);
const statsCache = createTtlCache(TTL_MS);
const adminListCache = createTtlCache(TTL_MS);
const searchCache = createTtlCache(TTL_MS);
const topRatedCache = createTtlCache(TTL_MS);
const categoryCache = createTtlCache(TTL_MS);

// One in-flight guard per cache family. A cold catalog must cost exactly one
// `findMany` + one stats GROUP BY no matter how many visitors (or duplicate
// requests from a single page) arrive in the same second — without this the
// public catalog suffers a thundering herd on every 30s cache miss.
const flightCatalog = createSingleFlight();
const flightStats = createSingleFlight();
const flightAdminList = createSingleFlight();
const flightSearch = createSingleFlight();
const flightTopRated = createSingleFlight();
const flightCategory = createSingleFlight();

const CATALOG_KEY = 'catalog';
const STATS_KEY = 'global';
const ADMIN_LIST_KEY = 'admin-list';

// --- Stale-while-error resolver -------------------------------------------
//
// Every public catalog read follows the same three steps:
//   1. fresh TTL hit  -> return it (`source: 'hit'`)
//   2. miss            -> one shared flight computes it, every caller awaits it
//   3. refresh failed  -> serve the last known good value (even if past its TTL)
//                          with `source: 'stale'` so the controller can send a
//                          `Warning: 110` header instead of an empty grid or 500
//
// Step 3 is what stops a transient database blip from turning the home page
// into "No services available yet" until the visitor hard-refreshes.
function resolver({ flight, key, fresh, stale, store }) {
  return async (load) => {
    const hit = fresh();
    if (hit !== undefined) return { value: hit, source: 'hit' };

    try {
      const computed = await flight.run(key, async () => {
        // Re-check inside the flight: a request that queued behind a refresh
        // should take the value that flight just computed, not run a second one.
        const settled = fresh();
        if (settled !== undefined) return { value: settled, source: 'hit' };
        const value = await load();
        store(value);
        return { value, source: 'miss' };
      });
      return computed;
    } catch (err) {
      const lastKnownGood = stale();
      if (lastKnownGood !== undefined) return { value: lastKnownGood, source: 'stale' };
      throw err;
    }
  };
}

const resolveCatalog = resolver({
  flight: flightCatalog,
  key: CATALOG_KEY,
  fresh: () => catalogCache.get(CATALOG_KEY),
  stale: () => catalogCache.getStale(CATALOG_KEY),
  store: (value) => catalogCache.set(CATALOG_KEY, value)
});

const resolveAdminList = resolver({
  flight: flightAdminList,
  key: ADMIN_LIST_KEY,
  fresh: () => adminListCache.get(ADMIN_LIST_KEY),
  stale: () => adminListCache.getStale(ADMIN_LIST_KEY),
  store: (value) => adminListCache.set(ADMIN_LIST_KEY, value)
});

/**
 * Collapse concurrent global provider-stats aggregations into one query. The
 * catalog, the top-rated chips, the admin list and the unfiltered search all
 * need the exact same map, so on a cold process they used to run the same GROUP
 * BY several times over.
 */
const resolveStats = resolver({
  flight: flightStats,
  key: STATS_KEY,
  fresh: () => statsCache.get(STATS_KEY),
  stale: () => statsCache.getStale(STATS_KEY),
  store: (value) => statsCache.set(STATS_KEY, value)
});

export { resolveAdminList, resolveCatalog, resolveStats };

export function getCachedCatalog() {
  return catalogCache.get(CATALOG_KEY);
}

export function setCachedCatalog(value) {
  catalogCache.set(CATALOG_KEY, value);
}

export function getCachedServiceStats(key = STATS_KEY) {
  return statsCache.get(key);
}

export function setCachedServiceStats(value, key = STATS_KEY) {
  statsCache.set(key, value);
}

export function getCachedAdminServiceList() {
  return adminListCache.get(ADMIN_LIST_KEY);
}

export function setCachedAdminServiceList(value) {
  adminListCache.set(ADMIN_LIST_KEY, value);
}

// Search results (`/services/search`) embed the same catalog + provider stats
// as the catalog, so they live under the same invalidation hooks. Keyed by the
// normalized (query, location, category) triple the client actually sent.
export function getCachedSearchResults(key) {
  return searchCache.get(key);
}

export function setCachedSearchResults(key, value) {
  searchCache.set(key, value);
}

// Top-rated list is derived purely from the catalog + stats; same hooks.
export function getCachedTopRated(key) {
  return topRatedCache.get(key);
}

export function setCachedTopRated(key, value) {
  topRatedCache.set(key, value);
}

// Category page (`/categories/:slug`) — keyed by slug + zone + page cursor.
export function getCachedCategory(key) {
  return categoryCache.get(key);
}

export function setCachedCategory(key, value) {
  categoryCache.set(key, value);
}

export function resolveSearchResults(cacheKey, load) {
  return resolver({
    flight: flightSearch,
    key: cacheKey,
    fresh: () => searchCache.get(cacheKey),
    stale: () => searchCache.getStale(cacheKey),
    store: (v) => searchCache.set(cacheKey, v)
  })(load);
}

export function resolveTopRated(cacheKey, load) {
  return resolver({
    flight: flightTopRated,
    key: cacheKey,
    fresh: () => topRatedCache.get(cacheKey),
    stale: () => topRatedCache.getStale(cacheKey),
    store: (v) => topRatedCache.set(cacheKey, v)
  })(load);
}

export function resolveCategoryPage(cacheKey, load) {
  return resolver({
    flight: flightCategory,
    key: cacheKey,
    fresh: () => categoryCache.get(cacheKey),
    stale: () => categoryCache.getStale(cacheKey),
    store: (v) => categoryCache.set(cacheKey, v)
  })(load);
}

// Service create/update/hide/delete: the catalog and admin list change, but
// provider stats do not.
export function invalidateServiceListCaches() {
  catalogCache.invalidate(CATALOG_KEY);
  adminListCache.invalidate(ADMIN_LIST_KEY);
  searchCache.clear();
  topRatedCache.clear();
  categoryCache.clear();
}

// Anything that touches provider stats (approval, verification, rating,
// account status) also invalidates the catalog + admin list, which embed the
// counts and averages.
export function invalidateServiceStatsCaches() {
  statsCache.clear();
  catalogCache.invalidate(CATALOG_KEY);
  adminListCache.invalidate(ADMIN_LIST_KEY);
  searchCache.clear();
  topRatedCache.clear();
  categoryCache.clear();
}
