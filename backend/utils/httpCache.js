/**
 * HTTP caching for public, unauthenticated read endpoints (rule 14).
 *
 * The in-memory TTL cache is per-process, so on a cold or multi-instance
 * deployment every visitor still pays a full origin round trip. These headers
 * let the browser (and any CDN in front of the API) answer repeat catalog
 * requests without touching the origin at all.
 *
 * `stale-while-revalidate` is the important one: while a revalidation is in
 * flight the edge keeps serving the previous copy, so a slow or failing origin
 * never produces a blank page for a returning visitor.
 *
 * Only ever call this on routes that are public and identical for every user.
 * Anything derived from a JWT, a session or a rate-limit budget must stay
 * `private`.
 */
export function publicCache(res, { maxAge = 30, sMaxAge = 60, staleWhileRevalidate = 600 } = {}) {
  if (res.headersSent) return;
  res.set(
    'Cache-Control',
    `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
  res.set('Vary', 'Accept-Encoding');
}

/**
 * Mark a response as served from the last known good snapshot after a failed
 * refresh. RFC 9111 warning code 110 = "Response is stale". Surfaces the
 * degradation in browser devtools and in the request log without breaking any
 * client parsing the JSON body.
 */
export function markStaleResponse(res) {
  if (res.headersSent) return;
  res.set('Warning', '110 ServeGo "Response is stale"');
  res.set('X-ServeGo-Cache', 'STALE');
}

/** Mark a response that came straight from the in-process cache. */
export function markCacheHit(res, key) {
  if (res.headersSent) return;
  res.set('X-ServeGo-Cache', 'HIT');
  if (key) res.set('X-ServeGo-Cache-Key', key);
}
