import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../prisma/client.js';
import {
  enqueueJob,
  claimJobs,
  processClaimedJob,
  backoffDelayMs,
  requeueDeadJobs,
  registerJobHandler
} from '../services/queue/queueService.js';

// DB-backed tests auto-skip when the database is unreachable (CI / offline),
// keeping the suite green while the pure unit tests always run.
const dbReady = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
})();

test('backoff delay grows exponentially and is capped at 30s', () => {
  const first = backoffDelayMs(1);
  const second = backoffDelayMs(2);
  assert.ok(first >= 1000 && first < 1250, `first backoff out of range: ${first}`);
  assert.ok(second >= 2000 && second < 2250, `second backoff out of range: ${second}`);
  assert.ok(backoffDelayMs(20) <= 30250, 'backoff must be capped');
});

test('enqueueJob rejects job types with no registered handler', async () => {
  await assert.rejects(
    () => enqueueJob({ type: 'does.not.exist', payload: {} }),
    /No queue handler registered/
  );
});

test('enqueueJob validates a handler must be a function', () => {
  assert.throws(() => registerJobHandler('bad.handler', 'not-a-function'), /handler function/);
});

const dbTest = dbReady ? test : test.skip;

// A prior crashed run (or a concurrent run) may leave test.* jobs behind.
// `claimJobs` claims every due job of a type, so purge leftovers before and
// after the DB-backed tests to keep the suite hermetic.
const purgeTestJobs = async () => {
  if (!dbReady) return;
  await prisma.job.deleteMany({ where: { type: { startsWith: 'test.' } } });
};
test.before(purgeTestJobs);
test.after(purgeTestJobs);

dbTest('claim + process runs the handler and settles the job as SUCCEEDED', async () => {
  const seen = [];
  registerJobHandler('test.echo', async (payload) => {
    seen.push(payload);
    return { echoed: payload.value };
  });

  const job = await enqueueJob({ type: 'test.echo', payload: { value: 42 } });
  const claimed = (await claimJobs('test.echo')).find((j) => j.id === job.id);
  assert.ok(claimed, 'job should have been claimed');

  await processClaimedJob(claimed);
  const settled = await prisma.job.findUnique({ where: { id: job.id } });
  assert.equal(settled.status, 'SUCCEEDED');
  assert.equal(seen.length, 1);
  assert.deepEqual(settled.result, { echoed: 42 });

  await prisma.job.delete({ where: { id: job.id } });
});

dbTest('a repeatedly failing handler backs off then goes DEAD', async () => {
  registerJobHandler('test.fail', async () => {
    throw new Error('boom');
  });

  const job = await enqueueJob({ type: 'test.fail', payload: {}, maxAttempts: 2 });

  // Attempt 1 — fails, goes back to PENDING with a backoff-delayed availableAt.
  let claimed = (await claimJobs('test.fail')).find((j) => j.id === job.id);
  await processClaimedJob(claimed);
  let state = await prisma.job.findUnique({ where: { id: job.id } });
  assert.equal(state.status, 'PENDING');
  assert.equal(state.attempts, 1, 'attempt counter should increment on claim');
  assert.ok(new Date(state.availableAt) > new Date(job.createdAt), 'retry should be backoff-delayed');
  assert.match(state.lastError, /boom/);

  // Attempt 2 — fails again, maxAttempts exhausted → DEAD.
  await prisma.job.update({ where: { id: job.id }, data: { availableAt: new Date() } });
  claimed = (await claimJobs('test.fail')).find((j) => j.id === job.id);
  await processClaimedJob(claimed);
  state = await prisma.job.findUnique({ where: { id: job.id } });
  assert.equal(state.status, 'DEAD');
  assert.match(state.lastError, /boom/);

  await prisma.job.delete({ where: { id: job.id } });
});

dbTest('dedupeKey prevents the same logical job being queued twice', async () => {
  registerJobHandler('test.dedupe', async () => 'ok');

  const first = await enqueueJob({ type: 'test.dedupe', payload: {}, dedupeKey: 'dup-1' });
  const second = await enqueueJob({ type: 'test.dedupe', payload: {}, dedupeKey: 'dup-1' });
  assert.equal(second.dedupeSkipped, true);
  assert.equal(second.id, first.id);

  await prisma.job.deleteMany({ where: { dedupeKey: 'dup-1' } });
});

dbTest('requeueDeadJobs moves DEAD jobs back to PENDING for another attempt', async () => {
  registerJobHandler('test.dead', async () => 'ok');

  const job = await prisma.job.create({
    data: { type: 'test.dead', payload: {}, status: 'DEAD', maxAttempts: 3, attempts: 3, lastError: 'boom' }
  });
  const count = await requeueDeadJobs();
  assert.ok(count >= 1);

  const state = await prisma.job.findUnique({ where: { id: job.id } });
  assert.equal(state.status, 'PENDING');
  assert.equal(state.attempts, 0);
  assert.equal(state.lastError, null);

  await prisma.job.delete({ where: { id: job.id } });
});
