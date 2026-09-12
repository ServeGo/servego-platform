import prisma from '../prisma/client.js';
import { applyPromotion } from './providerLevelService.js';
import {
  recordLeadOffered,
  recordLeadAccepted,
  recordLeadRejected,
  recordJobCompleted
} from './providerPerformanceService.js';
import { refreshProviderReputation } from './providerReputationService.js';
import { debitWalletAllowNegative } from './walletService.js';
import { getCommissionTiers, computeCommission, round2 } from './quotationService.js';
import { normalizeBookingStatus } from '../utils/workflow.js';
import { consumeAlertsByData } from './alertService.js';
import { nextBusinessNumber } from '../utils/businessNumber.js';
import { appendStatusHistory } from '../utils/statusHistory.js';

// A provider may hold at most this many open leads offers (NEW/VIEWED) at once.
// Declining or accepting one frees a slot for the next eligible lead.
const MAX_OPEN_LEADS = 2;

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

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Lightweight socket-safe payload used by `newLead` and other real-time lead
 * events so the frontend does not have to re-fetch.
 */
export function buildLeadPayload(lead, booking = null, provider = null) {
  const customer = booking?.customer ?? lead?.customer ?? null;
  // Rule: the customer's phone number is only shared with providers while the
  // booking is live. Once it is cancelled the number is stripped from every
  // payload so it can never be re-shown or leaked after cancellation.
  const cancelled = booking?.status === 'CANCELLED';
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
      ? { id: customer.id, name: customer.name, phone: cancelled ? null : customer.phone, avatar: customer.avatar }
      : null,
    booking: booking
      ? {
          id: booking.id,
          bookingNumber: booking.bookingNumber || null,
          status: booking.status,
          locationAddress: booking.locationAddress,
          city: booking.city,
          instructions: booking.instructions,
          amount: booking.amount,
          providerPhase: booking.providerPhase
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
 * Eligibility criteria (rule 11):
 *   - approved — account ACTIVE + verified,
 *   - has the service REGISTERED/approved (`ProviderService` link for the
 *     requested service — the legacy `provider.category` fallback is removed,
 *     a provider is only matchable for a service they actually registered),
 *   - inside the provider's service radius (`maxRadiusKm` vs. customer pin) —
 *     TEMPORARILY DISABLED via the `ENFORCE_SERVICE_RADIUS` flag so providers
 *     without coordinates keep receiving offers,
 *   - wallet balance >= 0 — a negative balance blocks new leads until cleared,
 *   - not busy with an active job,
 *   - below the open-lead cap (`MAX_OPEN_LEADS = 2`).
 *
 * `isOnline`, `acceptingBookings` and cooldown are NOT eligibility gates: a
 * provider who is offline / paused / cooling down still receives offers and
 * decides themselves whether to accept.
 *
 * Providers receive leads without any subscription or quota blockers (rule 3).
 * There is no ranking or "top provider" concept — the returned list is in a
 * deterministic order (createdAt, then id) and every eligible provider is
 * broadcast an open offer; the first entry merely satisfies the required
 * `Booking.providerId` FK until one of them accepts.
 *
 * The pipeline is "progressively cheaper":
 *   1. PostgreSQL does the filtering — every hard eligibility rule (including
 *      the service radius) is a WHERE clause,
 *      so only a small candidate set is ever loaded into Node. The radius uses a
 *      cheap bounding box that is provably a superset of the true circle (the
 *      box is sized to the largest effective radius among candidates), so the
 *      box never wrongly excludes a far-radius provider.
 *   2. Only the small candidate set is filtered further in Node (exact haversine).
 *
 * The provider's own `maxRadiusKm` wins; otherwise the admin default radius is
 * used. When customer coordinates are known the radius filter is mandatory —
 * providers without usable coordinates are not eligible for that lead.
 * (Not currently enforced — see `ENFORCE_SERVICE_RADIUS`.)
 */
export async function findEligibleProviders({
  serviceCategory,
  serviceId = null,
  excludeProviderIds = [],
  customerLat = null,
  customerLng = null,
  client = prisma
}) {
  const defaultKm = 50;
  // TEMPORARY: the service-radius gate is disabled to stop customers seeing
  // "no providers available". Providers without usable coordinates keep
  // receiving offers. Set `ENFORCE_SERVICE_RADIUS` back to true to restore the
  // 50 km (or provider `maxRadiusKm`) area filter — the full logic is retained
  // below so it can be re-enabled without touching the pipeline.
  const ENFORCE_SERVICE_RADIUS = false;
  const hasCustomerCoords = customerLat != null && customerLng != null;

  // Rule — capped inbox: a provider may hold at most MAX_OPEN_LEADS open
  // offers. Providers at the cap (2 open NEW/VIEWED leads) drop out of new
  // broadcasts entirely; declining or accepting one frees a slot so the next
  // eligible lead gets offered. Mirrors what the provider sees in the
  // "Action Required" inbox tab (open = isCurrent offer on a still-open lead).
  const atCap = await client.leadAssignmentHistory.groupBy({
    by: ['providerId'],
    where: { isCurrent: true, lead: { status: { in: ['NEW', 'VIEWED'] } } },
    _count: { _all: true },
    having: { providerId: { _count: { gte: MAX_OPEN_LEADS } } }
  });
  const cappedOutIds = atCap.map((r) => r.providerId);
  const excludedProviderIds = [...excludeProviderIds, ...cappedOutIds];

  // Step 1 — every hard rule below runs in PostgreSQL, not Node.
  const baseWhere = {
    id: excludedProviderIds.length ? { notIn: excludedProviderIds } : undefined,
    isVerified: true,
    accountStatus: 'ACTIVE',
    // Negative wallet balances block new leads until cleared.
    user: {
      status: 'ACTIVE',
      OR: [
        { wallet: { is: null } },
        { wallet: { is: { balance: { gte: 0 } } } }
      ]
    },
    // Not busy with an active job.
    bookings: { none: { status: { in: ['PENDING', 'CONFIRMED', 'ONGOING'] } } },
    // The requested service must be registered (approved `ProviderService`).
    providerServices: {
      some: serviceId
        ? { serviceId }
        : { service: { name: { equals: serviceCategory, mode: 'insensitive' } } }
    }
  };

  const where = { AND: [baseWhere] };

  // Rule 6 — service radius as a cheap bounding box. The box must be a superset
  // of the true circle, so it is sized to the largest effective radius among
  // candidates (a provider may set maxRadiusKm larger than the admin default).
  // The precise haversine check still runs in Node — but only on this subset.
  if (ENFORCE_SERVICE_RADIUS && hasCustomerCoords) {
    const lat = Number(customerLat);
    const lng = Number(customerLng);
    const { _max } = await client.provider.aggregate({
      _max: { maxRadiusKm: true },
      where: baseWhere
    });
    const boxRadiusKm = Math.max(defaultKm, Number(_max.maxRadiusKm) || defaultKm);
    const dLat = boxRadiusKm / 110.574;
    const cosAtPole = Math.cos(Math.min(Math.abs(lat) + dLat, 89) * (Math.PI / 180));
    const dLng = boxRadiusKm / (111.32 * Math.max(cosAtPole, 0.05));
    where.AND.push({
      latitude: { gte: lat - dLat, lte: lat + dLat },
      longitude: { gte: lng - dLng, lte: lng + dLng }
    });
  }

  // Only the small candidate set crosses the wire (select, not include).
  const providers = await client.provider.findMany({
    where,
    select: {
      id: true,
      userId: true,
      rating: true,
      latitude: true,
      longitude: true,
      maxRadiusKm: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          phone: true
        }
      }
    }
  });

  // Deterministic order (createdAt, then id) so the FK-backed owner pick is
  // stable across runs — NOT a preference ranking. Every entry below is a
  // full member of the broadcast; no one is "better" than another.
  const ordered = [...providers].sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    if (da !== db) return da - db;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // Step 2 — filter only the SQL-shrunk candidate set in Node.
  const eligible = [];
  for (const p of ordered) {
    if (ENFORCE_SERVICE_RADIUS && hasCustomerCoords && p.latitude != null && p.longitude != null) {
      const km = haversineKm(customerLat, customerLng, p.latitude, p.longitude);
      p.distanceKm = km;
      const providerRadius = Number(p.maxRadiusKm ?? defaultKm) || defaultKm;
      if (km > providerRadius) continue;
    } else if (ENFORCE_SERVICE_RADIUS && hasCustomerCoords) {
      // Rule 6 — providers without usable coordinates are not eligible.
      p.distanceKm = null;
      continue;
    } else {
      p.distanceKm = null;
    }
    eligible.push(p);
  }

  return eligible;
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
  // Note: `isOnline`, `acceptingBookings` and cooldown are NOT eligibility
  // gates — they do not block a provider from being offered a lead.
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
  const openOffers = await client.leadAssignmentHistory.count({
    where: { providerId, isCurrent: true, lead: { status: { in: ['NEW', 'VIEWED'] } } }
  });
  if (openOffers >= MAX_OPEN_LEADS) {
    return {
      code: 'LEAD_CAP_REACHED',
      message: `This provider already has ${MAX_OPEN_LEADS} open requests. Accept or decline one before taking on more.`
    };
  }
  return { code: 'PROVIDER_INELIGIBLE', message: 'This provider is not currently available for the requested service.' };
}

/**
 * Create a booking together with its first lead assignment, atomically.
 *
 * Temporary-service bookings broadcast the request to EVERY eligible provider
 * (approved, verified, inside the service radius, active account — no
 * subscription or quota gate) at the same time — first-accept-wins. The
 * booking is created against the first eligible provider (`Booking.providerId`
 * is required, so it points at an arbitrary member of the broadcast — the
 * first in the deterministic order; there is no ranking or "top provider") but
 * every eligible provider receives an open offer via `LeadAssignmentHistory`
 * (`isCurrent: true`) and can accept it.
 *
 * - With `preferredProviderId`: that provider is moved to the front (when
 *   eligible); otherwise a descriptive 409-ish error is thrown.
 * - When no eligible provider exists the booking is rejected with
 *   `NO_ELIGIBLE_PROVIDERS`.
 *
 * Returns { booking, lead, provider, providers, eligibleCount }. Socket emission
 * is left to the caller after the transaction commits.
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
    const assignedProvider = eligible[0];
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
        providerId: assignedProvider.id,
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
        distanceKm: assignedProvider.distanceKm ?? null,
        notes: notes || null
      }
    });

    const leadTimeoutSeconds = 86400;
    const expiryTime = new Date(Date.now() + leadTimeoutSeconds * 1000);

    const assignedLead = await tx.lead.update({
      where: { id: lead.id },
      data: { providerId: assignedProvider.id, expiryTime }
    });

    // Broadcast: open the offer to every eligible provider at once. `assignedProvider`
    // (eligible[0]) merely satisfies the required `Booking.providerId` FK and stays
    // the booking/lead owner until one of them accepts — no ranking involved.
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

    return { booking, lead: assignedLead, provider: assignedProvider, providers: eligible, eligibleCount: eligible.length };
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
    // exchange — so the platform's 15% cut is charged as a wallet DEBIT to the
    // provider. If the wallet has no cover the balance runs NEGATIVE: that
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

    if (commission > 0) {
      const providerRow = await tx.provider.findUnique({ where: { id: providerId }, select: { userId: true } });
      if (providerRow?.userId) {
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
    const lead = await tx.lead.findUnique({ where: { id: leadId } });
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
      // Re-point the lead and booking at the next remaining offer so the
      // declining provider (who may have been the nominal owner) stops owning them.
      const nextOffer = await tx.leadAssignmentHistory.findFirst({
        where: { leadId, isCurrent: true },
        orderBy: { assignedAt: 'asc' },
        select: { providerId: true }
      });
      let updatedLead = lead;
      if (nextOffer && lead.providerId !== nextOffer.providerId) {
        updatedLead = await tx.lead.update({ where: { id: leadId }, data: { providerId: nextOffer.providerId } });
      }
      let updatedBooking = lead.booking;
      if (nextOffer && lead.booking && lead.booking.providerId !== nextOffer.providerId) {
        updatedBooking = await tx.booking.update({
          where: { id: lead.booking.id },
          data: { providerId: nextOffer.providerId }
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

/** Ledger + booking view of a single lead. */
export async function getLeadWithHistory(leadId, client = prisma) {
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

  // Cancelled booking → never expose the customer's phone to the provider.
  if (lead?.booking?.status === 'CANCELLED' && lead.customer) {
    lead.customer = { ...lead.customer, phone: null };
  }
  return lead;
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
          status: true,
          serviceCategory: true,
          locationAddress: true,
          city: true,
          instructions: true,
          amount: true,
          providerPhase: true,
          serviceLatitude: true,
          serviceLongitude: true,
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
    if (lead.booking?.status === 'CANCELLED' && lead.customer) {
      lead.customer = { ...lead.customer, phone: null };
    }
    return lead;
  });
}

/** Leads a customer has created. */
export async function listCustomerLeads(customerId, client = prisma) {
  return client.lead.findMany({
    where: { customerId },
    include: {
      provider: { include: { user: { select: { id: true, name: true, avatar: true, phone: true } } } },
      booking: { select: { id: true, status: true, serviceCategory: true, amount: true, createdAt: true } }
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
          select: { id: true, status: true, serviceCategory: true, amount: true, createdAt: true, quotations: { orderBy: { createdAt: 'desc' }, take: 1 } }
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
