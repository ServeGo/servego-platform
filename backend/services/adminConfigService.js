import prisma from '../prisma/client.js';

const CACHE_TTL_MS = 30 * 1000;
const cache = new Map();

function fromCache(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.value;
  return undefined;
}

/**
 * Read a single admin-configurable value. Falls back to `fallback` when the
 * key has not been configured yet. Values are cached briefly to keep the
 * hot paths (lead matching, completion) off the database. Callers already
 * inside an interactive transaction must pass `client` (the transaction) so
 * the read reuses the transaction's connection instead of competing for a
 * second one from the pool.
 */
export async function getConfig(key, fallback = null, client = prisma) {
  const cached = fromCache(key);
  if (cached !== undefined) return cached;

  const row = await client.adminConfig.findUnique({ where: { key } });
  const value = row ? row.value : fallback;
  cache.set(key, { value, at: Date.now() });
  return value;
}

/**
 * Read several keys at once.
 *
 * Keys already inside the TTL are answered from memory; only the misses reach the
 * database, and they do so in ONE `findMany` rather than one `findUnique` per key.
 * The rows are written back into the per-key cache, so a later single-key `getConfig`
 * for any of them is warm too.
 *
 * This is the read path behind `GET /feature-flags/public` — the most requested
 * endpoint on the site — which previously queried AdminConfig directly on every
 * single request instead of through here.
 */
export async function getConfigs(keys) {
  const wanted = Array.from(new Set(keys));
  const result = {};
  const missing = [];

  for (const key of wanted) {
    const cached = fromCache(key);
    if (cached !== undefined) {
      result[key] = cached;
    } else {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const rows = await prisma.adminConfig.findMany({ where: { key: { in: missing } } });
    const valueByKey = new Map(rows.map((row) => [row.key, row.value]));
    const at = Date.now();
    for (const key of missing) {
      const value = valueByKey.has(key) ? valueByKey.get(key) : null;
      cache.set(key, { value, at });
      result[key] = value;
    }
  }

  return result;
}

export async function getAllConfigs() {
  const rows = await prisma.adminConfig.findMany({ orderBy: { key: 'asc' } });
  const result = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}

export async function setConfig(key, value, updatedBy = null) {
  const row = await prisma.adminConfig.upsert({
    where: { key },
    update: { value, ...(updatedBy ? { updatedBy } : {}) },
    create: { key, value, description: key, ...(updatedBy ? { updatedBy } : {}) }
  });
  cache.set(key, { value, at: Date.now() });
  return row;
}

export function invalidateConfig(key) {
  cache.delete(key);
}
