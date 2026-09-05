/**
 * Tiny promise cache for progressive dashboard loading.
 *
 * The provider dashboard prefetches its "then" tier (Performance, approved
 * services) in the background a moment after first paint. When the
 * user opens one of those tabs the component's own fetch resolves from this
 * cache instantly instead of hitting the network again.
 *
 * - Requests are deduped by key: concurrent callers share one in-flight request.
 * - `force` bypasses the cache for mutations / realtime pushes.
 * - Failed requests are evicted so the next caller retries.
 */

const TTL_MS = 30_000;
const cache = new Map();

export function cachedRequest(key, fetchFn, { force = false } = {}) {
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.promise;

  const promise = Promise.resolve()
    .then(fetchFn)
    .then((value) => {
      cache.set(key, { at: Date.now(), promise });
      return value;
    })
    .catch((err) => {
      cache.delete(key);
      throw err;
    });

  cache.set(key, { at: Date.now(), promise });
  return promise;
}
