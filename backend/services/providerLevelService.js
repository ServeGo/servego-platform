import prisma from '../prisma/client.js';
import { PROVIDER_LEVEL_DEFAULTS } from '../seeders/businessModelSeed.js';
import { createNotification } from './notificationService.js';
import { creditWallet } from './walletService.js';

const LEVEL_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
const LEVEL_CACHE_TTL_MS = 60 * 1000;

const rulesCache = { rules: null, at: 0 };

export function levelRank(level) {
  return LEVEL_ORDER.indexOf(level);
}

export function levelOrder() {
  return [...LEVEL_ORDER];
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

async function getRules(client = prisma) {
  if (rulesCache.rules && Date.now() - rulesCache.at < LEVEL_CACHE_TTL_MS) {
    return rulesCache.rules;
  }
  const dbRules = await client.providerLevelRule.findMany({
    orderBy: { minJobs: 'asc' }
  });
  const rules = dbRules.length
    ? dbRules.map((rule) => ({
        level: rule.level,
        minJobs: rule.minJobs,
        incentivePercent: rule.incentivePercent
      }))
    : PROVIDER_LEVEL_DEFAULTS.map((r) => ({
        level: r.level,
        minJobs: r.minJobs,
        incentivePercent: r.incentivePercent
      }));
  rulesCache.rules = rules;
  rulesCache.at = Date.now();
  return rules;
}

export function invalidateLevelCache() {
  rulesCache.rules = null;
}

/**
 * The level a provider holds for a GIVEN number of completed jobs. Levels are
 * MONTHLY: they reset at the start of each calendar month, so callers should
 * pass the number of jobs completed within the current month.
 */
export async function getProviderLevelForJobs(jobsCompleted, client = prisma) {
  const rules = await getRules(client);
  const jobs = Math.max(0, Number(jobsCompleted) || 0);
  let level = 'BRONZE';
  for (const rule of rules) {
    if (jobs >= rule.minJobs) level = rule.level;
  }
  return level;
}

function monthOf(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** UTC calendar-month window [start, end) for a date. */
function monthWindow(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}

function minJobsFor(level, rules) {
  const rule = rules.find((r) => r.level === level);
  return rule ? Number(rule.minJobs) || 0 : 0;
}

/** Number of completed jobs + the commission charged on them, this month. */
async function getMonthlyCompletedStats(providerId, client, window) {
  const agg = await client.booking.aggregate({
    where: { providerId, status: 'COMPLETED', completedAt: { gte: window.start, lt: window.end } },
    _count: true,
    _sum: { providerPlatformCharge: true }
  });
  return {
    count: agg._count || 0,
    commission: Math.max(0, Number(agg._sum?.providerPlatformCharge) || 0)
  };
}

/**
 * Sum of the platform commission on the jobs in a level BAND this month —
 * jobs number (fromExclusive, toInclusive] in completion order. This is the
 * base for the per-band incentive: SILVER = jobs 1..5, GOLD = jobs 6..15, etc.
 */
async function getBandCommission(providerId, client, window, fromExclusive, toInclusive) {
  if (toInclusive <= fromExclusive || toInclusive <= 0) return 0;
  const rows = await client.booking.findMany({
    where: { providerId, status: 'COMPLETED', completedAt: { gte: window.start, lt: window.end } },
    orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
    skip: fromExclusive,
    take: toInclusive - fromExclusive,
    select: { providerPlatformCharge: true }
  });
  return rows.reduce((sum, row) => sum + (Number(row.providerPlatformCharge) || 0), 0);
}

/**
 * Check the provider for a promotion after a completed job and persist the
 * level change + history + (wallet) incentive credit when promoted. Runs inside
 * the caller's transaction (`client`), so all writes share one data-consistent
 * unit.
 *
 * Levels are MONTHLY: a provider's level is derived from the jobs completed
 * within the current calendar month, and resets at month start. On a month's
 * first completion the displayed level falls back to Bronze. Each level-up
 * within the month credits the provider's wallet with that level's incentive %
 * of the commission on the jobs completed IN THAT LEVEL'S BAND this month
 * (SILVER = jobs 1..5, GOLD = jobs 6..15, ...). Each (provider, month, level)
 * is credited at most once.
 *
 * Returns `null` when there is nothing to do, otherwise a record describing
 * the promotion. Socket emission happens after the transaction commits.
 */
export async function applyPromotion(providerId, client = prisma) {
  const provider = await client.provider.findUnique({
    where: { id: providerId },
    select: { id: true, providerLevel: true, userId: true }
  });
  if (!provider) return null;

  const now = new Date();
  const month = monthOf(now);
  const window = monthWindow(now);
  const rules = await getRules(client);

  const stats = await getMonthlyCompletedStats(providerId, client, window);
  const targetLevel = await getProviderLevelForJobs(stats.count, client);
  const targetRule = rules.find((r) => r.level === targetLevel);
  const targetPercent = Number(targetRule?.incentivePercent) || 0;

  // The highest level already credited (and celebrated) this month. Levels only
  // move upward within a month, so the latest credit row is the ceiling.
  const lastCredit = await client.promotionHistory.findFirst({
    where: { providerId, monthKey: month },
    orderBy: { promotedAt: 'desc' }
  });
  const creditedLevel = lastCredit?.monthKey === month ? lastCredit.toLevel : 'BRONZE';

  const levelChanged = provider.providerLevel !== targetLevel;
  let promotion = null;

  if (levelRank(targetLevel) > levelRank(creditedLevel)) {
    // Level-up within this month: credit the per-band incentive and celebrate.
    const bandCommission = await getBandCommission(
      providerId,
      client,
      window,
      minJobsFor(creditedLevel, rules),
      minJobsFor(targetLevel, rules)
    );
    const incentiveAmount = round2((targetPercent * bandCommission) / 100);

    if (incentiveAmount > 0) {
      await creditWallet({
        userId: provider.userId,
        amount: incentiveAmount,
        category: 'LEVEL_INCENTIVE',
        referenceType: 'MONTHLY_LEVEL',
        referenceId: `${month}:${targetLevel}`,
        description: `Level incentive — ${targetPercent}% of the ${round2(bandCommission)} commission on your ${targetLevel} band jobs (${creditedLevel} → ${targetLevel}) added to your wallet`,
        client
      });
    }

    await client.provider.update({
      where: { id: providerId },
      data: { providerLevel: targetLevel, promotionDate: now }
    });

    const [promo] = await Promise.all([
      client.promotionHistory.create({
        data: {
          providerId,
          fromLevel: provider.providerLevel,
          toLevel: targetLevel,
          completedJobsAtPromotion: stats.count,
          monthKey: month,
          commissionBase: bandCommission,
          incentiveAmount
        }
      }),
      client.providerLevelHistory.create({
        data: {
          providerId,
          level: targetLevel,
          previousLevel: provider.providerLevel,
          reason: 'PROMOTION',
          completedJobs: stats.count
        }
      })
    ]);

    await createNotification(
      provider.userId,
      `Congratulations! You reached ${targetLevel}`,
      incentiveAmount > 0
        ? `You reached ${targetLevel} with ${stats.count} completed jobs this month and earned a ${targetPercent}% level incentive of ${round2(incentiveAmount)}, credited to your wallet.`
        : `You reached ${targetLevel} after ${stats.count} completed jobs this month.`
    );

    promotion = {
      fromLevel: provider.providerLevel,
      toLevel: targetLevel,
      completedJobsAtPromotion: stats.count,
      monthKey: month,
      commissionBase: bandCommission,
      incentiveAmount,
      promotedAt: promo.promotedAt,
      providerUserId: provider.userId
    };
  } else if (levelChanged && targetLevel === 'BRONZE') {
    // New month, no level-ups yet: reset the displayed level back to Bronze and
    // clear the celebration watermark. No incentive is involved — the count is
    // below every non-Bronze threshold.
    await client.provider.update({
      where: { id: providerId },
      data: { providerLevel: 'BRONZE', promotionDate: now }
    });
    await client.providerLevelHistory.create({
      data: {
        providerId,
        level: 'BRONZE',
        previousLevel: provider.providerLevel,
        reason: 'MONTHLY_RESET',
        completedJobs: stats.count
      }
    });
  }

  return promotion;
}

/**
 * Promotion history for the provider dashboard level card.
 */
export async function getPromotionHistory(providerId, client = prisma) {
  return client.promotionHistory.findMany({
    where: { providerId },
    orderBy: { promotedAt: 'desc' }
  });
}

export async function getLevelHistory(providerId, client = prisma) {
  return client.providerLevelHistory.findMany({
    where: { providerId },
    orderBy: { changedAt: 'desc' }
  });
}

export async function acknowledgePromotion(promotionId, client = prisma) {
  return client.promotionHistory.update({
    where: { id: promotionId },
    data: { acknowledged: true, acknowledgedAt: new Date() }
  });
}