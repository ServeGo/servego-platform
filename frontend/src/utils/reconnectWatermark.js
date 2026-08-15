/**
 * Per-user lastSeen watermark for realtime connection recovery (rule 23).
 *
 * Values are ALWAYS server timestamps (ISO strings) captured from API responses
 * or socket payloads — never the local clock. Stored in localStorage so a page
 * reload does not lose the "what have I already seen" position.
 *
 * Shape: { notificationsAfter?: string, bookingsAfter?: string }
 */

const keyFor = (userId) => `servego_reconnect_watermark_${userId || 'anon'}`;

export function readWatermark(userId) {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveWatermark(userId, patch) {
  try {
    const next = { ...readWatermark(userId), ...patch };
    localStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    // storage unavailable — watermark is best-effort
  }
}

/** Keep the HIGHEST server timestamp per field so we never move the marker backwards. */
export function advanceWatermark(userId, patch) {
  const current = readWatermark(userId);
  const next = {};
  if (patch.notificationsAfter && (!current.notificationsAfter || patch.notificationsAfter > current.notificationsAfter)) {
    next.notificationsAfter = patch.notificationsAfter;
  }
  if (patch.bookingsAfter && (!current.bookingsAfter || patch.bookingsAfter > current.bookingsAfter)) {
    next.bookingsAfter = patch.bookingsAfter;
  }
  if (Object.keys(next).length) saveWatermark(userId, next);
}

export function clearWatermark(userId) {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    // ignore
  }
}
