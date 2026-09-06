import prisma from '../prisma/client.js';

/**
 * Temporary, action-required alerts. Unlike notifications (which persist and
 * get flagged read), an alert lives on the backend only until the recipient
 * reviews it — reviewing DELETES the row, so alerts are read-once by design.
 * On review the socket emits `alert:reviewed` (or `alert:cleared`) so the UI
 * stays in sync across devices without a refetch.
 */
function generateAlertId() {
  return `alrt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

function emitAlert(io, userId, event, data) {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

/**
 * Create an alert for a user and push it over the socket. Direct insert (no
 * queue) — alerts are small, low-volume, read-once rows; the write is not a
 * slow side effect and must not be replayed.
 */
export async function createAlert({
  userId,
  title,
  message,
  type = 'SYSTEM',
  data = null,
  io = null,
  client = prisma
}) {
  if (!userId || !title) return null;
  const alert = {
    id: generateAlertId(),
    userId,
    title,
    message,
    type,
    data,
    createdAt: new Date().toISOString()
  };
  try {
    await client.alert.create({
      data: {
        id: alert.id,
        userId: alert.userId,
        title: alert.title,
        message: alert.message,
        type: alert.type,
        data: data ?? undefined,
        createdAt: alert.createdAt
      }
    });
    emitAlert(io, userId, 'alert', alert);
  } catch (err) {
    console.error(`[AlertService] Failed to create alert for user ${userId}:`, err.message);
    return null;
  }
  return alert;
}

/** The recipient's unreviewed alerts, newest first. */
export async function listAlerts(userId, { limit = 50, client = prisma } = {}) {
  return client.alert.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(100, Math.max(1, limit))
  });
}

/**
 * Review a single alert → deletes it from the backend. Idempotent: a second
 * attempt (retry / already-reviewed) is a 404-style miss, never a duplicate
 * write.
 */
export async function reviewAlert({ userId, alertId, io = null, client = prisma }) {
  const deleted = await client.alert.deleteMany({ where: { id: alertId, userId } });
  if (deleted.count > 0) emitAlert(io, userId, 'alert:reviewed', { alertId });
  return { reviewed: deleted.count > 0, alertId };
}

/** Review every alert for the user → deletes them all from the backend. */
export async function reviewAllAlerts({ userId, io = null, client = prisma }) {
  const deleted = await client.alert.deleteMany({ where: { userId } });
  if (deleted.count > 0) emitAlert(io, userId, 'alert:cleared', {});
  return { reviewed: deleted.count };
}

/**
 * Consume alerts matched by a JSON data field — used when the user's own
 * action is itself the "review" (e.g. the provider accepts/views the lead the
 * alert points at), so no orphan rows accumulate. Never throws: alert cleanup
 * is advisory and must not fail the caller's critical flow.
 */
export async function consumeAlertsByData({ userId, type, key, value, client = prisma }) {
  if (!userId || !type || !key || value == null) return 0;
  try {
    if (typeof client?.alert?.deleteMany !== 'function') return 0;
    const result = await client.alert.deleteMany({
      where: { userId, type, data: { path: [key], equals: value } }
    });
    return result?.count ?? 0;
  } catch (err) {
    console.error(`[AlertService] Failed to consume ${type} alert for user ${userId}:`, err.message);
    return 0;
  }
}

/**
 * Replace alerts matched by a JSON data field with a fresh row — used when a
 * follow-up event supersedes an earlier unread alert (e.g. a quotation EDIT
 * replaces the customer's previous "Quotation Received" alert so they never
 * stack duplicates). Each superseded alert is emitted as `alert:reviewed` so
 * the UI clears it in place. Never throws.
 */
export async function replaceAlertsByData({ userId, type, key, value, io = null, client = prisma }) {
  if (!userId || !type || !key || value == null) return 0;
  try {
    if (typeof client?.alert?.findMany !== 'function' || typeof client?.alert?.deleteMany !== 'function') return 0;
    const existing = await client.alert.findMany({
      where: { userId, type, data: { path: [key], equals: value } },
      select: { id: true }
    });
    if (existing.length === 0) return 0;
    await client.alert.deleteMany({ where: { id: { in: existing.map((r) => r.id) }, userId } });
    existing.forEach((row) => emitAlert(io, userId, 'alert:reviewed', { alertId: row.id }));
    return existing.length;
  } catch (err) {
    console.error(`[AlertService] Failed to replace ${type} alert for user ${userId}:`, err.message);
    return 0;
  }
}