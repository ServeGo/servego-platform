/**
 * In-memory queue worker metrics.
 *
 * Bounded counters + time-sample rings, zero infrastructure. Lets the admin
 * dashboard answer "how is the queue doing?" — jobs processed/sec, average queue
 * wait, worker processing time, failures and DB queries per worker cycle —
 * before any tuning decision (poll interval, batch size, replacing PostgreSQL).
 */

const PROCESSED_WINDOW_MS = 60_000;
const MAX_SAMPLES = 500;

const state = {
  startedAt: Date.now(),
  claimed: 0,
  succeeded: 0,
  dead: 0,
  requeued: 0,
  blockedPermanent: 0,
  cycles: 0,
  emptyCycles: 0,
  queries: 0,
  processedAt: [],
  queueWaitMs: [],
  executionMs: []
};

function pushRing(arr, value) {
  arr.push(value);
  if (arr.length > MAX_SAMPLES) arr.shift();
}

/** Average of an array, falling back to 0 when empty. */
export function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** P95 (95th percentile) of an array; returns 0 for empty input. */
export function p95(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx];
}

export const queueMetrics = {
  recordClaim({ queuedFor }) {
    state.claimed += 1;
    if (queuedFor !== undefined) pushRing(state.queueWaitMs, queuedFor);
  },

  recordQuery(count = 1) {
    state.queries += count;
  },

  recordCycle({ empty = false } = {}) {
    state.cycles += 1;
    if (empty) state.emptyCycles += 1;
  },

  recordSucceeded({ durationMs }) {
    state.succeeded += 1;
    if (durationMs !== undefined) pushRing(state.executionMs, durationMs);
    state.processedAt.push(Date.now());
    if (state.processedAt.length > MAX_SAMPLES) state.processedAt.shift();
  },

  recordDead() {
    state.dead += 1;
  },

  recordRequeued() {
    state.requeued += 1;
  },

  recordBlockedPermanent() {
    state.blockedPermanent += 1;
  },

  snapshot() {
    const now = Date.now();
    const windowStart = now - PROCESSED_WINDOW_MS;
    const processedInWindow = state.processedAt.filter((t) => t >= windowStart).length;
    return {
      startedAt: state.startedAt,
      uptimeMs: now - state.startedAt,
      claimed: state.claimed,
      succeeded: state.succeeded,
      dead: state.dead,
      requeued: state.requeued,
      blockedPermanent: state.blockedPermanent,
      processedPerSec: Number((processedInWindow / (PROCESSED_WINDOW_MS / 1000)).toFixed(2)),
      processedInWindow,
      avgQueueWaitMs: Math.round(avg(state.queueWaitMs)),
      p95QueueWaitMs: Math.round(p95(state.queueWaitMs)),
      avgProcessingMs: Math.round(avg(state.executionMs)),
      p95ProcessingMs: Math.round(p95(state.executionMs)),
      cycles: state.cycles,
      emptyCycles: state.emptyCycles,
      queries: state.queries,
      queriesPerCycle: state.cycles ? Number((state.queries / state.cycles).toFixed(2)) : 0
    };
  },

  reset() {
    state.startedAt = Date.now();
    state.claimed = 0;
    state.succeeded = 0;
    state.dead = 0;
    state.requeued = 0;
    state.blockedPermanent = 0;
    state.cycles = 0;
    state.emptyCycles = 0;
    state.queries = 0;
    state.processedAt.length = 0;
    state.queueWaitMs.length = 0;
    state.executionMs.length = 0;
  }
};

/**
 * Idle backoff: after `consecutiveEmptyCycles` polls found nothing, stretch the
 * sleep so an idle platform stops hammering PostgreSQL every poll interval. The
 * worker still wakes immediately when a job is enqueued (wake-on-enqueue), so
 * this never adds latency — it only removes wasted polling.
 */
export function idleBackoffMs(consecutiveEmptyCycles, basePollMs = 1500) {
  if (consecutiveEmptyCycles <= 2) return basePollMs;
  const steps = consecutiveEmptyCycles - 2;
  return Math.min(basePollMs * 4, basePollMs * (1 + steps * 0.5));
}