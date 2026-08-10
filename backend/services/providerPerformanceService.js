import prisma from '../prisma/client.js';
import { getConfig } from './adminConfigService.js';

function round2(value) {
  return Number((value || 0).toFixed(2));
}

export async function ensurePerformance(providerId, client = prisma) {
  const existing = await client.providerPerformance.findUnique({ where: { providerId } });
  if (existing) return existing;
  return client.providerPerformance.upsert({
    where: { providerId },
    update: {},
    create: { providerId }
  });
}

function recomputeRates(row) {
  const total = Math.max(0, Number(row.totalLeads) || 0);
  const responded = (Number(row.acceptedLeads) || 0) + (Number(row.rejectedLeads) || 0);
  const concluded = (Number(row.completedJobs) || 0) + (Number(row.cancelledJobs) || 0);
  const started = Math.max(0, Number(row.jobsStarted) || 0);
  return {
    acceptanceRate: total ? round2(Number(row.acceptedLeads) / total) : 0,
    responseRate: total ? round2(responded / total) : 0,
    cancellationRate: concluded ? round2(Number(row.cancelledJobs) / concluded) : 0,
    lateArrivalRate: started ? round2(Number(row.lateArrivalCount) / started) : 0
  };
}

export async function recordLeadOffered(providerId, client = prisma) {
  // Single round trip instead of ensurePerformance (find/upsert) + update so a
  // broadcast to many providers does not multiply round trips on high-latency
  // connections.
  return client.providerPerformance.upsert({
    where: { providerId },
    update: { totalLeads: { increment: 1 } },
    create: { providerId, totalLeads: 1 }
  });
}

export async function recordLeadAccepted(providerId, responseTimeMs, client = prisma) {
  const perf = await ensurePerformance(providerId, client);
  const avgMs = (() => {
    const prev = Number(perf.averageResponseTimeMs) || 0;
    const prevCount = Math.max(0, Number(perf.acceptedLeads) || 0);
    if (!prevCount) return Math.max(0, Number(responseTimeMs) || 0);
    return (prev * prevCount + Math.max(0, Number(responseTimeMs) || 0)) / (prevCount + 1);
  })();
  const updated = await client.providerPerformance.update({
    where: { id: perf.id },
    data: {
      acceptedLeads: { increment: 1 },
      averageResponseTimeMs: round2(avgMs)
    }
  });
  const rates = recomputeRates(updated);
  return client.providerPerformance.update({
    where: { id: perf.id },
    data: rates
  });
}

export async function recordLeadRejected(providerId, client = prisma) {
  const perf = await ensurePerformance(providerId, client);
  const updated = await client.providerPerformance.update({
    where: { id: perf.id },
    data: { rejectedLeads: { increment: 1 } }
  });
  const rates = recomputeRates(updated);
  return client.providerPerformance.update({
    where: { id: perf.id },
    data: rates
  });
}

export async function recordLeadIgnored(providerId, client = prisma) {
  // Single upsert: no rates depend on `ignoredLeads`, so there is no recompute
  // step and no separate read-then-write pair.
  return client.providerPerformance.upsert({
    where: { providerId },
    update: { ignoredLeads: { increment: 1 } },
    create: { providerId, ignoredLeads: 1 }
  });
}

export async function recordLeadExpired(providerId, client = prisma) {
  // Single upsert: recomputeRates never reads `expiredLeads`, so the old
  // read + update + recompute triple collapses to one round trip.
  return client.providerPerformance.upsert({
    where: { providerId },
    update: { expiredLeads: { increment: 1 } },
    create: { providerId, expiredLeads: 1 }
  });
}

/**
 * Provider marks the job as started (CONFIRMED → ONGOING). Records the start so
 * job completion time and late-arrival rate can be tracked.
 */
export async function recordJobStarted(providerId, client = prisma) {
  const perf = await ensurePerformance(providerId, client);
  return client.providerPerformance.update({
    where: { id: perf.id },
    data: { jobsStarted: { increment: 1 } }
  });
}

/** Provider arrived late (past the grace window) — tracked for late-arrival %. */
export async function recordLateArrival(providerId, client = prisma) {
  const perf = await ensurePerformance(providerId, client);
  const updated = await client.providerPerformance.update({
    where: { id: perf.id },
    data: { lateArrivalCount: { increment: 1 } }
  });
  const rates = recomputeRates(updated);
  return client.providerPerformance.update({
    where: { id: perf.id },
    data: rates
  });
}

/**
 * After a booking is COMPLETED: credit earnings net of platform commission and
 * fold the job duration into the provider's average job completion time.
 */
export async function recordJobCompleted(providerId, amount, commission, { jobDurationMs = null, client = prisma } = {}) {
  const perf = await ensurePerformance(providerId, client);
  const netEarnings = Math.max(0, (Number(amount) || 0) - (Number(commission) || 0));
  const duration = Math.max(0, Number(jobDurationMs) || 0);
  const avgMs = (() => {
    const prev = Number(perf.averageJobCompletionTimeMs) || 0;
    const prevCount = Math.max(0, Number(perf.completedJobs) || 0);
    if (!duration) return round2(prev);
    if (!prevCount) return round2(duration);
    return round2((prev * prevCount + duration) / (prevCount + 1));
  })();
  const updated = await client.providerPerformance.update({
    where: { id: perf.id },
    data: {
      completedJobs: { increment: 1 },
      totalEarnings: { increment: round2(netEarnings) },
      totalCommission: { increment: round2(Number(commission) || 0) },
      averageJobCompletionTimeMs: avgMs
    }
  });
  const rates = recomputeRates(updated);
  return client.providerPerformance.update({
    where: { id: perf.id },
    data: rates
  });
}

/**
 * After a provider cancellation: persist the reason, increment the counter,
 * accumulate the admin-configured penalty score and enforce the cooldown when
 * the penalty threshold is crossed. Returns cooldown info.
 */
export async function recordJobCancelled(providerId, userId, reason, { bookingId = null, leadId = null, detail = null, client = prisma } = {}) {
  const perf = await ensurePerformance(providerId, client);

  await client.cancellationReason.create({
    data: {
      bookingId,
      leadId,
      actor: 'PROVIDER',
      actorId: userId,
      reason: String(reason || '').trim() || 'Not specified',
      detail: detail || null
    }
  });

  const updated = await client.providerPerformance.update({
    where: { id: perf.id },
    data: { cancelledJobs: { increment: 1 } }
  });
  const rates = recomputeRates(updated);
  await client.providerPerformance.update({ where: { id: perf.id }, data: rates });

  const penaltyScore = Number(await getConfig('cancellationPenaltyScore', 30, client)) || 30;
  const penaltyThreshold = 60;
  const windowDays = 30;
  const cooldownHours = 24;

  const windowStart = new Date(Date.now() - Number(windowDays) * 24 * 60 * 60 * 1000);
  const cancellationsInWindow = await client.cancellationReason.count({
    where: {
      actor: 'PROVIDER',
      actorId: userId,
      createdAt: { gte: windowStart }
    }
  });

  const newPenalty = Number(perf.penaltyScore || 0) + Math.max(0, Number(penaltyScore) || 30);

  let cooldownTriggered = false;
  let cooldownUntil = null;
  if (newPenalty >= Math.max(1, Number(penaltyThreshold) || 60)) {
    cooldownUntil = new Date(Date.now() + Number(cooldownHours) * 60 * 60 * 1000);
    await client.providerPerformance.update({
      where: { id: perf.id },
      data: {
        penaltyScore: newPenalty,
        cooldownUntil,
        cooldownCount: { increment: 1 }
      }
    });
    cooldownTriggered = true;
  } else {
    await client.providerPerformance.update({
      where: { id: perf.id },
      data: { penaltyScore: newPenalty }
    });
  }

  return {
    cancelledJobs: Number(updated.cancelledJobs) + 1,
    cancellationsInWindow,
    penaltyScore: newPenalty,
    cooldownTriggered,
    cooldownUntil
  };
}

export async function clearCooldown(providerId, client = prisma) {
  return client.providerPerformance.updateMany({
    where: { providerId },
    data: { cooldownUntil: null }
  });
}

export async function getPerformance(providerId, client = prisma) {
  return client.providerPerformance.findUnique({ where: { providerId } });
}
