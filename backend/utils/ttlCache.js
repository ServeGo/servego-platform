// Minimal in-memory TTL cache — the established project pattern for
// read-heavy, rarely-changing data (see adminConfigService 30s and
// providerLevelService 60s). Always pair with an invalidation hook on the
// write path so edits apply quickly instead of waiting for the TTL.

export function createTtlCache(ttlMs) {
  const store = new Map();

  const read = (key) => {
    const entry = store.get(key);
    if (!entry) return undefined;
    return { value: entry.value, age: Date.now() - entry.at, at: entry.at };
  };

  return {
    get(key) {
      const hit = read(key);
      if (hit && hit.age < ttlMs) return hit.value;
      return undefined;
    },
    // Age-tolerant read for the stale-while-error path (rule 14: prefer a
    // per-key staleness check over a raw TTL so a failed refresh never empties
    // a read-heavy screen).
    getStale(key) {
      const hit = read(key);
      return hit ? hit.value : undefined;
    },
    getMeta(key) {
      return read(key);
    },
    set(key, value) {
      store.set(key, { value, at: Date.now() });
    },
    invalidate(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

/**
 * Single-flight guard: concurrent callers asking for the same key share ONE
 * in-flight promise instead of each running the same cold query.
 *
 * Without this, the public catalog suffers a thundering herd on every cache
 * miss: N simultaneous visitors (or N duplicate requests from one page) all
 * miss the 30s TTL together and all run `findMany` + the provider-stats GROUP BY
 * at the same instant. Collapsing them turns a cold burst into one query.
 *
 * A rejected flight is evicted immediately so the next caller retries instead
 * of inheriting the failure.
 */
export function createSingleFlight() {
  const inflight = new Map();

  return {
    run(key, fn) {
      const existing = inflight.get(key);
      if (existing) return existing;

      const promise = Promise.resolve()
        .then(fn)
        .finally(() => {
          if (inflight.get(key) === promise) inflight.delete(key);
        });

      inflight.set(key, promise);
      return promise;
    },
    isBusy(key) {
      return inflight.has(key);
    }
  };
}
