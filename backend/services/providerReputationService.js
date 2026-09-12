import prisma from '../prisma/client.js';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function calculateVerificationLevel(provider) {
  if (!provider?.isVerified) return 'BRONZE';

  if (
    provider.jobsCompleted >= 100 &&
    provider.rating >= 4.8 &&
    provider.reviewCount >= 50
  ) {
    return 'ELITE';
  }

  if (
    provider.jobsCompleted >= 50 &&
    provider.rating >= 4.5 &&
    provider.reviewCount >= 20
  ) {
    return 'GOLD';
  }

  if (provider.jobsCompleted >= 10 && provider.rating >= 4.0) {
    return 'SILVER';
  }

  return 'BRONZE';
}

function getStatusTimestamp(booking, targetStatus) {
  const history = Array.isArray(booking.statusHistory) ? booking.statusHistory : [];
  const event = history.find((item) => item?.status === targetStatus);
  return event?.timestamp ? new Date(event.timestamp) : null;
}

function hasFastAverageResponse(bookings) {
  const responseTimes = bookings
    .map((booking) => {
      const acceptedAt = getStatusTimestamp(booking, 'CONFIRMED');
      if (!acceptedAt || Number.isNaN(acceptedAt.getTime())) return null;

      const createdAt = booking.createdAt ? new Date(booking.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) return null;

      return acceptedAt.getTime() - createdAt.getTime();
    })
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (!responseTimes.length) return false;

  const average = responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length;
  return average < FIVE_MINUTES_MS;
}

function hasReliableBookingHistory(bookings) {
  const lastThirty = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);

  return lastThirty.length >= 30 && lastThirty.every((booking) => booking.status !== 'CANCELLED');
}

function countRepeatCustomers(bookings) {
  const completedCounts = new Map();

  for (const booking of bookings) {
    if (booking.status !== 'COMPLETED') continue;
    completedCounts.set(booking.customerId, (completedCounts.get(booking.customerId) || 0) + 1);
  }

  return Array.from(completedCounts.values()).filter((count) => count > 1).length;
}

function calculateBadgeTypes({ provider, bookings, approvedServiceCount }) {
  const badges = new Set();

  if (provider.rating >= 4.8 && provider.reviewCount >= 20) badges.add('TOP_RATED');
  if (hasFastAverageResponse(bookings)) badges.add('FAST_RESPONSE');
  if (provider.jobsCompleted >= 100) badges.add('JOBS_100');
  if (hasReliableBookingHistory(bookings)) badges.add('RELIABLE_PROVIDER');
  if (approvedServiceCount >= 5) badges.add('MULTI_SERVICE_EXPERT');
  if (countRepeatCustomers(bookings) >= 50) badges.add('CUSTOMER_FAVORITE');
  if (provider.verificationLevel === 'ELITE') badges.add('ELITE_PROVIDER');

  return Array.from(badges);
}

export async function refreshProviderReputation(providerId, client = prisma) {
  if (!providerId) return null;

  const provider = await client.provider.findUnique({
    where: { id: providerId },
    include: {
      reviews: true,
      bookings: {
        select: {
          id: true,
          customerId: true,
          status: true,
          statusHistory: true,
          createdAt: true
        }
      },
      providerServices: {
        select: { serviceId: true }
      }
    }
  });

  if (!provider) return null;

  const reviewCount = provider.reviews.length;
  const rating = reviewCount
    ? Number((provider.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount).toFixed(1))
    : 0;
  const jobsCompleted = provider.bookings.filter((booking) => booking.status === 'COMPLETED').length;

  const nextProvider = {
    ...provider,
    rating,
    reviewCount,
    jobsCompleted
  };

  const verificationLevel = calculateVerificationLevel(nextProvider);
  nextProvider.verificationLevel = verificationLevel;

  const badgeTypes = calculateBadgeTypes({
    provider: nextProvider,
    bookings: provider.bookings,
    approvedServiceCount: new Set(provider.providerServices.map((service) => service.serviceId)).size
  });

  const updatedProvider = await client.provider.update({
    where: { id: providerId },
    data: {
      rating,
      reviewCount,
      jobsCompleted,
      verificationLevel
    }
  });

  const existingBadges = await client.providerBadge.findMany({
    where: { providerId },
    select: { badgeType: true }
  });
  const existingTypes = new Set(existingBadges.map((badge) => badge.badgeType));
  const nextTypes = new Set(badgeTypes);

  const toCreate = badgeTypes.filter((badgeType) => !existingTypes.has(badgeType));
  const toDelete = Array.from(existingTypes).filter((badgeType) => !nextTypes.has(badgeType));

  if (toCreate.length) {
    await client.providerBadge.createMany({
      data: toCreate.map((badgeType) => ({ providerId, badgeType })),
      skipDuplicates: true
    });
  }

  if (toDelete.length) {
    await client.providerBadge.deleteMany({
      where: {
        providerId,
        badgeType: { in: toDelete }
      }
    });
  }

  return updatedProvider;
}

export async function refreshAllProviderReputations(client = prisma) {
  const providers = await client.provider.findMany({
    select: { id: true }
  });

  // Chunked concurrency: refreshProviderReputation runs 4-6 queries per row,
  // so a serial loop over every provider would be 4-6×N sequential round trips
  // on one admin request. Running the whole table at once would exhaust the
  // connection pool — process it in bounded parallel batches instead.
  const results = [];
  const CONCURRENCY = 25;
  for (let i = 0; i < providers.length; i += CONCURRENCY) {
    const chunk = providers.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(chunk.map((p) => refreshProviderReputation(p.id, client)))));
  }

  return results;
}
