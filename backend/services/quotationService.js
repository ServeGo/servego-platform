import prisma from '../prisma/client.js';
import { getConfig } from './adminConfigService.js';
import { debitWallet, debitWalletAllowNegative, creditWallet } from './walletService.js';
import { startBookingWork, findEligibleProviders, cancelOpenOffers } from './leadService.js';
import { recordLeadsOffered } from './providerPerformanceService.js';
import { buildStatusHistory, normalizeBookingStatus } from '../utils/workflow.js';
import { appendStatusHistory } from '../utils/statusHistory.js';

/** Run `fn` inside a transaction unless the caller already provided a transaction client. */
async function withClientTransaction(client, fn, { maxRetries = 2 } = {}) {
  if (client !== prisma) return fn(client);
  const run = () => prisma.$transaction(fn, { isolationLevel: 'Serializable', maxWait: 20000, timeout: 30000 });
  let attempt = 0;
  for (;;) {
    try {
      return await run();
    } catch (err) {
      const code = err?.code;
      const message = err?.message || '';
      const isSerialization = code === 'P2034' || code === 'P2010' ||
        /serialization failure|deadlock detected|could not serialize access/i.test(message);
      if (isSerialization && attempt < maxRetries) {
        attempt += 1;
        await new Promise((res) => setTimeout(res, 150 * attempt));
        continue;
      }
      throw err;
    }
  }
}

function serviceError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

export function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Commission tiers (platform share of the quotation total). Admin-configurable
 * via AdminConfig key `commissionTiers` — an array of
 * `{ min, max, rate }` buckets; `max` is the inclusive upper bound of the
 * bucket and the last bucket may omit `max`. Default:
 *   0 – 5000 → 15%    5000 – 10000 → 17.5%    10000 – 20000 → 20%    20000+ → 22.5%
 */
export async function getCommissionTiers(client = prisma) {
  const tiers = await getConfig('commissionTiers', null, client);
  if (Array.isArray(tiers) && tiers.length && tiers.every((t) => t && t.rate != null)) {
    return tiers.map((t) => ({
      min: Number(t.min) || 0,
      max: t.max != null ? Number(t.max) : null,
      rate: Number(t.rate) || 0
    }));
  }
  return [
    { min: 0, max: 5000, rate: 0.15 },
    { min: 5000, max: 10000, rate: 0.175 },
    { min: 10000, max: 20000, rate: 0.2 },
    { min: 20000, max: null, rate: 0.225 }
  ];
}

/** Single-rate commission on the whole total, from the bucket the total falls in. */
export function computeCommission(totalAmount, tiers) {
  const total = Number(totalAmount) || 0;
  if (total <= 0) return 0;
  const sorted = [...tiers].sort((a, b) => (a.max ?? Infinity) - (b.max ?? Infinity));
  for (const tier of sorted) {
    if (total <= (tier.max ?? Infinity)) {
      return round2(total * (tier.rate || 0));
    }
  }
  const last = sorted[sorted.length - 1];
  return round2(total * (last?.rate || 0));
}

/** The fixed service fee charged to the customer when a quotation is declined. */
export async function getServiceFeeDefault(client = prisma) {
  const fee = Number(await getConfig('serviceFeeDefault', 199, client));
  return Number.isFinite(fee) && fee >= 0 ? fee : 199;
}

/**
 * Provider submits (or revises) the live quotation for their CONFIRMED booking.
 * The service fee row is fixed from admin config; the provider may add
 * purpose/amount rows. Total = fee + sum(items). Idempotent — a SUBMITTED
 * quotation is updated in place so re-submission never duplicates rows.
 */
export async function submitQuotation({ bookingId, providerId, items, client = prisma }) {
  return withClientTransaction(client, async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { providerId: true, status: true, serviceCategory: true, customerId: true, statusHistory: true }
    });
    if (!booking) throw serviceError('BOOKING_NOT_FOUND', 'Booking not found.');
    if (booking.providerId !== providerId) throw serviceError('FORBIDDEN', 'You are not assigned to this booking.');

    const status = normalizeBookingStatus(booking.status);
    if (status !== 'CONFIRMED') {
      if (status === 'ONGOING') throw serviceError('QUOTATION_NOT_ALLOWED', 'Work has already started for this booking.');
      throw serviceError('QUOTATION_NOT_ALLOWED', 'A quotation can only be submitted for a confirmed booking.');
    }

    const cleanItems = Array.isArray(items)
      ? items
          .filter((row) => row && typeof row === 'object' && String(row.purpose || '').trim() && row.amount != null)
          .slice(0, 25)
          .map((row) => ({
            purpose: String(row.purpose).trim().slice(0, 200),
            amount: Math.max(0, Number(row.amount) || 0)
          }))
      : [];
    if (cleanItems.length === 0) {
      throw serviceError('INVALID_QUOTATION', 'At least one payable line item is required alongside the service fee.');
    }
    const fee = await getServiceFeeDefault(tx);
    const itemsTotal = round2(cleanItems.reduce((sum, row) => sum + Number(row.amount), 0));
    const totalAmount = round2(fee + itemsTotal);
    if (totalAmount <= 0) throw serviceError('INVALID_QUOTATION', 'Quotation total must be greater than zero.');

    const existing = await tx.quotation.findFirst({
      where: { bookingId, providerId, status: 'SUBMITTED' },
      orderBy: { createdAt: 'desc' }
    });
    const quotation = existing
      ? await tx.quotation.update({
          where: { id: existing.id },
          data: { serviceFee: fee, items: cleanItems, totalAmount }
        })
      : await tx.quotation.create({
          data: { bookingId, providerId, serviceFee: fee, items: cleanItems, totalAmount }
        });

    // First submission lands on the customer's tracking timeline. Revisions
    // update the quotation row in place without spamming the timeline, keeping
    // the at-least-once/idempotent guarantee (double-submit can't duplicate).
    if (!existing) {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          statusHistory: appendStatusHistory(booking.statusHistory, {
            status: 'QUOTATION',
            timestamp: new Date().toISOString(),
            note: 'Specialist submitted a quotation for your review'
          })
        }
      });
      await tx.bookingEvent.create({
        data: { bookingId, actorId: providerId, actorRole: 'provider', action: 'QUOTATION_SUBMITTED', note: 'Quotation submitted' }
      });
    }

    return { booking, quotation, created: !existing };
  });
}

/** Latest quotation row for a booking (any status). */
export async function getLiveQuotation(bookingId, client = prisma) {
  return client.quotation.findFirst({
    where: { bookingId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Customer confirms the live quotation. The quotation is CAS-locked
 * SUBMITTED → ACCEPTED (the deciding call wins; a racing duplicate becomes a
 * no-op), the agreed total is persisted on the booking, and work starts
 * (CONFIRMED → ONGOING via the workflow service).
 */
export async function confirmQuotation({ bookingId, actorId, client = prisma }) {
  return withClientTransaction(client, async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, customerId: true, providerId: true, serviceCategory: true }
    });
    if (!booking) throw serviceError('BOOKING_NOT_FOUND', 'Booking not found.');
    if (booking.customerId !== actorId) throw serviceError('FORBIDDEN', 'You can only confirm your own bookings.');

    const status = normalizeBookingStatus(booking.status);
    if (status === 'ONGOING') {
      return { booking: await tx.booking.findUnique({ where: { id: bookingId } }), quotation: await getLiveQuotation(bookingId, tx), handled: true };
    }
    if (status !== 'CONFIRMED') throw serviceError('INVALID_TRANSITION', `Booking cannot be confirmed from its current status (${booking.status}).`);

    const quotation = await tx.quotation.findFirst({
      where: { bookingId, providerId: booking.providerId, status: 'SUBMITTED' },
      orderBy: { createdAt: 'desc' }
    });
    if (!quotation) throw serviceError('QUOTATION_NOT_FOUND', 'No pending quotation to confirm.');

    const decided = await tx.quotation.updateMany({
      where: { id: quotation.id, status: 'SUBMITTED' },
      data: { status: 'ACCEPTED' }
    });
    if (decided.count === 0) {
      return { booking: await tx.booking.findUnique({ where: { id: bookingId } }), quotation: await getLiveQuotation(bookingId, tx), handled: true };
    }

    await tx.bookingEvent.create({
      data: {
        bookingId,
        actorRole: 'CUSTOMER',
        actorId,
        action: 'QUOTATION_ACCEPTED',
        note: `Quotation accepted — total ₹${quotation.totalAmount}`
      }
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { amount: quotation.totalAmount, totalAmount: quotation.totalAmount }
    });

    await startBookingWork({
      bookingId,
      actorId,
      actorRole: 'customer',
      note: 'Booking confirmed after quotation accepted.',
      client: tx
    });

    return {
      booking: await tx.booking.findUnique({ where: { id: bookingId } }),
      quotation: await tx.quotation.findUnique({ where: { id: quotation.id } }),
      handled: false
    };
  });
}

/**
 * Customer declines the live quotation. The fixed service fee is BILLED to the
 * customer (no wallet-balance gate — the bill can run negative) and credited
 * to the submitting provider as their compensation, then either the booking is
 * re-broadcast to other providers (excluding the current one; requires the
 * customer's reason) or cancelled outright. The quotation CAS double-bills
 * proof: only the deciding call marks it REJECTED, so a retry never applies the
 * fee twice.
 */
export async function declineQuotation({ bookingId, actorId, anotherProvider = false, note = null, client = prisma }) {
  return withClientTransaction(client, async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { lead: true }
    });
    if (!booking) throw serviceError('BOOKING_NOT_FOUND', 'Booking not found.');
    if (booking.customerId !== actorId) throw serviceError('FORBIDDEN', 'You can only cancel your own bookings.');

    const status = normalizeBookingStatus(booking.status);
    if (status === 'CANCELLED' || status === 'PENDING' || status === 'ONGOING') {
      // Already handled by a previous attempt (or work started) — idempotent no-op.
      return { booking, quotation: await getLiveQuotation(bookingId, tx), handled: true, feeDebited: false };
    }
    if (status !== 'CONFIRMED') throw serviceError('INVALID_TRANSITION', `Booking cannot be cancelled from its current status (${booking.status}).`);

    const quotation = await tx.quotation.findFirst({
      where: { bookingId, providerId: booking.providerId, status: 'SUBMITTED' },
      orderBy: { createdAt: 'desc' }
    });
    if (!quotation) throw serviceError('QUOTATION_NOT_FOUND', 'No pending quotation to decline.');

    if (anotherProvider && !String(note || '').trim()) {
      throw serviceError('REASON_REQUIRED', 'Please provide a reason when asking for another provider.');
    }

    const decided = await tx.quotation.updateMany({
      where: { id: quotation.id, status: 'SUBMITTED' },
      data: { status: 'REJECTED' }
    });
    if (decided.count === 0) {
      return { booking, quotation: await getLiveQuotation(bookingId, tx), handled: true, feeDebited: false };
    }

    await tx.bookingEvent.create({
      data: {
        bookingId,
        actorRole: 'CUSTOMER',
        actorId,
        action: 'QUOTATION_REJECTED',
        note: note || 'Customer declined the quotation'
      }
    });

    const fee = await getServiceFeeDefault(tx);

    // The decline fee is the submitting provider's compensation. The customer
    // is BILLED the fee (ledger debit that may run negative — no wallet-balance
    // gate) and the provider is credited the same amount. Idempotency is
    // guaranteed by the CAS on the quotation above: only the deciding call runs.
    await debitWalletAllowNegative({
      userId: booking.customerId,
      amount: fee,
      category: 'SERVICE_FEE',
      referenceType: 'BOOKING',
      referenceId: booking.id,
      description: `Service fee billed for declining the provider quotation (₹${fee})`,
      client: tx
    });
    const feeProvider = await tx.provider.findUnique({
      where: { id: quotation.providerId },
      select: { userId: true }
    });
    if (feeProvider?.userId) {
      await creditWallet({
        userId: feeProvider.userId,
        amount: fee,
        category: 'SERVICE_FEE',
        referenceType: 'BOOKING',
        referenceId: booking.id,
        description: `Service fee compensation for the declined quotation (₹${fee})`,
        client: tx
      });
    }

    if (anotherProvider) {
      if (!booking.lead) throw serviceError('LEAD_NOT_FOUND', 'This booking has no lead to redistribute.');
      const result = await redistributeAfterDecline({
        booking,
        lead: booking.lead,
        providerIdToExclude: booking.providerId,
        reason: 'QUOTATION_DECLINED',
        client: tx
      });
      return {
        ...result,
        quotation,
        booking: result.booking || booking,
        lead: booking.lead,
        handled: false,
        feeDebited: true
      };
    }

    const transitioned = await tx.booking.updateMany({
      where: { id: bookingId, status: 'CONFIRMED' },
      data: {
        status: 'CANCELLED',
        cancelledBy: actorId,
        cancelledReason: note || 'Customer declined the quotation',
        statusHistory: buildStatusHistory(booking.statusHistory, 'CANCELLED', note || 'Customer declined the quotation')
      }
    });
    if (transitioned.count === 0) {
      return { booking: await tx.booking.findUnique({ where: { id: bookingId } }), quotation, handled: false, feeDebited: true };
    }

    await tx.bookingEvent.create({
      data: {
        bookingId,
        actorRole: 'CUSTOMER',
        actorId,
        action: 'STATUS_CANCELLED',
        note: note || 'Customer declined the quotation'
      }
    });

    if (booking.lead) {
      await client.lead.update({
        where: { id: booking.lead.id },
        data: { status: 'CANCELLED', lastRejectReason: 'CUSTOMER_DECLINED_QUOTATION' }
      });
      await cancelOpenOffers({ leadId: booking.lead.id, reason: 'CUSTOMER_DECLINED_QUOTATION', client });
    }

    return {
      booking: await client.booking.findUnique({ where: { id: bookingId } }),
      quotation,
      lead: booking.lead,
      handled: false,
      feeDebited: true,
      cancelled: true
    };
  });
}

/**
 * Re-open a lead whose quotation the customer declined so OTHER eligible
 * providers (never the declining one) can pick it up. Existing
 * `redistributeLead` refuses ACCEPTED leads, so this is the dedicated path for
 * the customer "find another provider" decision.
 *
 * The booking model broadcasts a request to EVERY eligible provider at once
 * (first-accept-wins), so all of the other eligible providers are already
 * recorded in `LeadAssignmentHistory` as cancelled losers. Excluding the whole
 * history would therefore empty the pool and the booking would cancel with
 * "no other provider" every time — so this path re-broadcasts instead,
 * excluding ONLY providers who previously reached an ACCEPTED assignment (their
 * quotation was declined in an earlier round) plus the provider being declined
 * right now. When no eligible provider remains the booking is cancelled and the
 * lead settled. Runs inside `client`'s transaction.
 */
export async function redistributeAfterDecline({ booking, lead, providerIdToExclude, reason, client }) {
  // Providers whose quotation was declined before (they already accepted the
  // booking) must never be re-offered. The status 'ACCEPTED' marker is kept on
  // their assignment row across rounds so this exclusion accumulates correctly.
  const neverAgain = await client.leadAssignmentHistory.findMany({
    where: { leadId: lead.id, status: 'ACCEPTED' },
    select: { providerId: true }
  });
  const excludeIds = [...new Set([...neverAgain.map((t) => t.providerId), providerIdToExclude].filter(Boolean))];

  const candidates = await findEligibleProviders({
    serviceCategory: booking.serviceCategory,
    serviceId: booking.serviceId,
    excludeProviderIds: excludeIds,
    customerLat: booking.serviceLatitude ?? null,
    customerLng: booking.serviceLongitude ?? null,
    client
  });

  // Close every dangling open offer before the re-broadcast. The ACCEPTED row
  // is only de-currented (its status stays ACCEPTED so it never ends up in a
  // later re-broadcast); every other outstanding offer is formally rejected.
  await client.leadAssignmentHistory.updateMany({
    where: { leadId: lead.id, isCurrent: true, status: 'ACCEPTED' },
    data: { isCurrent: false }
  });
  await client.leadAssignmentHistory.updateMany({
    where: { leadId: lead.id, isCurrent: true },
    data: { isCurrent: false, status: 'REJECTED', actionAt: new Date(), reason }
  });

  if (!candidates.length) {
    const updatedBooking = await client.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        cancelledBy: booking.customerId,
        cancelledReason: 'No other provider accepted the request.',
        statusHistory: buildStatusHistory(booking.statusHistory, 'CANCELLED', 'No other provider accepted the request.')
      }
    });
    await client.bookingEvent.create({
      data: {
        bookingId: booking.id,
        actorRole: 'CUSTOMER',
        actorId: booking.customerId,
        action: 'STATUS_CANCELLED',
        note: 'No other provider accepted the request.'
      }
    });
    await client.lead.update({
      where: { id: lead.id },
      data: { status: 'EXPIRED', lastRejectReason: 'NO_OTHER_PROVIDER_AFTER_QUOTATION_DECLINED' }
    });
    return { nextProvider: null, settled: true, cancelled: true, booking: updatedBooking };
  }

  // Full re-broadcast — exactly the semantics of the original booking
  // broadcast: every eligible provider gets an open offer; first-accept-wins.
  // The first eligible provider is recorded as the booking/lead owner until one
  // of them accepts (required FK only — no ranking).
  const now = new Date();
  const expiryTime = new Date(now.getTime() + 86400 * 1000);
  await client.leadAssignmentHistory.createMany({
    data: candidates.map((p) => ({
      leadId: lead.id,
      providerId: p.id,
      status: 'NEW',
      isCurrent: true,
      assignedAt: now
    }))
  });
  await client.leadTransferHistory.createMany({
    data: candidates.map((p) => ({
      leadId: lead.id,
      fromProviderId: providerIdToExclude,
      toProviderId: p.id,
      reason,
      details: { note: 'Re-broadcast after customer declined the quotation' }
    }))
  });
  await client.lead.update({
    where: { id: lead.id },
    data: {
      providerId: candidates[0].id,
      status: 'NEW',
      expiryTime,
      acceptedAt: null,
      transferCount: { increment: 1 }
    }
  });
  // Offered-count bookkeeping in two statements (base-row insert + one `in`
  // increment) instead of a 2×N serial loop inside this open transaction.
  await recordLeadsOffered(candidates.map((p) => p.id), client);

  const updatedBooking = await client.booking.update({
    where: { id: booking.id },
    data: {
      providerId: candidates[0].id,
      status: 'PENDING',
      cancelledBy: null,
      cancelledReason: null,
      statusHistory: buildStatusHistory(booking.statusHistory, 'PENDING', 'Re-broadcast after customer declined the quotation')
    }
  });
  await client.bookingEvent.create({
    data: {
      bookingId: booking.id,
      actorRole: 'SYSTEM',
      action: 'LEAD_REASSIGNED',
      note: 'Lead re-broadcast after customer declined the quotation.'
    }
  });
  return { nextProvider: candidates[0], providers: candidates, settled: false, cancelled: false, booking: updatedBooking };
}