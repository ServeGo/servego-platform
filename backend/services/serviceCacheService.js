import { createTtlCache } from '../utils/ttlCache.js';

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

const CATALOG_KEY = 'catalog';
const STATS_KEY = 'global';
const ADMIN_LIST_KEY = 'admin-list';

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

// Service create/update/hide/delete: the catalog and admin list change, but
// provider stats do not.
export function invalidateServiceListCaches() {
  catalogCache.invalidate(CATALOG_KEY);
  adminListCache.invalidate(ADMIN_LIST_KEY);
  searchCache.clear();
  topRatedCache.clear();
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
}