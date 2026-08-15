// Minimal in-memory TTL cache — the established project pattern for
// read-heavy, rarely-changing data (see adminConfigService 30s and
// providerLevelService 60s). Always pair with an invalidation hook on the
// write path so edits apply quickly instead of waiting for the TTL.

export function createTtlCache(ttlMs) {
  const store = new Map();

  return {
    get(key) {
      const entry = store.get(key);
      if (entry && Date.now() - entry.at < ttlMs) return entry.value;
      return undefined;
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
