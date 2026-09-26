import prisma from '../prisma/client.js';
import { applyPromotion } from './providerLevelService.js';
import {
  recordLeadOffered,
  recordLeadAccepted,
  recordLeadRejected,
  recordJobCompleted
} from './providerPerformanceService.js';
import { refreshProviderReputation } from './providerReputationService.js';
import { debitWalletAllowNegative, recordWalletEarning } from './walletService.js';
import { getCommissionTiers, computeCommission, round2 } from './quotationService.js';
import { normalizeBookingStatus } from '../utils/workflow.js';
import { consumeAlertsByData } from './alertService.js';
import { nextBusinessNumber } from '../utils/businessNumber.js';
import { appendStatusHistory } from '../utils/statusHistory.js';
import { clearLocationHistory } from './trackingService.js';

/** Run `fn` inside a transaction unless the caller already provided a transaction client. */
async function withClientTransaction(client, fn, { maxRetries = 2 } = {}) {
  if (client !== prisma) return fn(client);
  // 60s aligns with the REQUEST_TIMEOUT middleware: Neon free-tier latency
  // spikes exceed 30s, and a timed-out interactive transaction rolls back
  // atomically so the caller can safely retry.
  const run = () => prisma.$transaction(fn, { isolationLevel: 'Serializable', maxWait: 20000, timeout: 60000 });
  let attempt = 0;
  for (;;) {
    try {
      return await run();
    } catch (err) {
      // Serialization / deadlock under SERIALIZABLE isolation: retry is safe
      // because every workflow transition is compare-and-swap on status and the
      // writes are idempotent (rule 18). Bounded retries avoid compounding load.
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

/**
 * Customer-identifying / customer-locating fields. They are withheld from every
 * provider who has only been OFFERED a request and released as soon as one
 * provider actually owns it (accepted it, or an admin assigned them).
 */
const CUSTOMER_PRIVATE_BOOKING_FIELDS = [
  'locationAddress',
  'instructions',
  'serviceLatitude',
  'serviceLongitude',
  'endLocation'
];

/**
 * Is `providerId` the provider who actually owns this request?
 *
 * A booking/lead is created unowned (`providerId` null) and broadcast to every
 * eligible provider, so before someone accepts there is no owner and NOBODY is
 * entitled to the customer's contact details or exact address. `acceptLeadForBooking`
 * writes both `Booking.providerId` and `Lead.providerId` inside the accept
 * transaction, and the admin manual-assignment path writes them at creation.
 */
function providerOwnsRequest(lead, booking, providerId) {
  if (!providerId) return false;
  if (booking?.providerId && booking.providerId === providerId) return true;
  if (lead?.providerId && lead.providerId === providerId) return true;
  return false;
}

/**
 * Strip the customer's phone number and exact service location from a lead row
 * unless `providerId` is the provider who owns it.
 *
 * Applied to every provider-facing read (`buildLeadPayload`, the provider inbox,
 * the single-lead view) so a broadcast offer can never leak an unaccepted
 * customer's details to a provider who did not take the job. The city, service
 * category and amount stay — that is what an offer needs to be worth accepting.
 */
export function redactLeadForProvider(lead, providerId) {
  if (!lead) return lead;
  // A falsy `providerId` means this is NOT a provider-scoped read — the
  // customer, an admin, or an internal caller. Those are entitled to the full
  // shape, so redaction is opt-in per provider and never the default.
  if (!providerId) return lead;

  const booking = lead.booking;
  const reveals = providerOwnsRequest(lead, booking, providerId);

  if (reveals) {
    // Owner still loses the phone number once the booking is cancelled, so a
    // finished/cancelled job can never be re-used to re-contact the customer.
    if (booking?.status === 'CANCELLED' && lead.customer) {
      return { ...lead, customer: { ...lead.customer, phone: null } };
    }
    return lead;
  }

  const redactedBooking = booking
    ? Object.fromEntries(CUSTOMER_PRIVATE_BOOKING_FIELDS.map((f) => [f, null]))
    : null;

  return {
    ...lead,
    customer: lead.customer ? { ...lead.customer, phone: null } : lead.customer,
    booking: booking ? { ...booking, ...redactedBooking } : booking
  };
}

/**
 * Lightweight socket-safe payload used by `newLead` and other real-time lead
 * events so the frontend does not have to re-fetch.
 *
 * Pass `forProviderId` when the payload is going to a provider's socket. Until
 * that provider owns the request, the customer's phone number, full address,
 * instructions and exact coordinates are withheld (see `redactLeadForProvider`);
 * customer- and admin-facing callers omit it and get the unredacted shape.
 */
export function buildLeadPayload(lead, booking = null, provider = null, { forProviderId = null } = {}) {
  const customer = booking?.customer ?? lead?.customer ?? null;
  // Normalize into one shape so the redaction below sees the same customer and
  // booking the payload is built from, no matter how the caller passed them.
  const scoped = redactLeadForProvider({ ...lead, customer, booking }, forProviderId);

  // Rule: the customer's phone number is only shared with providers while the
  // booking is live. Once it is cancelled the number is stripped from every
  // payload so it can never be re-shown or leaked after cancellation.
  const cancelled = booking?.status === 'CANCELLED';
  const visibleBooking = scoped.booking;
  return {
    leadId: lead?.id,
    bookingId: booking?.id ?? lead?.bookingId,
    serviceCategory: lead?.serviceCategory,
    serviceId: lead?.serviceId,
    status: lead?.status,
    distanceKm: lead?.distanceKm,
    notes: lead?.notes,
    expiryTime: lead?.expiryTime,
    transferCount: lead?.transferCount,
    createdAt: lead?.createdAt,
    customer: customer
      ? { id: customer.id, name: customer.name, phone: cancelled || !scoped.customer?.phone ? null : customer.phone, avatar: customer.avatar }
      : null,
    booking: booking
      ? {
          id: booking.id,
          bookingNumber: booking.bookingNumber || null,
          status: booking.status,
          locationAddress: visibleBooking.locationAddress ?? null,
          city: booking.city,
          instructions: visibleBooking.instructions ?? null,
          amount: booking.amount,
          providerPhase: booking.providerPhase,
          serviceLatitude: visibleBooking.serviceLatitude ?? null,
          serviceLongitude: visibleBooking.serviceLongitude ?? null,
          endLocation: visibleBooking.endLocation ?? null,
          providerLatitude: booking.providerLatitude ?? null,
          providerLongitude: booking.providerLongitude ?? null,
          providerLocationUpdatedAt: booking.providerLocationUpdatedAt ?? null
        }
      : null,
    provider: provider
      ? { id: provider.id, userId: provider.user?.id, name: provider.user?.name, rating: provider.rating }
      : null
  };
}

/**
 * Find providers eligible for a new/transferred lead.
 *
 * Eligibility criteria (3 rules, no more):
 *   1. Provider is verified + user account is ACTIVE
 *   2. Provider has an APPROVED ProviderService link for the requested service
 *   3. Wallet balance >= 0 (null = new provider, OK)
 *
 * No distance/radius filter, no online/acceptingBookings/profileComplete/cooldown
 * gates, no open-lead cap. Every eligible provider receives the broadcast offer.
 * First-accept-wins via `acceptLeadForBooking`.
 */
export async function findEligibleProviders({
  serviceCategory,
  serviceId = null,
  excludeProviderIds = [],
  client = prisma
}) {
  const baseWhere = {
    id: excludeProviderIds.length ? { notIn: excludeProviderIds } : undefined,
    isVerified: true,
    accountStatus: 'ACTIVE',
    user: {
      status: 'ACTIVE',
      OR: [
        { wallet: { is: null } },
        { wallet: { is: { balance: { gte: 0 } } } }
      ]
    },
    providerServices: {
      some: serviceId
        ? { serviceId }
        : { service: { name: { equals: serviceCategory, mode: 'insensitive' } } }
    }
  };

  // Deterministic order (createdAt, then id) — stable, not a ranking.
  const providers = await client.provider.findMany({
    where: baseWhere,
    select: {
      id: true,
      userId: true,
      rating: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, avatar: true, phone: true }
      }
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });

  return providers.map((p) => ({ ...p, distanceKm: null }));
}

/** Diagnose why a specific preferred provider is not in the eligible pool. */
async function diagnoseProvider(providerId, { serviceId = null, serviceCategory = null }, client) {
  const provider = await client.provider.findUnique({
    where: { id: providerId },
    include: { user: { select: { status: true, wallet: true } } }
  });
  if (!provider) return { code: 'PROVIDER_NOT_FOUND', message: 'Provider not found.' };
  if (!provider.isVerified) return { code: 'NOT_VERIFIED', message: 'This provider has not been verified yet and cannot accept bookings.' };
  if (provider.accountStatus !== 'ACTIVE' || provider.user?.status !== 'ACTIVE') {
    return { code: 'PROVIDER_UNAVAILABLE', message: 'This provider is not currently accepting new bookings.' };
  }
  if (provider.user?.wallet && Number(provider.user.wallet.balance) < 0) {
    return { code: 'WALLET_BELOW_ZERO', message: 'Clear your outstanding balance to start receiving new bookings.' };
  }
  if (serviceId || serviceCategory) {
    const approved = await client.providerService.findFirst({
      where: serviceId
        ? { providerId, serviceId }
        : { providerId, service: { name: { equals: serviceCategory, mode: 'insensitive' } } },
      select: { id: true }
    });
    if (!approved) {
      return { code: 'SERVICE_NOT_APPROVED', message: 'This provider is not approved for the requested service.' };
    }
  }
  return { code: 'PROVIDER_INELIGIBLE', message: 'This provider is not currently available for the requested service.' };
}

/**
 * Create a booking together with its first lead assignment, atomically.
 *
 * Temporary-service bookings broadcast the request to EVERY eligible provider
 * (approved, verified, inside the service radius, active account — no
 * subscription or quota gate) at the same time — first-accept-wins. The booking
 * and the lead are created with NO provider (`providerId` is null: the request is
 * an open offer, nobody has taken it yet). Every eligible provider receives that
 * open offer via `LeadAssignmentHistory` (`isCurrent: true`) and the first to
 * accept claims the job — `acceptLeadForBooking` writes `providerId` inside the
 * PENDING -> CONFIRMED compare-and-swap. There is no ranking or "top provider".
 *
 * - With `preferredProviderId`: that provider is moved to the front (when
 *   eligible); otherwise a descriptive 409-ish error is thrown.
 * - When no eligible provider exists the booking is rejected with
 *   `NO_ELIGIBLE_PROVIDERS`.
 *
 * Returns { booking, lead, provider, providers, eligibleCount } where `provider`
 * is always null here (nobody owns the request yet) and `providers` is the full
 * broadcast list. Socket emission is left to the caller after the transaction
 * commits.
 */
export async function createBookingWithLead({
  customerId,
  preferredProviderId = null,
  serviceId = null,
  serviceCategory,
  amount = null,
  locationAddress = '',
  city = 'Hyderabad',
  instructions = '',
  notes = null,
  customerLat = null,
  customerLng = null,
  serviceLatitude = null,
  serviceLongitude = null,
  contactPhone = null,
  client = prisma
}) {
  // Provider matching is a read-only pass, so it runs before the Serializable
  // transaction — the transaction below only creates the booking and its lead.
  // The broadcast model (first-accept-wins) tolerates a provider going offline
  // in the short window before the open offers are written.
  let eligible = await findEligibleProviders({
    serviceCategory,
    serviceId,
    excludeProviderIds: [],
    customerLat,
    customerLng,
    client
  });

  if (preferredProviderId) {
    const preferred = eligible.find((p) => p.id === preferredProviderId);
    if (!preferred) {
      const diagnosis = await diagnoseProvider(preferredProviderId, { serviceId, serviceCategory }, client);
      throw serviceError(diagnosis.code, diagnosis.message);
    }
    eligible = [preferred, ...eligible.filter((p) => p.id !== preferredProviderId)];
  }

  if (!eligible.length) {
    throw serviceError(
      'NO_ELIGIBLE_PROVIDERS',
      'No eligible providers are available for this request right now. Please try again later.'
    );
  }

  return withClientTransaction(client, async (tx) => {
    const timestamp = new Date();

    const baseAmount = amount != null && !Number.isNaN(Number(amount)) ? Number(amount) : null;

    // Business display number (SG24-0001, ...) minted atomically inside the
    // transaction so concurrent bookings can never share it.
    const bookingNumber = await nextBusinessNumber('BOOKING', tx);

    // Per-booking platform charges were removed in favour of the monthly
    // platform fee. The customer pays the base amount and the provider keeps
    // the full amount (the booking columns are kept for historical shape).
    const booking = await tx.booking.create({
      data: {
        bookingNumber,
        customerId,
        // No owner yet: the request is an open broadcast offer, and
        // `acceptLeadForBooking` writes the real providerId inside the
        // PENDING -> CONFIRMED compare-and-swap. Never store a placeholder
        // provider — it would be displayed on the customer's pending booking
        // and would fail the "not busy with an active job" eligibility gate for
        // that provider on every later lead.
        providerId: null,
        serviceId: serviceId || null,
        serviceCategory,
        locationAddress,
        city,
        instructions,
        contactPhone: contactPhone || null,
        serviceLatitude: serviceLatitude != null ? Number(serviceLatitude) : null,
        serviceLongitude: serviceLongitude != null ? Number(serviceLongitude) : null,
        amount: baseAmount,
        customerPlatformCharge: 0,
        providerPlatformCharge: 0,
        totalAmount: baseAmount,
        providerPayout: baseAmount,
        ...(customerLat != null && customerLng != null
          ? { endLocation: { address: locationAddress || '', latitude: customerLat, longitude: customerLng } }
          : {}),
        messages: [],
        reviewed: false,
        statusHistory: [{ status: 'PENDING', timestamp: timestamp.toISOString(), note: 'Booking created by customer' }]
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, avatar: true } }
      }
    });

    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        actorId: customerId,
        actorRole: 'customer',
        action: 'CREATED',
        note: 'Booking created'
      }
    });

    const lead = await tx.lead.create({
      data: {
        bookingId: booking.id,
        customerId,
        serviceId: serviceId || null,
        serviceCategory,
        status: 'NEW',
        distanceKm: null,
        notes: notes || null
      }
    });

    const leadTimeoutSeconds = 86400;
    const expiryTime = new Date(Date.now() + leadTimeoutSeconds * 1000);

    const assignedLead = await tx.lead.update({
      where: { id: lead.id },
      data: { providerId: null, expiryTime }
    });

    // Broadcast: open the offer to every eligible provider at once. Nobody owns
    // the booking or the lead until one of them accepts — the offer history is
    // the source of truth for "who was offered this", not a single owner.
    await tx.leadAssignmentHistory.createMany({
      data: eligible.map((p) => ({
        leadId: lead.id,
        providerId: p.id,
        status: 'NEW',
        isCurrent: true,
        assignedAt: timestamp
      }))
    });

    // Offered-count bookkeeping (recordLeadOffered) is derived analytics and
    // deliberately happens AFTER the transaction commits, via the job queue —
    // the caller enqueues one `performance` job per offered provider. It must
    // never add serial round trips to this critical path.

    return { booking, lead: assignedLead, provider: null, providers: eligible, eligibleCount: eligible.length };
  });
}

/**
 * Create the normal booking/lead records after an admin manually assigns a
 * previously unassigned no-provider request to a provider.
 */
export async function createManuallyAssignedBookingWithLead({
  customerId,
  providerId,
  serviceId = null,
  serviceCategory,
  locationAddress = '',
  city = 'Hyderabad',
  instructions = '',
  serviceLatitude = null,
  serviceLongitude = null,
  contactPhone = null,
  client = prisma
}) {
  return withClientTransaction(client, async (tx) => {
    const timestamp = new Date();
    const bookingNumber = await nextBusinessNumber('BOOKING', tx);
    const booking = await tx.booking.create({
      data: {
        bookingNumber,
        customerId,
        providerId,
        serviceId,
        serviceCategory,
        locationAddress,
        city,
        instructions,
        contactPhone: contactPhone || null,
        serviceLatitude: serviceLatitude != null ? Number(serviceLatitude) : null,
        serviceLongitude: serviceLongitude != null ? Number(serviceLongitude) : null,
        ...(serviceLatitude != null && serviceLongitude != null
          ? { endLocation: { address: locationAddress, latitude: Number(serviceLatitude), longitude: Number(serviceLongitude) } }
          : {}),
        messages: [],
        reviewed: false,
        status: 'CONFIRMED',
        statusHistory: [
          { status: 'PENDING', timestamp: timestamp.toISOString(), note: 'Booking created after admin manual assignment' },
          { status: 'CONFIRMED', timestamp: timestamp.toISOString(), note: 'Provider assigned directly by admin' }
        ]
      },
      include: { customer: { select: { id: true, name: true, phone: true, avatar: true } } }
    });

    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        actorId: customerId,
        actorRole: 'customer',
        action: 'ASSIGNED',
        note: 'Provider assigned directly by admin'
      }
    });

    const lead = await tx.lead.create({
      data: {
        bookingId: booking.id,
        customerId,
        providerId,
        serviceCategory,
        status: 'ACCEPTED',
        notes: instructions || null,
        acceptedAt: timestamp
      }
    });

    await tx.leadAssignmentHistory.create({
      data: { leadId: lead.id, providerId, status: 'ACCEPTED', isCurrent: true, assignedAt: timestamp, actionAt: timestamp, reason: 'ADMIN_MANUAL_ASSIGNMENT' }
    });

    const provider = await tx.provider.findUnique({
      where: { id: providerId },
      include: { user: { select: { id: true, name: true } } }
    });
    return { booking, lead, provider };
  });
}

/**
 * 24-hour reminder — re-broadcast an unanswered lead to every currently
 * eligible provider. Uses the same eligibility pass as the original broadcast,
 * so providers who came online since then (or whose offer was withdrawn) get a
 * fresh open offer and the lead re-appears in their inbox; providers already
 * holding an open offer keep it and are simply re-notified. No-op when the lead
 * is no longer awaiting a response.
 *
 * Returns { skipped, lead, booking, providers }.
 */
export async function reopenLeadBroadcast({ leadId, client = prisma }) {
  const lead = await client.lead.findUnique({
    where: { id: leadId },
    include: {
      customer: { select: { id: true, name: true, phone: true, avatar: true } },
      booking: {
        select: {
          id: true,
          status: true,
          serviceCategory: true,
          serviceLatitude: true,
          serviceLongitude: true,
          endLocation: true
        }
      }
    }
  });
  if (!lead || !['NEW', 'VIEWED'].includes(lead.status)) return { skipped: true };
  if (!lead.booking || lead.booking.status !== 'PENDING') return { skipped: true };

  // Same coordinates as the original broadcast: service pin first, then the
  // booking's end location.
  const end = lead.booking.endLocation && typeof lead.booking.endLocation === 'object' ? lead.booking.endLocation : null;
  const customerLat = lead.booking.serviceLatitude != null
    ? Number(lead.booking.serviceLatitude)
    : end?.latitude != null
      ? Number(end.latitude)
      : null;
  const customerLng = lead.booking.serviceLongitude != null
    ? Number(lead.booking.serviceLongitude)
    : end?.longitude != null
      ? Number(end.longitude)
      : null;

  const providers = await findEligibleProviders({
    serviceCategory: lead.booking.serviceCategory,
    serviceId: lead.serviceId,
    excludeProviderIds: [],
    customerLat,
    customerLng,
    client
  });
  if (!providers.length) return { skipped: true, lead, booking: lead.booking, providers: [] };

  // Re-open the offer to every currently eligible provider. Providers with an
  // open offer keep it; the rest get a fresh one.
  const existing = await client.leadAssignmentHistory.findMany({
    where: { leadId: lead.id, isCurrent: true },
    select: { providerId: true }
  });
  const openProviderIds = new Set(existing.map((o) => o.providerId));
  const fresh = providers.filter((p) => !openProviderIds.has(p.id));

  if (fresh.length) {
    const now = new Date();
    await client.leadAssignmentHistory.createMany({
      data: fresh.map((p) => ({
        leadId: lead.id,
        providerId: p.id,
        status: 'NEW',
        isCurrent: true,
        assignedAt: now
      }))
    });
  }

  return { skipped: false, lead, booking: lead.booking, providers };
}

/**
 * Provider accepts a PENDING lead: PENDING → CONFIRMED (booking) and
 * NEW/VIEWED → ACCEPTED (lead), atomically and first-accept-wins. Any provider
 * with an open offer (`LeadAssignmentHistory.isCurrent`) may accept; everyone
 * else's open offer is auto-cancelled. Returns the booking, the accepted lead
 * and the providers whose offers were cancelled.
 */
export async function acceptLeadForBooking({ bookingId, providerId, client = prisma }) {
  const result = await withClientTransaction(client, async (tx) => {
    const lead = await tx.lead.findUnique({ where: { bookingId } });
    if (lead) {
      const offer = await tx.leadAssignmentHistory.findFirst({
        where: { leadId: lead.id, providerId, isCurrent: true },
        select: { id: true }
      });
      if (!offer) {
        throw serviceError('NOT_ASSIGNED', 'This booking request is no longer offered to you.');
      }
    }

    // Idempotent retry: if a prior accept already committed (e.g. the response
    // was lost to a timeout) and it was THIS provider who accepted it, return
    // the current state instead of declaring a losing race.
    const existing = await tx.booking.findUnique({ where: { id: bookingId } });
    if (
      existing &&
      existing.providerId === providerId &&
      normalizeBookingStatus(existing.status) === 'CONFIRMED' &&
      (!lead || lead.providerId === providerId)
    ) {
      return { booking: existing, alreadyAccepted: true, cancelledProviders: [] };
    }

    // Wallet re-check at accept time: a provider may have been offered this lead
    // while their balance was fine, then completed another job whose commission
    // pushed the wallet negative (the balance is never credited on completion —
    // the customer pays the provider directly). The offer is stale by then, so
    // block the accept: a negative balance must never secure new work, even for
    // a lead already sitting in Action Required. Guarded by CURRENT DB state.
    const walletRow = await tx.provider.findUnique({
      where: { id: providerId },
      select: { user: { select: { wallet: { select: { balance: true } } } } }
    });
    if (walletRow?.user?.wallet && Number(walletRow.user.wallet.balance) < 0) {
      throw serviceError(
        'WALLET_BELOW_ZERO',
        'Your wallet balance is negative. Clear your outstanding balance before accepting a new request.'
      );
    }

    const historyBefore = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { statusHistory: true }
    });
    const updated = await tx.booking.updateMany({
      where: { id: bookingId, status: 'PENDING' },
      data: {
        providerId,
        status: 'CONFIRMED',
        statusHistory: appendStatusHistory(historyBefore?.statusHistory, { status: 'CONFIRMED', timestamp: new Date().toISOString(), note: 'Provider accepted the booking request' })
      }
    });
    if (updated.count === 0) {
      throw serviceError('ACCEPT_RACE', 'This booking has already been handled. Another provider accepted it first.');
    }

    // One active job per provider: accepting a second offer while a previous
    // one is already confirmed/ongoing must fail atomically, so a racing
    // double-accept (two offers tapped in quick succession) can never produce
    // two active bookings. Guarded by CURRENT DB state, not stale client state.
    const otherActive = await tx.booking.findFirst({
      where: { providerId, id: { not: bookingId }, status: { in: ['CONFIRMED', 'ONGOING'] } }
    });
    if (otherActive) {
      throw serviceError('ACTIVE_BOOKING_EXISTS', 'You already have an active booking. Complete or cancel it before accepting another request.');
    }

    await tx.bookingEvent.create({
      data: { bookingId, actorId: providerId, actorRole: 'provider', action: 'STATUS_CONFIRMED', note: 'Provider accepted the booking request' }
    });

    let accepted = null;
    const cancelledProviders = [];
    if (lead) {
      const leadUpdated = await tx.lead.updateMany({
        where: { id: lead.id, status: { in: ['NEW', 'VIEWED'] } },
        data: { status: 'ACCEPTED', providerId, acceptedAt: new Date() }
      });
      if (leadUpdated.count > 0) {
        await tx.leadAssignmentHistory.updateMany({
          where: { leadId: lead.id, providerId, isCurrent: true },
          data: { status: 'ACCEPTED', actionAt: new Date() }
        });

        // Close this provider's OTHER open offers — one active job at a time.
        // The freed slot lets a future lead backfill (max-2 open offers rule).
        await tx.leadAssignmentHistory.updateMany({
          where: { providerId, isCurrent: true, leadId: { not: lead.id } },
          data: { status: 'REJECTED', isCurrent: false, actionAt: new Date(), reason: 'PROVIDER_ACCEPTED_ANOTHER_JOB' }
        });

        // First-accept-wins: auto-cancel every other provider's open offer.
        await tx.leadAssignmentHistory.updateMany({
          where: { leadId: lead.id, providerId: { not: providerId }, isCurrent: true },
          data: {
            status: 'CANCELLED',
            isCurrent: false,
            actionAt: new Date(),
            reason: 'ACCEPTED_BY_ANOTHER_PROVIDER'
          }
        });
        const cancelledRows = await tx.leadAssignmentHistory.findMany({
          where: { leadId: lead.id, providerId: { not: providerId }, status: 'CANCELLED' },
          select: { providerId: true, provider: { select: { userId: true } } }
        });
        for (const row of cancelledRows) {
          if (row.provider?.userId) {
            cancelledProviders.push({ providerId: row.providerId, userId: row.provider.userId });
          }
        }

        const responseTimeMs = Date.now() - new Date(lead.createdAt).getTime();
        await recordLeadAccepted(providerId, responseTimeMs, tx);
        accepted = await tx.lead.findUnique({
          where: { id: lead.id },
          include: { provider: { select: { userId: true } } }
        });
      }
    }

    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    return { booking, lead: accepted, cancelledProviders };
  });

  // The provider accepting the lead IS their review of the action-required
  // "new lead" alert — consume it immediately so no orphan row is left behind
  // (alerts are read-once; see alertService). Never awaited / never throws.
  if (result?.lead?.id && result?.lead?.provider?.userId) {
    await consumeAlertsByData({
      userId: result.lead.provider.userId,
      type: 'LEAD',
      key: 'leadId',
      value: result.lead.id,
      client
    });
  }

  return result;
}

/**
 * Provider starts work on a CONFIRMED booking: CONFIRMED → ONGOING. The only
 * legal source state is CONFIRMED; a compare-and-swap on `status` makes a
 * double-tap or a stale client fail atomically instead of double-transitioning.
 * Returns the updated booking.
 */
export async function startBookingWork({ bookingId, actorId, actorRole = 'provider', note = null, client = prisma }) {
  return withClientTransaction(client, async (tx) => {
    const currentHistory = await tx.booking.findUnique({ where: { id: bookingId }, select: { statusHistory: true } });
    const transitioned = await tx.booking.updateMany({
      where: { id: bookingId, status: 'CONFIRMED' },
      data: {
        status: 'ONGOING',
        startedAt: new Date(),
        statusHistory: appendStatusHistory(currentHistory?.statusHistory, { status: 'ONGOING', timestamp: new Date().toISOString(), note: note || 'Work started' })
      }
    });
    if (transitioned.count === 0) {
      const current = await tx.booking.findUnique({ where: { id: bookingId }, select: { status: true } });
      if (!current) throw serviceError('BOOKING_NOT_FOUND', 'Booking not found.');
      if (normalizeBookingStatus(current.status) === 'ONGOING') {
        throw serviceError('NO_CHANGE', 'Work has already started for this booking.');
      }
      throw serviceError('INVALID_TRANSITION', `Booking cannot start work from its current status (${current.status}).`);
    }
    await tx.bookingEvent.create({
      data: { bookingId, actorId, actorRole, action: 'STATUS_ONGOING', note: note || 'Work started' }
    });
    return tx.booking.findUnique({ where: { id: bookingId } });
  });
}

/**
 * Booking reaches COMPLETED. Consumes the provider's lead, credits earnings
 * net of commission, refreshes reputation and checks for a provider promotion —
 * all in one transaction. Returns everything the caller needs to notify.
 */
export async function completeBooking({ bookingId, providerId, client = prisma }) {
  return withClientTransaction(client, async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw serviceError('BOOKING_NOT_FOUND', 'Booking not found.');

    // Compare-and-swap: only an ONGOING booking may be completed. A racing second
    // call (double-click, retry) matches zero rows and aborts BEFORE any side
    // effect runs, so it can never double-credit the wallet, double-increment
    // performance or double-consume the lead.
    const transitioned = await tx.booking.updateMany({
      where: { id: bookingId, status: 'ONGOING' },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        statusHistory: appendStatusHistory(booking.statusHistory, { status: 'COMPLETED', timestamp: new Date().toISOString(), note: 'Booking completed by provider' }),
        messages: []
      }
    });
    if (transitioned.count === 0) {
      const current = await tx.booking.findUnique({ where: { id: bookingId }, select: { status: true } });
      if (!current) throw serviceError('BOOKING_NOT_FOUND', 'Booking not found.');
      throw serviceError('INVALID_TRANSITION', `Booking cannot be completed from its current status (${current.status}).`);
    }
    const updated = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true, avatar: true } }
      }
    });

    await tx.bookingEvent.create({
      data: { bookingId, actorId: providerId, actorRole: 'provider', action: 'STATUS_COMPLETED', note: 'Booking completed' }
    });

    // Per-booking platform charges take the form of a commission on the
    // accepted quotation total (tiered, admin-configurable). The customer pays
    // the provider DIRECTLY (cash/offline) — servego24 is not part of that
    // exchange — so the platform's commission (tiered, 10% base rate) is
    // charged as a wallet DEBIT to the provider. If the wallet has no cover the balance runs NEGATIVE: that
    // outstanding amount must be cleared before the provider receives any new
    // lead (see `findEligibleProviders` — negative wallets are excluded).
    const amount = Number(booking.amount) || 0;
    const tiers = await getCommissionTiers(tx);
    const commission = computeCommission(amount, tiers);
    const earnings = round2(Math.max(0, amount - commission));
    const serviceLabel = booking.serviceCategory || 'Service';

    await tx.booking.update({
      where: { id: bookingId },
      data: { providerPlatformCharge: commission, providerPayout: earnings }
    });

    const jobDurationMs = booking.startedAt ? Math.max(0, Date.now() - new Date(booking.startedAt).getTime()) : null;
    await recordJobCompleted(providerId, amount, commission, { jobDurationMs, client: tx });
    await refreshProviderReputation(providerId, tx);
    const promotion = await applyPromotion(providerId, tx);

    const providerRow = await tx.provider.findUnique({ where: { id: providerId }, select: { userId: true } });

    if (commission > 0 && providerRow?.userId) {
      await debitWalletAllowNegative({
        userId: providerRow.userId,
        amount: commission,
        category: 'COMMISSION',
        referenceType: 'BOOKING',
        referenceId: bookingId,
        description: `Platform commission (${commission} on ₹${amount}) charged on completed ${serviceLabel} booking`,
        client: tx
      });
    }

    // The customer pays the provider directly (external settlement), so the
    // wallet balance is never credited on completion. Track the accepted
    // quotation total as lifetime earnings instead, so admin/provider views can
    // show how much the provider has earned. CompleteBooking is CAS-locked to a
    // single ONGOING → COMPLETED transition, so this increments exactly once.
    if (amount > 0 && providerRow?.userId) {
      await recordWalletEarning({ userId: providerRow.userId, amount, client: tx });
    }

    // Display-only customer ledger entry: a completed job records the amount the
    // customer paid the provider directly. The customer wallet is a spend
    // showcase (service + date + amount), NOT a gated account — the debit runs
    // negative freely, exactly like the decline service fee.
    if (amount > 0) {
      await debitWalletAllowNegative({
        userId: booking.customerId,
        amount,
        category: 'BOOKING_PAYMENT',
        referenceType: 'BOOKING',
        referenceId: bookingId,
        description: `${serviceLabel} — ₹${amount} paid directly to the provider on completion`,
        client: tx
      });
    }

    let lead = null;
    const existingLead = await tx.lead.findUnique({ where: { bookingId } });
    if (existingLead) {
      lead = await tx.lead.update({
        where: { id: existingLead.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });
      await tx.leadAssignmentHistory.updateMany({
        where: { leadId: existingLead.id, isCurrent: true },
        data: { status: 'COMPLETED', actionAt: new Date() }
      });
    }

    // The trip is over — every recorded ping of this booking is worthless now.
    // Delete the rows (and the stale live fix) inside this transaction so the
    // completed booking can never leave location crumbs behind.
    await clearLocationHistory({ bookingId, client: tx });

    return {
      booking: updated,
      lead,
      earnings,
      commission,
      promotion
    };
  });
}

/**
 * Reassign a lead to another eligible provider (deterministic order, no
 * ranking), skipping everyone who was already offered it. Reopens a cancelled
 * booking for a new provider when possible. Runs inside `client`'s transaction.
 *
 * Returns { nextProvider, lead, booking } or throws when nothing found.
 */
async function redistributeInTx({ leadId, reason = 'REJECTED', details = null, expectedProviderId = null, client }) {
  const lead = await client.lead.findUnique({ where: { id: leadId }, include: { booking: true } });
  if (!lead) throw serviceError('LEAD_NOT_FOUND', 'Lead not found.');
  if (['ACCEPTED', 'COMPLETED'].includes(lead.status)) {
    return { nextProvider: null, lead, booking: lead.booking };
  }
  if (expectedProviderId != null && lead.providerId && lead.providerId !== expectedProviderId) {
    // A concurrent cancellation already re-pointed this lead to another
    // provider — the caller's cancel was effectively handled. Never re-transfer
    // a lead that has already moved on.
    return { nextProvider: null, lead, booking: lead.booking, settled: false, alreadyHandled: true };
  }

  const tried = await client.leadAssignmentHistory.findMany({
    where: { leadId },
    select: { providerId: true }
  });
  const triedIds = [...new Set(tried.map((t) => t.providerId).filter(Boolean))];
  if (lead.providerId) triedIds.push(lead.providerId);

  const booking = lead.booking;
  let customerLat = null;
  let customerLng = null;
  if (lead.customerId) {
    const customerUser = await client.user.findUnique({
      where: { id: lead.customerId },
      select: { latitude: true, longitude: true }
    });
    customerLat = customerUser?.latitude ?? null;
    customerLng = customerUser?.longitude ?? null;
  }
  const candidates = await findEligibleProviders({
    serviceCategory: lead.serviceCategory,
    serviceId: lead.serviceId,
    excludeProviderIds: triedIds,
    customerLat,
    customerLng,
    client
  });

  if (!candidates.length) {
    return { nextProvider: null, lead, booking, exhausted: true };
  }

  const nextProvider = candidates[0];
  const leadTimeoutSeconds = 86400;
  const expiryTime = new Date(Date.now() + leadTimeoutSeconds * 1000);

  await client.leadAssignmentHistory.updateMany({
    where: { leadId, isCurrent: true },
    data: { isCurrent: false }
  });
  await client.leadAssignmentHistory.create({
    data: { leadId, providerId: nextProvider.id, status: 'NEW', isCurrent: true, assignedAt: new Date() }
  });
  await client.leadTransferHistory.create({
    data: {
      leadId,
      fromProviderId: lead.providerId,
      toProviderId: nextProvider.id,
      reason,
      details: details ? { ...details, note: 'Lead reassigned to another eligible provider' } : { note: 'Lead reassigned to another eligible provider' }
    }
  });

  const updatedLead = await client.lead.update({
    where: { id: leadId },
    data: { providerId: nextProvider.id, status: 'NEW', expiryTime, transferCount: { increment: 1 }, distanceKm: nextProvider.distanceKm ?? null }
  });

  await recordLeadOffered(nextProvider.id, client);

  let updatedBooking = booking;
  if (booking && ['PENDING', 'CONFIRMED', 'CANCELLED'].includes(booking.status)) {
    const claimed = await client.booking.updateMany({
      where: { id: booking.id, status: { in: ['PENDING', 'CONFIRMED', 'CANCELLED'] } },
      data: {
        providerId: nextProvider.id,
        status: 'PENDING',
        cancelledBy: null,
        cancelledReason: null,
        statusHistory: {
          push: {
            status: 'PENDING',
            timestamp: new Date().toISOString(),
            note: `Lead reassigned to the next available provider (${reason}).`
          }
        }
      }
    });
    if (claimed.count > 0) {
      updatedBooking = await client.booking.findUnique({ where: { id: booking.id } });
      await client.bookingEvent.create({
        data: {
          bookingId: booking.id,
          actorRole: 'SYSTEM',
          action: 'LEAD_REASSIGNED',
          note: `Lead reassigned to the next available provider (${reason}).`
        }
      });
    }
  }

  return { nextProvider, lead: updatedLead, booking: updatedBooking, exhausted: false };
}

/**
 * Terminal settlement for a lead that could not be reassigned: mark the lead
 * EXPIRED and, when the booking is still open, cancel it so the customer can
 * re-book. Pass `cancelBookingOnSettle: false` to keep the booking PENDING
 * instead (e.g. after the 24-hour response window elapses) so an admin can
 * review and manually handle it. Runs inside `client`'s transaction.
 */
async function settleLeadInTx({ leadId, booking, reason = 'NO_PROVIDER', client, cancelBookingOnSettle = true }) {
  const lead = await client.lead.update({
    where: { id: leadId },
    data: { status: 'EXPIRED', lastRejectReason: reason }
  });

  let updatedBooking = booking;
  if (cancelBookingOnSettle && booking && ['PENDING', 'CONFIRMED'].includes(booking.status)) {
    updatedBooking = await client.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        cancelledBy: 'SYSTEM',
        cancelledReason: 'No available provider accepted the request.',
        statusHistory: {
          push: {
            status: 'CANCELLED',
            timestamp: new Date().toISOString(),
            note: 'Auto-cancelled: no available provider accepted the request.'
          }
        }
      }
    });
    await client.bookingEvent.create({
      data: {
        bookingId: booking.id,
        actorRole: 'SYSTEM',
        action: 'STATUS_CANCELLED',
        note: 'No available provider accepted the request.'
      }
    });

    // Cancel makes the trip over too — drop the pings and stale live fix in the
    // same transaction so an auto-cancelled booking keeps no location data.
    await clearLocationHistory({ bookingId: booking.id, client });
  }

  return { nextProvider: null, lead, booking: updatedBooking ?? booking, exhausted: true, settled: true };
}

/**
 * Public redistribute — wraps `redistributeInTx` in its own transaction when
 * the caller is not already inside one and resolves final notifications.
 */
export async function redistributeLead({ leadId, reason = 'REJECTED', details = null, expectedProviderId = null, client = prisma, cancelBookingOnSettle = true }) {
  return withClientTransaction(client, async (tx) => {
    const result = await redistributeInTx({ leadId, reason, details, expectedProviderId, client: tx });

    if (result.exhausted || !result.nextProvider) {
      return settleLeadInTx({ leadId, booking: result.booking, reason, client: tx, cancelBookingOnSettle });
    }

    return { ...result, reassigned: true };
  });
}

/**
 * Provider declines / rejects a PENDING lead. With broadcast offers the
 * provider only withdraws their own offer — the booking stays PENDING for every
 * other provider who still has an open offer. When the last open offer is
 * withdrawn the lead is settled (EXPIRED) and the booking cancelled.
 */
export async function rejectLead({ leadId, providerId, reason, client = prisma }) {
  return withClientTransaction(client, async (tx) => {
    // Must load the booking relation: `settleLeadInTx` cancels the booking when
    // the last open offer is withdrawn, and the re-point below reassigns the
    // booking's owner — both need `lead.booking`. Without `include` the booking
    // stays PENDING forever after the final provider declines.
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
      include: { booking: true }
    });
    if (!lead) throw serviceError('LEAD_NOT_FOUND', 'Lead not found.');
    if (['ACCEPTED', 'COMPLETED'].includes(lead.status)) {
      throw serviceError('LEAD_SETTLED', 'This lead has already been accepted.');
    }

    const withdrawn = await tx.leadAssignmentHistory.updateMany({
      where: { leadId, providerId, isCurrent: true },
      data: { status: 'REJECTED', isCurrent: false, actionAt: new Date(), reason: reason || 'PROVIDER_DECLINED' }
    });
    if (withdrawn.count > 0) {
      await recordLeadRejected(providerId, tx);
    }

    const remaining = await tx.leadAssignmentHistory.count({
      where: { leadId, isCurrent: true }
    });

    if (remaining > 0) {
      // The request goes back into the open pool: it has NO owner until one of
      // the remaining offers accepts. (It used to be re-pointed at the next
      // remaining offer, which just moved the phantom owner around and made a
      // declined job look assigned in the customer's booking list.)
      let updatedLead = lead;
      if (lead.providerId) {
        updatedLead = await tx.lead.update({ where: { id: leadId }, data: { providerId: null } });
      }
      let updatedBooking = lead.booking;
      if (lead.booking?.providerId) {
        updatedBooking = await tx.booking.update({
          where: { id: lead.booking.id },
          data: { providerId: null }
        });
      }
      return { lead: updatedLead, booking: updatedBooking, remaining, settled: false };
    }

    return settleLeadInTx({ leadId, booking: lead.booking, reason: 'REJECTED', client: tx });
  });
}

/**
 * Close every open broadcast offer for a lead (customer/admin cancelled, etc.).
 * Returns the provider user ids that held an open offer so callers can notify
 * them in realtime.
 */
export async function cancelOpenOffers({ leadId, reason = 'CANCELLED', client = prisma }) {
  return withClientTransaction(client, async (tx) => {
    const open = await tx.leadAssignmentHistory.findMany({
      where: { leadId, isCurrent: true },
      select: {
        providerId: true,
        provider: { select: { user: { select: { id: true } } } }
      }
    });
    await tx.leadAssignmentHistory.updateMany({
      where: { leadId, isCurrent: true },
      data: { status: 'CANCELLED', isCurrent: false, actionAt: new Date(), reason }
    });
    return {
      count: open.length,
      // Pairs, so a caller notifying each offer holder can scope the payload to
      // that provider (see `redactLeadForProvider`) without a second query.
      offers: open
        .filter((o) => o.providerId && o.provider?.user?.id)
        .map((o) => ({ providerId: o.providerId, userId: o.provider.user.id })),
      providerIds: [...new Set(open.map((o) => o.providerId).filter(Boolean))],
      providerUserIds: [...new Set(open.map((o) => o.provider?.user?.id).filter(Boolean))]
    };
  });
}

/** Provider has looked at the lead — NEW → VIEWED (does not consume a lead). */
export async function markLeadViewed({ leadId, providerId, client = prisma }) {
  const lead = await client.lead.findUnique({ where: { id: leadId } });
  if (!lead) return null;
  if (lead.providerId !== providerId) {
    const offer = await client.leadAssignmentHistory.findFirst({
      where: { leadId, providerId, isCurrent: true },
      select: { id: true }
    });
    if (!offer) return null;
  }
  if (lead.status === 'NEW') {
    await client.lead.update({ where: { id: leadId }, data: { status: 'VIEWED', viewedAt: new Date() } });
    await client.leadAssignmentHistory.updateMany({
      where: { leadId, providerId, isCurrent: true },
      data: { status: 'VIEWED', actionAt: new Date() }
    });
  }
  // The provider opening the lead IS their review of the "new lead" alert —
  // consume it (read-once, advisory, never throws).
  try {
    const providerUser = await client.provider?.findUnique?.({ where: { id: providerId }, select: { userId: true } });
    if (providerUser?.userId) {
      await consumeAlertsByData({ userId: providerUser.userId, type: 'LEAD', key: 'leadId', value: leadId, client });
    }
  } catch {
    /* alert cleanup is advisory */
  }
  return client.lead.findUnique({ where: { id: leadId } });
}

/**
 * Ledger + booking view of a single lead.
 *
 * `viewerProviderId` is the provider reading this. When supplied, the customer's
 * phone number / full address / instructions are redacted unless that provider
 * is the one who accepted the request. Admins and the customer read the full
 * shape (omit the option) — they are entitled to it.
 */
export async function getLeadWithHistory(leadId, client = prisma, { viewerProviderId = null } = {}) {
  const lead = await client.lead.findUnique({
    where: { id: leadId },
    include: {
      customer: { select: { id: true, name: true, phone: true, avatar: true } },
      provider: {
        include: { user: { select: { id: true, name: true, avatar: true, phone: true } } }
      },
      assignmentHistory: {
        orderBy: { assignedAt: 'asc' },
        include: { provider: { select: { id: true, providerLevel: true, user: { select: { name: true } } } } }
      },
      transferHistory: { orderBy: { transferredAt: 'asc' } },
      booking: true,
      cancellationReasons: true
    }
  });

  if (!lead) return lead;
  return viewerProviderId ? redactLeadForProvider(lead, viewerProviderId) : lead;
}

/**
 * Leads a provider is currently offered (open broadcast offer) or assigned to.
 * Auto-cancelled offers (another provider accepted first) drop out of the inbox.
 */
export async function listProviderLeads(providerId, client = prisma) {
  const leads = await client.lead.findMany({
    where: {
      OR: [{ providerId }, { assignmentHistory: { some: { providerId, isCurrent: true } } }]
    },
    include: {
      customer: { select: { id: true, name: true, phone: true, avatar: true } },
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          // Needed to decide whether THIS provider may see the customer's
          // contact details + exact address (only the accepting owner may).
          providerId: true,
          serviceCategory: true,
          service: { select: { id: true, name: true, serviceNumber: true } },
          locationAddress: true,
          city: true,
          instructions: true,
          amount: true,
          providerPhase: true,
          serviceLatitude: true,
          serviceLongitude: true,
          endLocation: true,
          providerLatitude: true,
          providerLongitude: true,
          providerLocationUpdatedAt: true,
          createdAt: true,
          quotations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              serviceFee: true,
              items: true,
              totalAmount: true,
              status: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // The provider inbox consumes a single latest quotation (`booking.quotation`),
  // matching the customer-side serializer — normalize the array the query
  // returns into that stable shape and drop the raw list from the payload.
  return leads.map((lead) => {
    if (lead.booking) {
      const latest = lead.booking.quotations?.[0] || null;
      lead.booking = {
        ...lead.booking,
        quotation: latest
          ? {
              id: latest.id,
              serviceFee: latest.serviceFee,
              items: latest.items,
              totalAmount: latest.totalAmount,
              status: latest.status,
              createdAt: latest.createdAt,
              updatedAt: latest.updatedAt
            }
          : null
      };
      delete lead.booking.quotations;
    }
    // An open broadcast offer is redacted: only the provider who accepted the
    // request sees the phone number, the full address and the instructions.
    return redactLeadForProvider(lead, providerId);
  });
}

/** Leads a customer has created. */
export async function listCustomerLeads(customerId, client = prisma) {
  return client.lead.findMany({
    where: { customerId },
    include: {
      provider: { include: { user: { select: { id: true, name: true, avatar: true, phone: true } } } },
      booking: { select: { id: true, bookingNumber: true, status: true, serviceCategory: true, service: { select: { id: true, name: true, serviceNumber: true } }, amount: true, createdAt: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

/** Admin view of every lead with pagination + optional status filter. */
export async function listAllLeads({ status, page = 1, limit = 50, client = prisma } = {}) {
  const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)));
  const where = status ? { status } : {};
  const [leads, total] = await Promise.all([
    client.lead.findMany({
      where,
      skip,
      take: Math.min(100, Math.max(1, parseInt(limit))),
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        provider: { select: { id: true, providerLevel: true, user: { select: { name: true } } } },
booking: {
          select: { id: true, bookingNumber: true, status: true, serviceCategory: true, service: { select: { id: true, name: true, serviceNumber: true } }, amount: true, createdAt: true, quotations: { orderBy: { createdAt: 'desc' }, take: 1 } }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    client.lead.count({ where })
  ]);
  return {
    leads,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / Math.min(100, Math.max(1, parseInt(limit))))
    }
  };
}

export { withClientTransaction };
