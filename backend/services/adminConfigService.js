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

export async function getConfigs(keys) {
  const result = {};
  await Promise.all(
    keys.map(async (key) => {
      result[key] = await getConfig(key, null);
    })
  );
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
