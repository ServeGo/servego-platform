import prisma from '../prisma/client.js';
import { redistributeLead, buildLeadPayload } from './leadService.js';
import { recordLeadExpired, recordLeadIgnored } from './providerPerformanceService.js';
import {
  notifyLeadExpired,
  notifyLeadTransferred,
  notifyLeadRejected,
  notifyAdminLeadUnanswered
} from './notificationService.js';

const timers = new Map();

export function cancelLeadExpiry(leadId) {
  const timer = timers.get(leadId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(leadId);
  }
}

/** (Re)arm the per-lead response timer. Idempotent per lead id. */
export function scheduleLeadExpiry(lead, io) {
  cancelLeadExpiry(lead.id);
  if (!lead?.expiryTime) return;

  const ms = new Date(lead.expiryTime).getTime() - Date.now();
  if (ms <= 0) {
    timers.delete(lead.id);
    handleLeadTimeout(lead.id, io).catch((err) =>
      console.error(`[LeadExpiry] Failed to handle expired lead ${lead.id}:`, err.message)
    );
    return;
  }

  const timer = setTimeout(() => {
    timers.delete(lead.id);
    handleLeadTimeout(lead.id, io).catch((err) =>
      console.error(`[LeadExpiry] Failed to handle expired lead ${lead.id}:`, err.message)
    );
  }, ms);

  timers.set(lead.id, timer);
}

/**
 * The response window closed without any provider accepting. Because offers are
 * broadcast (every eligible provider is offered at once, sharing one
 * `expiryTime`), every open offer expires together. Any provider who still had
 * an open offer gets an expired/ignored performance record; a genuinely new
 * provider (eligible but never offered, e.g. came online later) may still be
 * reassigned, otherwise the lead is settled and the booking cancelled.
 */
async function handleLeadTimeout(leadId, io) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || !['NEW', 'VIEWED'].includes(lead.status)) return;

  const result = await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id: leadId }, data: { status: 'EXPIRED' } });

    const openOffers = await tx.leadAssignmentHistory.findMany({
      where: { leadId, isCurrent: true },
      select: { providerId: true }
    });
    await tx.leadAssignmentHistory.updateMany({
      where: { leadId, isCurrent: true },
      data: { status: 'EXPIRED', isCurrent: false, actionAt: new Date() }
    });

    const offeredProviderIds = [...new Set(openOffers.map((o) => o.providerId).filter(Boolean))];

    return {
      offeredProviderIds,
      ...(await redistributeLead({ leadId, reason: 'EXPIRED', client: tx, cancelBookingOnSettle: false }))
    };
  }, { maxWait: 20000, timeout: 30000 });

  // Performance counters are pure side effects — record them after the
  // transaction commits. Serial writes here (one provider at a time) would
  // stall the timer on high-latency connections; the writes are independent,
  // so fire them together.
  await Promise.all(
    result.offeredProviderIds.flatMap((providerId) => [
      recordLeadExpired(providerId),
      recordLeadIgnored(providerId)
    ])
  );

  const fresh = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      booking: { include: { customer: { select: { id: true, name: true, phone: true, avatar: true } } } },
      provider: { include: { user: { select: { id: true, name: true } } } }
    }
  });
  const payload = buildLeadPayload(fresh, fresh?.booking, fresh?.provider);
  const customerId = fresh?.booking?.customerId || fresh?.customerId;

  await Promise.all(
    result.offeredProviderIds.map(async (providerId) => {
      const offered = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { userId: true }
      });
      if (offered?.userId) await notifyLeadExpired(io, offered.userId, payload);
    })
  );

  if (result.reassigned && result.nextProvider) {
    await notifyLeadTransferred(io, result.nextProvider.user?.id, payload);
    if (customerId) await notifyLeadRejected(io, customerId, payload);
  } else if (result.settled) {
    // 24-hour response window elapsed with no provider accepting. The booking
    // stays PENDING (no auto-cancel) and the admin is notified to review it.
    await notifyAdminLeadUnanswered(io, payload);
  }
}

/**
 * Startup sweep — re-arm timers for leads that are still awaiting a response
 * (covers process restarts). Returns the number of timers scheduled.
 */
export async function scheduleAllLeadTimers(io) {
  const activeLeads = await prisma.lead.findMany({
    where: { status: { in: ['NEW', 'VIEWED'] }, expiryTime: { not: null } },
    select: { id: true, expiryTime: true }
  });
  for (const lead of activeLeads) {
    scheduleLeadExpiry(lead, io);
  }
  if (activeLeads.length) {
    console.log(`[LeadExpiry] Scheduled ${activeLeads.length} active lead timer(s)`);
  }
  return activeLeads.length;
}
