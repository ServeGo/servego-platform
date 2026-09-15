import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Per-request correlation context propagated through async work via
 * AsyncLocalStorage. Middleware seeds it with `requestId`; auth merges the
 * authenticated `userId`/`role` when the user is resolved; queue workers
 * re-seed it from the job's captured `__ctx` so handler logs stay correlated
 * with the HTTP request that enqueued them.
 *
 * No DB involvement at all — this is pure process-local state.
 */
const requestStore = new AsyncLocalStorage();

export function runWithRequestContext(context, fn) {
  return requestStore.run(context || {}, fn);
}

export function getRequestContext() {
  return requestStore.getStore() || {};
}

export function setRequestUser(userId, role) {
  const ctx = requestStore.getStore();
  if (!ctx) return;
  if (userId !== undefined && userId !== null) ctx.userId = userId;
  if (role !== undefined && role !== null) ctx.role = role;
}