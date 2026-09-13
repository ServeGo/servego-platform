import { test } from 'node:test';
import assert from 'node:assert';
import prisma from '../prisma/client.js';
import { applyPromotion, invalidateLevelCache } from '../services/providerLevelService.js';
import { setQueueEnabled } from '../services/queue/queueService.js';

const RULES = [
  { level: 'BRONZE', minJobs: 0, incentivePercent: 0 },
  { level: 'SILVER', minJobs: 5, incentivePercent: 5 },
  { level: 'GOLD', minJobs: 15, incentivePercent: 10 },
  { level: 'PLATINUM', minJobs: 45, incentivePercent: 15 },
  { level: 'DIAMOND', minJobs: 60, incentivePercent: 20 }
];

/** Direct-write path: client !== prisma, so no extra transaction is opened. */
function makeClient({ provider, monthly = [], credits = [] }) {
  const calls = { providerUpdates: [], promotions: [], histories: [], walletCredits: [] };
  const client = {
    provider: {
      findUnique: async () => provider,
      update: async ({ where, data }) => {
        calls.providerUpdates.push({ where, data });
        return { ...provider, ...data };
      }
    },
    providerLevelRule: { findMany: async () => RULES },
    booking: {
      aggregate: async () => ({
        _count: monthly.length,
        _sum: { providerPlatformCharge: monthly.reduce((s, r) => s + (Number(r.providerPlatformCharge) || 0), 0) }
      }),
      findMany: async ({ skip = 0, take = Infinity }) => monthly.slice(skip, skip + take)
    },
    promotionHistory: {
      findFirst: async () => (credits.length ? credits[credits.length - 1] : null),
      create: async ({ data }) => {
        calls.promotions.push(data);
        return { id: `promo-${calls.promotions.length}`, promotedAt: new Date(), ...data };
      }
    },
    providerLevelHistory: {
      create: async ({ data }) => {
        calls.histories.push(data);
        return { id: `hist-${calls.histories.length}`, ...data };
      }
    },
    wallet: {
      findUnique: async () => null,
      create: async ({ data }) => ({ id: 'wallet-1', balance: 0, ...data }),
      update: async ({ data }) => data
    },
    walletTransaction: {
      create: async ({ data }) => {
        calls.walletCredits.push(data);
        return { id: 'txn-1', ...data };
      }
    }
  };
  return { client, calls };
}

async function withNotificationStub(fn) {
  const original = prisma.notification.create;
  prisma.notification.create = async () => ({});
  try {
    await fn();
  } finally {
    prisma.notification.create = original;
  }
}

const job = (id, amount) => ({ id, providerPlatformCharge: amount, completedAt: new Date() });
const monthMatches = (key) => /^\d{4}-\d{2}$/.test(key);
const thisMonth = () => new Date().toISOString().slice(0, 7);

test('LEVEL INCENTIVE 1: Bronze→Silver at 5 jobs credits exactly 5% of the jobs 1..5 commission band', async () => {
  invalidateLevelCache();
  setQueueEnabled(false);
  const { client, calls } = makeClient({
    provider: { id: 'p1', providerLevel: 'BRONZE', userId: 'u1' },
    monthly: [job('b1', 150), job('b2', 300), job('b3', 200), job('b4', 250), job('b5', 100)]
  });

  await withNotificationStub(async () => {
    const result = await applyPromotion('p1', client);

    assert.equal(result?.toLevel, 'SILVER');
    assert.equal(result?.incentiveAmount, 50, '5% of 1000 commission = 50');
    assert.equal(result?.commissionBase, 1000);
    assert.equal(calls.walletCredits.length, 1, 'exactly one wallet credit');
    assert.equal(calls.walletCredits[0].category, 'LEVEL_INCENTIVE');
    assert.equal(calls.walletCredits[0].amount, 50);
    assert.equal(calls.walletCredits[0].userId, 'u1');
    assert.equal(calls.providerUpdates[0]?.data.providerLevel, 'SILVER');
    assert.equal(calls.promotions.length, 1);
    assert.equal(calls.promotions[0].toLevel, 'SILVER');
    assert.equal(calls.promotions[0].incentiveAmount, 50);
    assert.equal(calls.promotions[0].commissionBase, 1000);
    assert.equal(calls.promotions[0].monthKey && monthMatches(calls.promotions[0].monthKey), true);
  });
  invalidateLevelCache();
});

test('LEVEL INCENTIVE 2: Silver→Gold credits 10% of the jobs 6..15 band ONLY (per-tier, not cumulative)', async () => {
  invalidateLevelCache();
  setQueueEnabled(false);
  const first5 = [job('b1', 150), job('b2', 300), job('b3', 200), job('b4', 250), job('b5', 100)];
  const next10 = Array.from({ length: 10 }, (_, i) => job(`b${6 + i}`, 200));
  const { client, calls } = makeClient({
    provider: { id: 'p1', providerLevel: 'SILVER', userId: 'u1' },
    monthly: [...first5, ...next10],
    credits: [{ toLevel: 'SILVER', monthKey: thisMonth(), incentiveAmount: 50 }]
  });

  await withNotificationStub(async () => {
    const result = await applyPromotion('p1', client);

    assert.equal(result?.toLevel, 'GOLD');
    assert.equal(result?.commissionBase, 2000, 'band = jobs 6..15 only (10 jobs)');
    assert.equal(result?.incentiveAmount, 200, '10% of 2000 band = 200; NOT 10% of all 15 jobs minus 50 (that would be 250)');
    assert.equal(calls.walletCredits.length, 1);
    assert.equal(calls.walletCredits[0].amount, 200);
    assert.equal(calls.walletCredits[0].referenceId, `${result.monthKey}:GOLD`);
  });
  invalidateLevelCache();
});

test('LEVEL INCENTIVE 3: a new-month completion with a stale level resets the display to Bronze with NO wallet credit', async () => {
  invalidateLevelCache();
  setQueueEnabled(false);
  const { client, calls } = makeClient({
    provider: { id: 'p1', providerLevel: 'GOLD', userId: 'u1' },
    monthly: [job('b1', 150), job('b2', 300)]
  });

  await withNotificationStub(async () => {
    const result = await applyPromotion('p1', client);

    assert.equal(result, null, 'no promotion on a reset-only completion');
    assert.equal(calls.walletCredits.length, 0, 'no incentive for sub-Silver count');
    assert.equal(calls.promotions.length, 0, 'no celebration record for the reset');
    assert.equal(calls.providerUpdates[0]?.data.providerLevel, 'BRONZE');
    assert.equal(calls.histories[0]?.reason, 'MONTHLY_RESET');
    assert.equal(calls.histories[0]?.level, 'BRONZE');
    assert.equal(calls.histories[0]?.previousLevel, 'GOLD');
  });
  invalidateLevelCache();
});

test('LEVEL INCENTIVE 4: re-running at an already-credited level is a no-op (no lucky double credit)', async () => {
  invalidateLevelCache();
  setQueueEnabled(false);
  const { client, calls } = makeClient({
    provider: { id: 'p1', providerLevel: 'SILVER', userId: 'u1' },
    monthly: [job('b1', 150), job('b2', 300), job('b3', 200), job('b4', 250), job('b5', 100), job('b6', 300)],
    credits: [{ toLevel: 'SILVER', monthKey: thisMonth(), incentiveAmount: 50 }]
  });

  await withNotificationStub(async () => {
    const result = await applyPromotion('p1', client);

    assert.equal(result, null);
    assert.equal(calls.walletCredits.length, 0, 'SILVER was already credited this month');
    assert.equal(calls.promotions.length, 0);
  });
  invalidateLevelCache();
});

test('LEVEL INCENTIVE 5: a fresh (sub-threshold) month leaves everything untouched', async () => {
  invalidateLevelCache();
  setQueueEnabled(false);
  const { client, calls } = makeClient({
    provider: { id: 'p1', providerLevel: 'BRONZE', userId: 'u1' },
    monthly: [job('b1', 150), job('b2', 300), job('b3', 200)]
  });

  await withNotificationStub(async () => {
    const result = await applyPromotion('p1', client);

    assert.equal(result, null);
    assert.equal(calls.walletCredits.length, 0);
    assert.equal(calls.providerUpdates.length, 0);
    assert.equal(calls.promotions.length, 0);
  });
  invalidateLevelCache();
});