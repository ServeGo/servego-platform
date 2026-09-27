/**
 * The hero's "Popular:" chips, derived from the catalog the app already has.
 *
 * These used to come from `GET /services/top-rated?limit=5`, a SECOND request fired
 * from the home page's own `useEffect`. Because that effect only runs once the lazy
 * Home chunk has loaded and committed, the chips were always at least one full round
 * trip behind the hero paint — and often behind the category grid too, which reads as
 * "the page is still loading" for a chip row that is not actually loading.
 *
 * The endpoint was pure overhead: `loadTopRated` in the backend (serviceController.js)
 * reads the exact same `service.findMany({ where: { isHidden: false } })` rows and the
 * exact same shared provider-stats map as `GET /services`, then sorts and slices them.
 * `GET /services` already returns `avgRating` and `activeSpecialistCount` per row, so
 * the same five chips can be produced client-side with zero extra network.
 *
 * If the backend's ranking ever changes, this sort must change with it. The chips are
 * a convenience, not a ranking anyone depends on, so a drift shows as a different
 * order — never as broken or missing chips.
 */

/**
 * Reproduce the backend's top-rated ranking over an already-fetched catalog.
 *
 * Mirrors `loadTopRated`: highest `avgRating` first, ties broken by the number of
 * active specialists. Falls back to 0 for a service with no reviews yet (the API sends
 * `avgRating: 0` in that case, which sorts last).
 *
 * @param {Array<object>} services catalog rows from `GET /services`
 * @param {number} limit
 * @returns {Array<object>} the rows to render, in chip order
 */
export function topRatedFromCatalog(services, limit = 5) {
  if (!Array.isArray(services)) return [];

  return services
    .filter((s) => s && typeof s.name === 'string' && s.name.trim())
    .map((s) => ({
      id: s.id,
      name: s.name,
      avgRating: Number(s.avgRating) || 0,
      activeSpecialistCount:
        typeof s.activeSpecialistCount === 'number' ? s.activeSpecialistCount : 0
    }))
    .sort((a, b) => b.avgRating - a.avgRating || b.activeSpecialistCount - a.activeSpecialistCount)
    .slice(0, limit);
}
