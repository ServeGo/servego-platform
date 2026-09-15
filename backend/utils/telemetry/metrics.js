import { logger } from './logger.js';

/**
 * In-memory operational metrics. Everything lives in process memory — nothing
 * touches PostgreSQL — so per-request overhead is a few hash ops and a
 * histogram increment. `snapshot()` answers the operational questions (which
 * API is slow, what is the error rate, p95/p99 latency) without any query load.
 *
 * Snapshot is available live via `GET /admin/metrics` and flushed to the
 * structured log stream on a timer for off-box collection.
 */
const LATENCY_BUCKETS_MS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, Infinity];

// Routes with no traffic for this window are pruned on the flush timer so the
// map stays bounded on a long-lived process (AGENTS.md: cache/state hygiene).
const STALE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

const startedAt = Date.now();
const routeStats = new Map();
const errorCodeCounts = new Map();
const counters = {};

function bucketIndex(durationMs) {
  for (let i = 0; i < LATENCY_BUCKETS_MS.length; i += 1) {
    if (durationMs <= LATENCY_BUCKETS_MS[i]) return i;
  }
  return LATENCY_BUCKETS_MS.length - 1;
}

export function recordRequest({ route, statusCode, durationMs }) {
  const key = route || 'unknown';
  let stat = routeStats.get(key);
  if (!stat) {
    stat = { count: 0, errorCount: 0, totalMs: 0, buckets: new Array(LATENCY_BUCKETS_MS.length).fill(0), lastSeen: null };
    routeStats.set(key, stat);
  }
  stat.count += 1;
  stat.totalMs += durationMs;
  stat.lastSeen = Date.now();
  if (statusCode >= 400) stat.errorCount += 1;
  stat.buckets[bucketIndex(durationMs)] += 1;
}

export function recordError(code) {
  const key = String(code || 'UNKNOWN');
  errorCodeCounts.set(key, (errorCodeCounts.get(key) || 0) + 1);
}

export function recordCounter(name, delta = 1) {
  counters[name] = (counters[name] || 0) + delta;
}

function approxPercentile(buckets, total, p) {
  if (!total) return null;
  const target = (total * p) / 100;
  let cumulative = 0;
  for (let i = 0; i < buckets.length; i += 1) {
    cumulative += buckets[i];
    if (cumulative >= target) {
      const upper = LATENCY_BUCKETS_MS[i];
      return upper === Infinity ? null : upper;
    }
  }
  return null;
}

export function snapshot() {
  const routes = {};
  for (const [key, stat] of routeStats) {
    routes[key] = {
      count: stat.count,
      errorCount: stat.errorCount,
      errorRate: stat.count ? Math.round((stat.errorCount / stat.count) * 10000) / 100 : 0,
      avgMs: stat.count ? Math.round((stat.totalMs / stat.count) * 100) / 100 : 0,
      p95Ms: approxPercentile(stat.buckets, stat.count, 95),
      p99Ms: approxPercentile(stat.buckets, stat.count, 99),
      lastSeen: stat.lastSeen ? new Date(stat.lastSeen).toISOString() : null
    };
  }
  return {
    startedAt: new Date(startedAt).toISOString(),
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    routes,
    errorCodes: Object.fromEntries(errorCodeCounts),
    counters: { ...counters },
    latencyBucketsMs: LATENCY_BUCKETS_MS.filter((v) => v !== Infinity)
  };
}

export function reset() {
  routeStats.clear();
  errorCodeCounts.clear();
  for (const key of Object.keys(counters)) delete counters[key];
}

let flushTimer = null;

export function startPeriodicMetricsLog(intervalMs = 60000) {
  if (flushTimer) return flushTimer;
  flushTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, stat] of routeStats) {
      if (stat.lastSeen && now - stat.lastSeen > STALE_WINDOW_MS) routeStats.delete(key);
    }
    logger.info('metrics.snapshot', snapshot());
  }, intervalMs);
  flushTimer.unref?.();
  return flushTimer;
}

export const metrics = {
  recordRequest,
  recordError,
  recordCounter,
  snapshot,
  reset,
  startPeriodicMetricsLog
};

export default metrics;