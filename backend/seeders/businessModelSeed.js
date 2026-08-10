import prisma from '../prisma/client.js';

export const PROVIDER_LEVEL_DEFAULTS = [
  { level: 'BRONZE', minJobs: 0, discountPercent: 0, description: 'Every verified provider starts at Bronze.' },
  { level: 'SILVER', minJobs: 5, discountPercent: 5, description: 'Reach Silver after 5 completed jobs.' },
  { level: 'GOLD', minJobs: 15, discountPercent: 10, description: 'Reach Gold after 15 completed jobs.' },
  { level: 'PLATINUM', minJobs: 45, discountPercent: 15, description: 'Reach Platinum after 45 completed jobs.' },
  { level: 'DIAMOND', minJobs: 60, discountPercent: 20, description: 'Reach Diamond after 60 completed jobs.' }
];

export const SUBSCRIPTION_PLAN_DEFAULTS = [
  { level: 0, name: 'Free Lead', price: 0, leadCount: 1, sector: 'GENERAL', isFree: true, description: 'One free booking lead granted on provider approval.' },
  { level: 1, name: 'Subscription Level 1', price: 99, leadCount: 3, sector: 'PREMIUM', isFree: false, description: '3 booking leads + Premium sector access.' },
  { level: 2, name: 'Subscription Level 2', price: 189, leadCount: 3, sector: 'PREMIUM', isFree: false, description: '3 booking leads + Premium sector access.' },
  { level: 3, name: 'Subscription Level 3', price: 269, leadCount: 3, sector: 'PREMIUM', isFree: false, description: '3 booking leads + Premium sector access.' },
  { level: 4, name: 'Subscription Level 4', price: 339, leadCount: 3, sector: 'PREMIUM', isFree: false, description: '3 booking leads + Premium sector access.' },
  { level: 5, name: 'Subscription Level 5', price: 399, leadCount: 3, sector: 'PREMIUM', isFree: false, description: '3 booking leads + Premium sector access.' }
];

export const ADMIN_CONFIG_DEFAULTS = [
  // Monthly platform fee (replaces per-booking commission). Providers must
  // keep this paid to receive leads; customers are reminded but never blocked.
  { key: 'platformFeeEnabled', value: true, description: 'Master switch for the monthly platform fee.' },
  { key: 'platformFeeAmount', value: 99, description: 'Monthly platform fee (₹) charged to providers; overdue providers stop receiving leads.' },
  { key: 'platformFeeGraceDays', value: 30, description: 'Days a provider gets after joining before the first platform fee payment is due.' },
  { key: 'customerPlatformFeeEnabled', value: true, description: 'Master switch for the customer platform fee (reminders only, never blocks access).' },
  { key: 'customerPlatformFeeAmount', value: 49, description: 'Monthly platform fee (₹) charged to customers; reminders only.' },

  // Cancellation penalty (penalty score model) — only providers who accept a
  // booking and then cancel are penalised.
  { key: 'cancellationPenaltyScore', value: 30, description: 'Penalty Score added per provider-initiated cancellation (accept-then-cancel only).' },

  // Real-time location tracking
  { key: 'locationTrackingEnabled', value: true, description: 'Master switch for live provider location sharing on active bookings.' },
  { key: 'etaBaseSpeedKph', value: 30, description: 'Average provider travel speed (km/h) used to estimate arrival time from straight-line distance.' },
  { key: 'locationUpdateMinIntervalSeconds', value: 3, description: 'Minimum interval (seconds) between persisted location pings per booking.' },
  { key: 'locationHistoryClearanceHours', value: 24, description: 'Location ping history retention window (hours); older pings are pruned after a booking closes.' },

  // Wallet
  { key: 'walletEnabled', value: true, description: 'Master switch for the credits wallet (provider earnings, referral bonuses, refunds).' },
  { key: 'walletMinimumWithdrawal', value: 100, description: 'Minimum amount (₹) a provider can request in a single payout.' },
  { key: 'walletMaximumWithdrawal', value: 0, description: 'Maximum amount (₹) per payout request; 0 = unlimited.' },
  { key: 'walletWithdrawalNote', value: 'Payouts are processed within 24-48 hours after admin approval.', description: 'Info note shown on the provider withdrawal form.' },

  // Referrals
  { key: 'referralBonusAmount', value: 250, description: 'Referral bonus (₹) credited to a new user when a referral code is applied.' },

  // Platform controls (admin Settings): maintenance + feature flags
  { key: 'maintenanceMode', value: false, description: 'When on, the public API returns 503 (admin routes, login and feature-flag reads stay up).' },
  { key: 'newFeatureEnabled', value: false, description: 'Show the "what\u2019s new" announcement banner to the selected audience.' },
  { key: 'newFeatureAudience', value: 'customer', description: 'Who sees the announcement: customer or provider.' },
  { key: 'newFeatureText', value: '', description: 'The announcement banner message.' },
  { key: 'newFeatureValidUntil', value: '', description: 'Announcement expiry (ISO); managed by the feature-flag service (24h window).' }
];

export async function seedBusinessModelIfEmpty() {
  const [rules, plans, configs] = await Promise.all([
    prisma.providerLevelRule.count(),
    prisma.subscriptionPlan.count(),
    prisma.adminConfig.count()
  ]);

  if (rules === 0) {
    await prisma.providerLevelRule.createMany({
      data: PROVIDER_LEVEL_DEFAULTS,
      skipDuplicates: true
    });
    console.log(`✅ Seeded ${PROVIDER_LEVEL_DEFAULTS.length} provider level rules`);
  }

  if (plans === 0) {
    await prisma.subscriptionPlan.createMany({
      data: SUBSCRIPTION_PLAN_DEFAULTS,
      skipDuplicates: true
    });
    console.log(`✅ Seeded ${SUBSCRIPTION_PLAN_DEFAULTS.length} subscription plans`);
  }

  // Idempotently add any new config keys while preserving admin-set values.
  const seeded = await prisma.adminConfig.createMany({
    data: ADMIN_CONFIG_DEFAULTS.map(({ key, value, description }) => ({ key, value, description })),
    skipDuplicates: true
  });
  if (seeded.count > 0) {
    console.log(`✅ Added ${seeded.count} new admin config key(s)`);
  } else if (configs === 0) {
    console.log(`✅ Seeded ${ADMIN_CONFIG_DEFAULTS.length} admin config keys`);
  }

  // Remove legacy keys replaced by the current business rules.
  const OBSOLETE_KEYS = [
    'radiusFilterEnabled',
    'providerRadiusKm',
    'cancellationThreshold',
    'maxLeadAcceptWindowMinutes',
    'serviceFeeRatePercent',
    'leadPriceDefault',
    'leadPriceMultiplierStep',
    'minProviderRatingForLeads',
    'minProviderBookingsForLeads',
    'minProviderExperienceForLeads',
    'maxActiveLeadsPerProvider',
    'enableLeadPurchases',
    'allowLeadPurchaseBelowMinRating',
    // Per-booking platform charges replaced by the monthly platform fee model.
    'commissionPercent',
    'platformChargeType',
    'customerPlatformChargePercent',
    'providerPlatformChargePercent',
    'customerPlatformChargeFlat',
    'providerPlatformChargeFlat',
    // Lead expiry / redistribution caps removed — leads no longer expire and
    // the admin is alerted instead; redistribution is unlimited.
    'leadExpiryEnabled',
    'maxRedistributionAttempts',
    // Lead response window removed from admin config — timeout is fixed at 24h.
    'leadTimeoutSeconds',
    // Default radius removed from admin config — providers must set their own
    // radius; a 50 km fallback applies when they have not.
    'defaultProviderRadiusKm',
    // Penalty / cooldown tuning removed from admin config — fixed thresholds.
    'cancellationPenaltyThreshold',
    'cancellationWindowDays',
    'cooldownDurationHours',
    // Premium/general category lists removed — sector gating disabled; matching
    // uses the fixed priority order (ranking weights were cosmetic).
    'premiumCategories',
    'generalCategories',
    'rankingWeights',
    // Free-lead / lead-count keys removed from admin config (free lead is fixed
    // at 1 and lead counts come from the subscription plans).
    'freeLeadCount',
    'leadCountPerSubscription',
    // Dead keys.
    'cooldownPenalty',
    'lateArrivalGraceMinutes',
    // Feature-flag keys removed with the Feature Flags subsystem. The premium
    // category and referral restrictions are now always active.
    'premiumCategoriesEnabled',
    'referralEnabled',
    'discountEnabled',
    'levelDiscountsEnabled',
    'releaseBannerEnabled',
    // Legacy per-audience announcement keys replaced by the unified feature
    // flags (newFeatureEnabled / newFeatureAudience / newFeatureText).
    'customerAnnouncementEnabled',
    'customerAnnouncementText',
    'providerAnnouncementEnabled',
    'providerAnnouncementText',
    // Backup feature removed entirely — retire its config keys.
    'backupDailyTimeUtc',
    'backupWeeklyTimeUtc',
    'backupWeeklyDay',
    'backupScheduleEnabled',
    'backupRetentionCount'
  ];
  const removed = await prisma.adminConfig.deleteMany({ where: { key: { in: OBSOLETE_KEYS } } });
  if (removed.count > 0) {
    console.log(`🗑 Removed ${removed.count} obsolete admin config key(s)`);
  }

  // Backfill subscriptions for providers that predate the business model.
  const providers = await prisma.provider.findMany({
    where: { subscription: { is: null } },
    select: { id: true }
  });
  for (const provider of providers) {
    await ensureProviderSubscription(provider.id);
  }
  if (providers.length) {
    console.log(`✅ Initialized ${providers.length} provider subscription(s)`);
  }
}

/**
 * Idempotently ensure a provider has its current ProviderSubscription row.
 * New providers start at Subscription Level 0 with their free lead.
 */
export async function ensureProviderSubscription(providerId, client = prisma) {
  const existing = await client.providerSubscription.findUnique({ where: { providerId } });
  if (existing) return existing;

  const freeLeadCount = 1;

  return client.providerSubscription.create({
    data: {
      providerId,
      level: 0,
      status: 'ACTIVE',
      remainingLeads: freeLeadCount,
      leadCount: freeLeadCount,
      completedJobsCurrentSubscription: 0,
      sector: 'GENERAL',
      freeLeadUsed: false,
      paymentStatus: 'PAID',
      activatedAt: new Date()
    }
  });
}

export function getProviderLevelForJobs(completedJobs) {
  const jobs = Math.max(0, Number(completedJobs) || 0);
  const sorted = [...PROVIDER_LEVEL_DEFAULTS].sort((a, b) => a.minJobs - b.minJobs);
  let level = 'BRONZE';
  for (const rule of sorted) {
    if (jobs >= rule.minJobs) level = rule.level;
  }
  return level;
}
