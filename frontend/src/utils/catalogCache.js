/**
 * Session-backed stale-while-revalidate store for the public service catalog.
 *
 * The catalog is the single most requested resource on the site and it changes
 * only when an admin edits a category. That makes it the textbook case for the
 * project's caching rules: cache the DB result, keep a short freshness window,
 * and never block the first paint on the network.
 *
 * Three layers, fastest wins:
 *
 *   1. `sessionStorage` snapshot (survives a reload) — the home page paints real
 *      service cards on the very first frame after F5, before any fetch starts.
 *   2. In-memory value for the lifetime of the tab.
 *   3. The network, run in the background purely to refresh 1 and 2.
 *
 * A failed refresh NEVER clears a good snapshot. That was the production bug:
 * one transient 5xx emptied `services`, the home page fell through to "No
 * services available yet", and the visitor had to refresh twice to recover.
 * Now a failure only records a reason, which the UI surfaces as a retry action.
 */

const KEY = 'servego_catalog_v1';
// A snapshot older than this is still shown (better than an empty grid) but is
// no longer revalidated automatically — the visitor is offered a refresh.
const FRESH_MS = 60_000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const memory = { value: null, at: 0 };

function isUsable(snapshot) {
  return Array.isArray(snapshot?.value) && Date.now() - snapshot.at < MAX_AGE_MS;
}

/** Last known good catalog, or `null` when nothing usable is stored. */
export function readCatalogSnapshot() {
  if (isUsable(memory)) return { value: memory.value, at: memory.at };

  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isUsable(parsed)) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    memory.value = parsed.value;
    memory.at = parsed.at;
    return parsed;
  } catch {
    // Private-mode / quota / corrupt JSON must never break the page.
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* storage unavailable — in-memory layer still works */
    }
    return null;
  }
}

function writeCatalogSnapshot(value) {
  const snapshot = { value, at: Date.now() };
  memory.value = value;
  memory.at = snapshot.at;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // Over quota or blocked — the in-memory layer is enough for this tab.
  }
  return snapshot;
}

/** True when the stored snapshot is still inside its freshness window. */
export function isCatalogFresh(at = memory.at) {
  return Boolean(at) && Date.now() - at < FRESH_MS;
}

/** Drop the local snapshot so the next read must hit the network. */
export function clearCatalogSnapshot() {
  memory.value = null;
  memory.at = 0;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Refresh the catalog from the API.
 *
 * @param {(value: unknown[]) => void} onData receives the catalog on success
 *        AND when a refresh fails but a usable snapshot exists (so the UI keeps
 *        rendering real data instead of an empty state).
 * @param {(reason: string | null) => void} onError receives `null` on success,
 *        or a user-facing reason when the network failed. `null` while a
 *        snapshot is still being shown is NOT passed — callers render the data
 *        and ignore the error.
 * @returns {Promise<{ ok: boolean, fromCache: boolean, reason?: string }>}
 */
export async function refreshCatalog({ onData, onError, fetchImpl }) {
  const snapshot = readCatalogSnapshot();
  if (snapshot) onData(snapshot.value);

  try {
    const res = await fetchImpl();
    if (!res?.ok) {
      throw new Error(res?.data?.error || 'Could not load services right now.');
    }
    const list = Array.isArray(res.data) ? res.data : [];
    writeCatalogSnapshot(list);
    onData(list);
    onError(null);
    return { ok: true, fromCache: false };
  } catch (err) {
    // Keep the last good snapshot on screen and tell the caller why.
    const reason = err?.message || 'Could not reach the server. Check your connection and try again.';
    onError(reason);
    if (snapshot) return { ok: false, fromCache: true, reason };
    return { ok: false, fromCache: false, reason };
  }
}
