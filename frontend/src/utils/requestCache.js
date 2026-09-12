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
 *
 * Cache keys should be namespaced by resource so related rows can be dropped
 * together: `customer-addresses`, `provider-services:<id>`, `wallet-ledger`.
 * Any writes to a cached resource MUST call `invalidateCache(key)` so the next
 * faithful read refetches instead of serving a stale snapshot.
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

/**
 * Drop cached entries for a resource. Pass the full key to evict one entry
 * (`invalidateCache('customer-addresses')`) or the namespace to evict every
 * per-id variant (`invalidateCache('provider-services')`). Calling with no
 * argument clears the whole cache. Writes MUST call this before their
 * follow-up read so stale data is never shown (rule 14: invalidation hook on write).
 */
export function invalidateCache(key) {
  if (key == null) {
    cache.clear();
    return;
  }
  if (cache.has(key)) {
    cache.delete(key);
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(`${key}:`)) cache.delete(k);
  }
}
