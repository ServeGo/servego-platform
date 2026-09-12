import prisma from '../prisma/client.js';
import { PROVIDER_LEVEL_DEFAULTS } from '../seeders/businessModelSeed.js';
import { createNotification } from './notificationService.js';

const LEVEL_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
const LEVEL_CACHE_TTL_MS = 60 * 1000;

const rulesCache = { rules: null, at: 0 };

export function levelRank(level) {
  return LEVEL_ORDER.indexOf(level);
}

export function levelOrder() {
  return [...LEVEL_ORDER];
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
        discountPercent: rule.discountPercent
      }))
    : PROVIDER_LEVEL_DEFAULTS;
  rulesCache.rules = rules;
  rulesCache.at = Date.now();
  return rules;
}

export function invalidateLevelCache() {
  rulesCache.rules = null;
}

/**
 * The provider level is PERMANENT and based purely on lifetime completed jobs.
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

/**
 * Check the provider for a promotion after a completed job and persist the
 * level change + history when promoted. Runs inside the caller's transaction
 * (`client`), so all writes share one data-consistent unit.
 *
 * Returns `null` when there is nothing to do, otherwise a record describing
 * the promotion. Socket emission happens after the transaction commits.
 */
export async function applyPromotion(providerId, client = prisma) {
  const provider = await client.provider.findUnique({
    where: { id: providerId },
    select: { id: true, providerLevel: true, jobsCompleted: true, userId: true }
  });
  if (!provider) return null;

  const targetLevel = await getProviderLevelForJobs(provider.jobsCompleted, client);
  if (targetLevel === provider.providerLevel) return null;

  await client.provider.update({
    where: { id: providerId },
    data: { providerLevel: targetLevel, promotionDate: new Date() }
  });

  const [promotion] = await Promise.all([
    client.promotionHistory.create({
      data: {
        providerId,
        fromLevel: provider.providerLevel,
        toLevel: targetLevel,
        completedJobsAtPromotion: provider.jobsCompleted
      }
    }),
    client.providerLevelHistory.create({
      data: {
        providerId,
        level: targetLevel,
        previousLevel: provider.providerLevel,
        reason: 'PROMOTION',
        completedJobs: provider.jobsCompleted
      }
    })
  ]);

  await createNotification(
    provider.userId,
    `Congratulations! You reached ${targetLevel}`,
    `You have been promoted from ${provider.providerLevel} to ${targetLevel} after ${provider.jobsCompleted} completed jobs.`,
    'PROMOTION'
  );

  return {
    fromLevel: provider.providerLevel,
    toLevel: targetLevel,
    completedJobsAtPromotion: provider.jobsCompleted,
    promotedAt: promotion.promotedAt,
    providerUserId: provider.userId
  };
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
