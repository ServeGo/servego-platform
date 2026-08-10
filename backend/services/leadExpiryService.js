import prisma from '../prisma/client.js';
import { buildLeadPayload } from './leadService.js';
import { notifyAdminLeadUnanswered } from './notificationService.js';

const timers = new Map();

export function cancelLeadExpiry(leadId) {
  const timer = timers.get(leadId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(leadId);
  }
}

/**
 * (Re)arm the per-lead admin-alert timer. Idempotent per lead id.
 *
 * Leads no longer expire. `expiryTime` is the moment the lead has waited the
 * fixed 24-hour response window (`leadTimeoutSeconds` = 86400) without any
 * provider accepting; when it elapses the admin is alerted and the lead stays
 * open (NEW/VIEWED) until a provider accepts, every eligible provider rejects,
 * or an admin handles it.
 */
export function scheduleLeadExpiry(lead, io) {
  cancelLeadExpiry(lead.id);
  if (!lead?.expiryTime) return;

  const ms = new Date(lead.expiryTime).getTime() - Date.now();
  if (ms <= 0) {
    timers.delete(lead.id);
    handleLeadTimeout(lead.id, io).catch((err) =>
      console.error(`[LeadAlert] Failed to alert admin for lead ${lead.id}:`, err.message)
    );
    return;
  }

  const timer = setTimeout(() => {
    timers.delete(lead.id);
    handleLeadTimeout(lead.id, io).catch((err) =>
      console.error(`[LeadAlert] Failed to alert admin for lead ${lead.id}:`, err.message)
    );
  }, ms);

  timers.set(lead.id, timer);
}

/**
 * The response window elapsed with no provider accepting. The lead is NOT
 * expired — it stays open — and the admin is notified to review it. The alert
 * fires once per lead (guarded by `adminAlertedAt`).
 */
async function handleLeadTimeout(leadId, io) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || !['NEW', 'VIEWED'].includes(lead.status)) return;
  if (lead.adminAlertedAt) return;

  await prisma.lead.update({
    where: { id: leadId },
    data: { adminAlertedAt: new Date(), expiryTime: null }
  });

  const fresh = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      booking: { include: { customer: { select: { id: true, name: true, phone: true, avatar: true } } } },
      provider: { include: { user: { select: { id: true, name: true } } } }
    }
  });
  const payload = buildLeadPayload(fresh, fresh?.booking, fresh?.provider);

  await notifyAdminLeadUnanswered(io, payload);
}

/**
 * Startup sweep — re-arm alert timers for leads still awaiting a response
 * (covers process restarts). Returns the number of timers scheduled.
 */
export async function scheduleAllLeadTimers(io) {
  const activeLeads = await prisma.lead.findMany({
    where: {
      status: { in: ['NEW', 'VIEWED'] },
      expiryTime: { not: null },
      adminAlertedAt: null
    },
    select: { id: true, expiryTime: true }
  });
  for (const lead of activeLeads) {
    scheduleLeadExpiry(lead, io);
  }
  if (activeLeads.length) {
    console.log(`[LeadAlert] Scheduled ${activeLeads.length} active lead alert timer(s)`);
  }
  return activeLeads.length;
}
