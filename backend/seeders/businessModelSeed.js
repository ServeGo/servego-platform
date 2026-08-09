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
  // Lead distribution
  { key: 'leadTimeoutSeconds', value: 86400, description: 'Seconds a provider has to accept/reject a lead before it expires (86400 = 24 hours).' },
  { key: 'maxRedistributionAttempts', value: 10, description: 'Maximum Lead Retry Count — how many ranked providers a lead is offered to before the customer is notified.' },
  { key: 'leadExpiryEnabled', value: true, description: 'Master switch for the provider response timer.' },

  // Radius (mandatory when coordinates are available)
  { key: 'defaultProviderRadiusKm', value: 50, description: 'Admin Default Radius used when a provider has not set their custom max service radius.' },

  // Money
  { key: 'commissionPercent', value: 10, description: 'Legacy provider-side platform charge (%). Kept as a fallback for providerPlatformChargePercent.' },
  { key: 'platformChargeType', value: 'PERCENTAGE', description: 'Platform charge mode applied to all users: PERCENTAGE or FLAT.' },
  { key: 'customerPlatformChargePercent', value: 5, description: 'Customer-side platform charge (%) added on top of the booking amount.' },
  { key: 'providerPlatformChargePercent', value: 10, description: 'Provider-side platform charge (%) deducted from the booking amount (platform commission).' },
  { key: 'customerPlatformChargeFlat', value: 0, description: 'Customer-side platform charge (flat ₹) when platformChargeType = FLAT.' },
  { key: 'providerPlatformChargeFlat', value: 0, description: 'Provider-side platform charge (flat ₹) when platformChargeType = FLAT.' },

  // Subscription / free leads
  { key: 'freeLeadCount', value: 1, description: 'Free leads granted to a newly approved provider (given only once).' },
  { key: 'leadCountPerSubscription', value: 3, description: 'Leads granted per purchased subscription level.' },

  // Cancellation penalty (penalty score model)
  { key: 'cancellationPenaltyScore', value: 30, description: 'Penalty Score added per provider-initiated cancellation.' },
  { key: 'cancellationPenaltyThreshold', value: 60, description: 'Accumulated penalty score that triggers a cooldown pause.' },
  { key: 'cancellationWindowDays', value: 30, description: 'Rolling window (days) used to count repeated cancellations.' },
  { key: 'cooldownDurationHours', value: 24, description: 'Hours a provider is disabled from receiving leads after the penalty threshold is crossed.' },
  { key: 'cooldownPenalty', value: 'TEMP_DISABLE', description: 'Penalty applied on repeated cancellations.' },

  // Late arrival
  { key: 'lateArrivalGraceMinutes', value: 15, description: 'Grace period (minutes) after the scheduled start before a provider is marked late.' },

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

  // Categories
  { key: 'premiumCategories', value: [], description: 'Service categories reserved for Premium-sector providers (matched by normalized name).' },
  { key: 'generalCategories', value: [], description: 'Service categories open to General-sector providers (defaults to every category not in premiumCategories).' },

  // Ranking
  { key: 'rankingWeights', value: { distanceKm: 0.25, rating: 0.2, providerLevel: 0.15, acceptanceRate: 0.1, cancellationRate: 0.08, responseRate: 0.08, experienceYears: 0.06, reviewCount: 0.05, serviceFee: 0.03 }, description: 'Ranking weights used to compute a provider rank score (tie-breaker model; live matching keeps the fixed priority order).' },

  // Feature flags (admin toggles, effective within 30s — no redeploy).
  // Source of truth for definitions/descriptions: services/featureFlagsService.js
  { key: 'premiumCategoriesEnabled', value: true, description: 'When on, categories in premiumCategories are served only by Premium-sector providers.' },
  { key: 'discountEnabled', value: true, description: 'When off, provider level discounts are not applied to subscription purchases.' },
  { key: 'referralEnabled', value: true, description: 'When off, applying referral codes is blocked and no referral bonus is awarded.' },
  { key: 'referralBonusAmount', value: 250, description: 'Referral bonus (₹) credited to the applicant when a referral code is applied.' },
  { key: 'maintenanceMode', value: false, description: 'When on, the public API returns 503 (admin routes, login and feature flags stay up).' },
  { key: 'newFeatureEnabled', value: false, description: 'When on, the newest release is announced to users (dashboard banner).' },

  // Database backup scheduler (services/backupService.js)
  { key: 'backupScheduleEnabled', value: true, description: 'Master switch for automatic daily/weekly logical backups.' },
  { key: 'backupDailyTimeUtc', value: '02:00', description: 'Daily backup time in UTC (HH:MM, 24h).' },
  { key: 'backupWeeklyDay', value: 0, description: 'Weekly backup day of week, 0 = Sunday … 6 = Saturday (UTC).' },
  { key: 'backupRetentionCount', value: 14, description: 'Number of most recent backups to keep on disk (older snapshots are pruned automatically).' }
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
    'allowLeadPurchaseBelowMinRating'
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

  const freeLeadCountConfig = await client.adminConfig.findUnique({ where: { key: 'freeLeadCount' } });
  const freeLeadCount = Number(freeLeadCountConfig?.value ?? 1) || 1;

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
