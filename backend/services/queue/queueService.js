import prisma from '../../prisma/client.js';
import { jobHandlers, registerHandler } from './jobHandlers.js';
import { queueMetrics, idleBackoffMs } from './queueMetrics.js';

/**
 * Durable job queue backed by PostgreSQL.
 *
 * Booking side-effects that used to run inline in the request
 * path (email delivery, notification persistence, analytics aggregation,
 * invoice generation, provider performance bookkeeping) are now enqueued as
 * `Job` rows and drained by workers. The queue gives:
 *
 *  - at-least-once delivery (jobs are only marked SUCCEEDED after the handler
 *    completes; failures go back to PENDING with exponential backoff)
 *  - dead-lettering (a job that exhausts its attempts becomes DEAD for admin
 *    review, and can be requeued via `requeueDeadJobs`)
 *  - durability (jobs live in the same PostgreSQL the app already uses, so no
 *    separate broker is required and nothing is lost on a restart)
 *
 * Claiming is atomic in PostgreSQL: `updateMany ... WHERE status = 'PENDING'`
 * means two workers (e.g. the API process and a dedicated worker process) can
 * never process the same job twice.
 */

const POLL_INTERVAL_MS = parseInt(process.env.QUEUE_POLL_INTERVAL_MS || '1500', 10);
const CLAIM_BATCH_SIZE = parseInt(process.env.QUEUE_CLAIM_BATCH_SIZE || '10', 10);
const PROCESSING_RECOVERY_GRACE_MS = 5 * 60 * 1000;

let enabled = process.env.QUEUE_WORKERS_ENABLED !== 'false';
let running = false;
const activeWorkers = new Set();
const inFlight = new Set();

export function isQueueEnabled() {
  return enabled;
}

export function setQueueEnabled(value) {
  enabled = value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with jitter, capped at 30s. */
export function backoffDelayMs(attempt) {
  const base = 1000 * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(30000, base) + Math.floor(Math.random() * 250);
}

/**
 * Mark an error as PERMANENT — retrying can never fix it (e.g. a poisoned
 * payload missing a required field). The worker dead-letters it immediately
 * instead of retrying with backoff.
 */
export function permanentError(message) {
  const err = new Error(message);
  err.permanent = true;
  return err;
}

/**
 * Insert a job for async processing. Returns the created job (or an object
 * describing the skipped duplicate when `dedupeKey` is already queued).
 */
export async function enqueueJob({
  type,
  payload = {},
  maxAttempts = 3,
  delayMs = 0,
  runAt = null,
  priority = 0,
  dedupeKey = null
}) {
  if (!enabled) return null;
  if (!jobHandlers[type]) {
    throw new Error(`No queue handler registered for job type "${type}".`);
  }

  if (dedupeKey) {
    const existing = await prisma.job.findFirst({
      where: { dedupeKey, status: { in: ['PENDING', 'PROCESSING'] } },
      select: { id: true }
    });
    if (existing) return { id: existing.id, dedupeSkipped: true };
  }

  const availableAt = runAt ? new Date(runAt) : new Date(Date.now() + Math.max(0, delayMs || 0));
  return prisma.job.create({
    data: {
      type,
      payload,
      maxAttempts: Math.max(1, parseInt(maxAttempts, 10) || 3),
      priority: parseInt(priority, 10) || 0,
      dedupeKey,
      availableAt
    }
  });
}

/** Register a handler at runtime (used by tests and plugin code). */
export function registerJobHandler(type, handler) {
  return registerHandler(type, handler);
}

/**
 * Atomically claim up to `limit` due jobs of a type. The `updateMany` guard on
 * `status: 'PENDING'` makes this safe across multiple worker processes.
 *
 * Metrics: counts the 2–3 queries this poll performs and records, for every
 * claimed job, how long it sat in the queue after it became due (the polling
 * latency the admin dashboard can tune against).
 */
export async function claimJobs(type, limit = CLAIM_BATCH_SIZE) {
  const now = new Date();
  const due = await prisma.job.findMany({
    where: { type, status: 'PENDING', availableAt: { lte: now } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    take: limit
  });
  queueMetrics.recordQuery();
  if (!due.length) return [];

  const claimed = await prisma.job.updateMany({
    where: { id: { in: due.map((j) => j.id) }, status: 'PENDING' },
    data: { status: 'PROCESSING', startedAt: now, attempts: { increment: 1 } }
  });
  queueMetrics.recordQuery();

  // A competing worker may have claimed some of these rows first. Only return
  // the ones this worker actually transitioned.
  let ours;
  if (claimed.count !== due.length) {
    ours = await prisma.job.findMany({
      where: { id: { in: due.map((j) => j.id) }, status: 'PROCESSING' },
      select: { id: true }
    });
    queueMetrics.recordQuery();
    const oursIds = new Set(ours.map((j) => j.id));
    ours = due.filter((j) => oursIds.has(j.id));
  } else {
    ours = due;
  }

  for (const job of ours) {
    const queuedFor = Math.max(0, now.getTime() - new Date(job.availableAt).getTime());
    queueMetrics.recordClaim({ queuedFor });
  }
  return ours;
}

/** Run a single claimed job's handler and settle its outcome. */
export async function processClaimedJob(job) {
  inFlight.add(job.id);
  const startedAt = Date.now();
  try {
    const handler = jobHandlers[job.type];
    if (!handler) throw new Error(`No handler registered for job type "${job.type}".`);
    const result = await handler(job.payload);
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'SUCCEEDED', finishedAt: new Date(), lastError: null, result: result ?? undefined }
    });
    queueMetrics.recordQuery();
    queueMetrics.recordSucceeded({ durationMs: Date.now() - startedAt });
  } catch (err) {
    // A payload error that retrying can NEVER fix (missing required fields,
    // corrupted payload) dead-letters immediately instead of churning retries.
    if (err?.permanent === true) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'DEAD', finishedAt: new Date(), lastError: err.message }
      });
      queueMetrics.recordQuery();
      queueMetrics.recordDead();
      console.error(`[Queue] Job ${job.id} (${job.type}) blocked as permanent error: ${err.message}`);
      return;
    }
    // `job.attempts` was incremented by the claim before the handler ran, so
    // this execution is attempt number (attempts + 1).
    const attemptNumber = (Number(job.attempts) || 0) + 1;
    if (attemptNumber >= Math.max(1, Number(job.maxAttempts) || 3)) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'DEAD', finishedAt: new Date(), lastError: err.message }
      });
      queueMetrics.recordQuery();
      queueMetrics.recordDead();
      console.error(`[Queue] Job ${job.id} (${job.type}) dead after ${attemptNumber} attempts: ${err.message}`);
    } else {
      const backoff = backoffDelayMs(attemptNumber);
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          availableAt: new Date(Date.now() + backoff),
          lastError: err.message
        }
      });
      queueMetrics.recordQuery();
      queueMetrics.recordRequeued();
      console.warn(`[Queue] Job ${job.id} (${job.type}) attempt ${attemptNumber} failed — retry in ${backoff}ms: ${err.message}`);
    }
  } finally {
    inFlight.delete(job.id);
  }
}

async function workerLoop(type) {
  activeWorkers.add(type);
  let consecutiveEmptyCycles = 0;
  try {
    while (running) {
      let jobs = [];
      try {
        jobs = await claimJobs(type);
      } catch (err) {
        consecutiveEmptyCycles = 0;
        console.error(`[Queue] Worker (${type}) claim error: ${err.message}`);
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      if (!jobs.length) {
        consecutiveEmptyCycles += 1;
        queueMetrics.recordCycle({ empty: true });
        await sleep(idleBackoffMs(consecutiveEmptyCycles, POLL_INTERVAL_MS));
        continue;
      }
      consecutiveEmptyCycles = 0;

      queueMetrics.recordCycle({ empty: false });
      await Promise.all(jobs.map((job) => processClaimedJob(job)));

      // A full batch means more work is likely waiting — poll again immediately.
      if (jobs.length < CLAIM_BATCH_SIZE) {
        await sleep(POLL_INTERVAL_MS);
      }
    }
  } finally {
    activeWorkers.delete(type);
  }
}

/**
 * Start the in-process workers for the given job types. Enabled by default so
 * a single-process deploy self-heals; set QUEUE_WORKERS_ENABLED=false to run
 * a dedicated worker process instead (`npm run worker`).
 */
export function startQueueWorkers({ types = Object.keys(jobHandlers), pollIntervalMs = POLL_INTERVAL_MS } = {}) {
  if (!enabled || running) return;
  running = true;
  for (const type of types) {
    if (!jobHandlers[type]) continue;
    void workerLoop(type);
  }
  console.log(`[Queue] Workers started for: ${Object.keys(jobHandlers).join(', ')} (poll ${pollIntervalMs}ms)`);
}

/** Stop accepting new work; in-flight jobs finish their current run. */
export function stopQueueWorkers() {
  running = false;
}

/** Resolve once in-flight jobs drain (with a safety cap). */
export async function drainQueueWorkers(timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (inFlight.size > 0 && Date.now() < deadline) {
    await sleep(100);
  }
  return inFlight.size === 0;
}

/**
 * On startup, any job left PROCESSING by a previous process is stale (a crash,
 * deploy, or scale-in). Return those to PENDING so they are retried instead of
 * being stuck forever. A grace period protects the tail of a rolling deploy.
 */
export async function recoverInterruptedJobs() {
  if (!enabled) return 0;
  const staleCutoff = new Date(Date.now() - PROCESSING_RECOVERY_GRACE_MS);
  const result = await prisma.job.updateMany({
    where: { status: 'PROCESSING', startedAt: { lte: staleCutoff } },
    data: { status: 'PENDING', availableAt: new Date(), lastError: 'Recovered after interrupted processing' }
  });
  if (result.count > 0) {
    console.log(`[Queue] Recovered ${result.count} interrupted job(s).`);
  }
  return result.count;
}

/** Move every DEAD job back to PENDING for another attempt. */
export async function requeueDeadJobs() {
  if (!enabled) return 0;
  const result = await prisma.job.updateMany({
    where: { status: 'DEAD' },
    data: { status: 'PENDING', availableAt: new Date(), attempts: 0, lastError: null, finishedAt: null }
  });
  return result.count;
}

/** Aggregate stats for the admin queue dashboard. */
export async function getQueueStats() {
  const groups = await prisma.job.groupBy({
    by: ['type', 'status'],
    _count: { _all: true }
  });

  const counts = {};
  const totals = {
    PENDING: 0,
    PROCESSING: 0,
    SUCCEEDED: 0,
    FAILED: 0,
    DEAD: 0
  };

  for (const group of groups) {
    if (!counts[group.type]) counts[group.type] = {};
    counts[group.type][group.status] = group._count._all;
    totals[group.status] = (totals[group.status] || 0) + group._count._all;
  }

  return {
    enabled,
    running,
    pollIntervalMs: POLL_INTERVAL_MS,
    claimBatchSize: CLAIM_BATCH_SIZE,
    idleBackoffMs: idleBackoffMs(0, POLL_INTERVAL_MS),
    workers: Object.keys(jobHandlers),
    counts,
    totals,
    metrics: queueMetrics.snapshot()
  };
}
