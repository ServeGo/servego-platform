import prisma from '../prisma/client.js';
import { getConfig } from './adminConfigService.js';
import { levelRank, applyPromotion } from './providerLevelService.js';
import {
  recordLeadOffered,
  recordLeadAccepted,
  recordLeadRejected,
  recordJobCompleted
} from './providerPerformanceService.js';
import { consumeLeadOnCompletion, subscriptionIsActive } from './subscriptionService.js';
import { isAccountOverdue } from './platformFeeService.js';
import { refreshProviderReputation } from './providerReputationService.js';
import { creditWallet } from './walletService.js';
import { normalizeBookingStatus } from '../utils/workflow.js';

/** Run `fn` inside a transaction unless the caller already provided a transaction client. */
function withClientTransaction(client, fn) {
  if (client === prisma) {
    return prisma.$transaction(fn, { isolationLevel: 'Serializable', maxWait: 20000, timeout: 30000 });
  }
  return fn(client);
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
 * Lightweight socket-safe payload used by `newLead`, `leadExpired` and other
 * real-time lead events so the frontend does not have to re-fetch.
 */
export function buildLeadPayload(lead, booking = null, provider = null) {
  const customer = booking?.customer ?? lead?.customer ?? null;
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
      ? { id: customer.id, name: customer.name, phone: customer.phone, avatar: customer.avatar }
      : null,
    booking: booking
      ? {
          id: booking.id,
          status: booking.status,
          locationAddress: booking.locationAddress,
          city: booking.city,
          instructions: booking.instructions,
          amount: booking.amount
        }
      : null,
    provider: provider
      ? { id: provider.id, userId: provider.user?.id, name: provider.user?.name, rating: provider.rating }
      : null
  };
}

/**
 * Rank a list of eligible providers using the recommended priority order:
 * Distance → Rating → Provider Level → Acceptance Rate → Cancellation Rate →
 * Response Rate → Experience → Reviews → Service Fee, with Premium-before-
 * General as the final tie-breaker and a deterministic createdAt fallback.
 */
function rankProviders(providers, distanceMap) {
  return [...providers].sort((a, b) => {
    const da = distanceMap.get(a.id);
    const db = distanceMap.get(b.id);
    if (da == null && db == null) {
      // equal — fall through
    } else if (da == null) {
      return 1;
    } else if (db == null) {
      return -1;
    } else if (da !== db) {
      return da - db;
    }

    if (b.rating !== a.rating) return (Number(b.rating) || 0) - (Number(a.rating) || 0);

    const la = levelRank(a.providerLevel);
    const lb = levelRank(b.providerLevel);
    if (la !== lb) return lb - la;

    const aa = Number(a.performance?.acceptanceRate ?? 0);
    const ab = Number(b.performance?.acceptanceRate ?? 0);
    if (aa !== ab) return ab - aa;

    const ca = Number(a.performance?.cancellationRate ?? 0);
    const cb = Number(b.performance?.cancellationRate ?? 0);
    if (ca !== cb) return ca - cb;

    const ra = Number(a.performance?.responseRate ?? 0);
    const rb = Number(b.performance?.responseRate ?? 0);
    if (ra !== rb) return rb - ra;

    if (b.experienceYears !== a.experienceYears) return Number(b.experienceYears) - Number(a.experienceYears);

    if (b.reviewCount !== a.reviewCount) return Number(b.reviewCount) - Number(a.reviewCount);

    const fa = Number(a.serviceFee ?? 0);
    const fb = Number(b.serviceFee ?? 0);
    if (fa !== fb) return fa - fb;

    if (a.sector !== b.sector) return a.sector === 'PREMIUM' ? -1 : 1;

    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

/**
 * Find providers eligible for a new/transferred lead.
 *
 * Eligibility (rule 11): approved (account ACTIVE + verified), available (online
 * + accepting bookings), correct category + sector, effective subscription
 * ACTIVE with remaining leads (rule 3), inside the provider's service radius
 * (rule 6), not in cooldown, not busy with an active job. Returns providers
 * sorted by the ranking algorithm (rule 7).
 *
 * The pipeline is "progressively cheaper":
 *   1. PostgreSQL does the filtering — every hard eligibility rule (including
 *      cooldown, platform-fee arrears and the service radius) is a WHERE clause,
 *      so only a small candidate set is ever loaded into Node. The radius uses a
 *      cheap bounding box that is provably a superset of the true circle (the
 *      box is sized to the largest effective radius among candidates), so the
 *      box never wrongly excludes a far-radius provider.
 *   2. Only the small candidate set is ranked in Node.
 *   3. Ranking (via `rankProviders`) is the final step before assignment.
 *
 * The provider's own `maxRadiusKm` wins; otherwise the admin default radius is
 * used. When customer coordinates are known the radius filter is mandatory —
 * providers without usable coordinates are not eligible for that lead.
 */
export async function findEligibleProviders({
  serviceCategory,
  serviceId = null,
  excludeProviderIds = [],
  customerLat = null,
  customerLng = null,
  client = prisma
}) {
  const platformFeeEnabled = await getConfig('platformFeeEnabled', true, client);
  const defaultKm = 50;
  const now = new Date();
  const hasCustomerCoords = customerLat != null && customerLng != null;

  // Step 1 — every hard rule below runs in PostgreSQL, not Node.
  const baseWhere = {
    id: excludeProviderIds.length ? { notIn: excludeProviderIds } : undefined,
    isVerified: true,
    accountStatus: 'ACTIVE',
    user: { status: 'ACTIVE' },
    isOnline: true,
    acceptingBookings: true,
    // Rule 3 — effective subscription active: remaining leads > 0, paid, and
    // the subscription itself not failed/cancelled.
    subscription: {
      is: {
        remainingLeads: { gt: 0 },
        status: { notIn: ['FAILED', 'CANCELLED'] },
        paymentStatus: 'PAID'
      }
    },
    // Not busy with an active job.
    bookings: { none: { status: { in: ['PENDING', 'CONFIRMED', 'ONGOING'] } } },
    ...(serviceId
      ? { providerServices: { some: { serviceId } } }
      : {
          OR: [
            { category: { equals: serviceCategory, mode: 'insensitive' } },
            {
              providerServices: {
                some: { service: { name: { equals: serviceCategory, mode: 'insensitive' } } }
              }
            }
          ]
        })
  };

  const where = {
    AND: [
      baseWhere,
      // Rule 3 — not in cooldown: no performance row, no cooldown set, or the
      // cooldown window has already passed.
      {
        OR: [
          { performance: { is: null } },
          { performance: { is: { cooldownUntil: null } } },
          { performance: { is: { cooldownUntil: { lte: now } } } }
        ]
      }
    ]
  };

  // Rule 10 — the monthly platform fee must be up to date. Pushed into SQL too;
  // providers without an account yet (lazily created) are never overdue.
  if (Boolean(platformFeeEnabled)) {
    where.AND.push({
      OR: [
        { user: { platformFeeAccount: { is: null } } },
        {
          user: {
            platformFeeAccount: {
              is: {
                OR: [
                  { status: 'DISABLED' },
                  { status: { not: 'OVERDUE' }, OR: [{ periodEnd: null }, { periodEnd: { gte: now } }] }
                ]
              }
            }
          }
        }
      ]
    });
  }

  // Rule 6 — service radius as a cheap bounding box. The box must be a superset
  // of the true circle, so it is sized to the largest effective radius among
  // candidates (a provider may set maxRadiusKm larger than the admin default).
  // The precise haversine check still runs in Node — but only on this subset.
  if (hasCustomerCoords) {
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
      providerLevel: true,
      experienceYears: true,
      reviewCount: true,
      serviceFee: true,
      latitude: true,
      longitude: true,
      maxRadiusKm: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          avatar: true,
          phone: true,
          platformFeeAccount: { select: { status: true, periodEnd: true } }
        }
      },
      subscription: {
        select: { level: true, remainingLeads: true, sector: true, status: true, paymentStatus: true }
      },
      performance: {
        select: { cooldownUntil: true, acceptanceRate: true, cancellationRate: true, responseRate: true }
      }
    }
  });

  // Step 2 — rank only the candidates. The guards below are cheap defense-in-
  // depth on the small set; the SQL WHERE clauses already enforce the same rules.
  const distanceMap = new Map();
  for (const p of providers) {
    if (hasCustomerCoords && p.latitude != null && p.longitude != null) {
      distanceMap.set(p.id, haversineKm(customerLat, customerLng, p.latitude, p.longitude));
    } else {
      distanceMap.set(p.id, null);
    }
  }

  const eligible = providers.filter((p) => {
    // Rule 3 — effective subscription active (redundant guard; SQL enforces it).
    if (!subscriptionIsActive(p.subscription, { provider: p, performance: p.performance })) {
      return false;
    }
    // Rule 10 — platform fee up to date (redundant guard; SQL enforces it).
    if (Boolean(platformFeeEnabled) && isAccountOverdue(p.user.platformFeeAccount)) {
      return false;
    }

    // Rule 6 — precise radius check on the SQL-shrunk candidate set.
    const km = distanceMap.get(p.id);
    if (hasCustomerCoords) {
      if (km == null) return false;
      const providerRadius = Number(p.maxRadiusKm ?? defaultKm) || defaultKm;
      if (km > providerRadius) return false;
    }
    return true;
  });

  return rankProviders(eligible, distanceMap);
}

/** Diagnose why a specific preferred provider is not in the eligible pool. */
async function diagnoseProvider(providerId, { serviceId = null, serviceCategory = null }, client) {
  const provider = await client.provider.findUnique({
    where: { id: providerId },
    include: { subscription: true, performance: true, user: { select: { status: true, platformFeeAccount: true } } }
  });
  if (!provider) return { code: 'PROVIDER_NOT_FOUND', message: 'Provider not found.' };
  if (!provider.isVerified) return { code: 'NOT_VERIFIED', message: 'This provider has not been verified yet and cannot accept bookings.' };
  if (provider.accountStatus !== 'ACTIVE' || provider.user?.status !== 'ACTIVE') {
    return { code: 'PROVIDER_UNAVAILABLE', message: 'This provider is not currently accepting new bookings.' };
  }
  if (provider.isOnline === false || provider.acceptingBookings === false) {
    return { code: 'PROVIDER_UNAVAILABLE', message: 'This provider is not currently accepting new bookings.' };
  }
  if (provider.performance?.cooldownUntil && new Date(provider.performance.cooldownUntil) > new Date()) {
    return { code: 'PROVIDER_IN_COOLDOWN', message: 'This provider is temporarily paused due to repeated cancellations.' };
  }
  if (!subscriptionIsActive(provider.subscription, { provider, performance: provider.performance })) {
    return { code: 'SUBSCRIPTION_INACTIVE', message: 'This provider has used all their booking leads and cannot receive new requests.' };
  }
  const platformFeeEnabled = await getConfig('platformFeeEnabled', true, client);
  if (Boolean(platformFeeEnabled) && isAccountOverdue(provider.user?.platformFeeAccount)) {
    return { code: 'PLATFORM_FEE_OVERDUE', message: 'This provider has an overdue platform fee and cannot receive new leads.' };
  }
  if (serviceId || serviceCategory) {
    const categoryMatches = serviceCategory
      ? String(provider.category || '').trim().toLowerCase() === categoryKey
      : true;
    const approved = serviceId
      ? await client.providerService.findFirst({
          where: { providerId, serviceId },
          select: { id: true }
        })
      : categoryMatches
        ? { id: true }
        : await client.providerService.findFirst({
            where: {
              providerId,
              service: { name: { equals: serviceCategory, mode: 'insensitive' } }
            },
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
 * (approved, online, accepting bookings, inside the service radius, and with a
 * valid effective subscription) at the same time — first-accept-wins. The
 * booking is created against the top-ranked provider (`Booking.providerId` is
 * required) but every eligible provider receives an open offer via
 * `LeadAssignmentHistory` (`isCurrent: true`) and can accept it.
 *
 * - With `preferredProviderId`: that provider is ranked first (when eligible);
 *   otherwise a descriptive 409-ish error is thrown.
 * - When no eligible provider exists the booking is rejected with
 *   `NO_ELIGIBLE_PROVIDERS`.
 *
 * Returns { booking, lead, provider, providers, rankedCount }. Socket emission
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
  client = prisma
}) {
  // Provider matching is a read-only pass, so it runs before the Serializable
  // transaction — the transaction below only creates the booking and its lead.
  // The broadcast model (first-accept-wins) tolerates a provider going offline
  // in the short window before the open offers are written.
  let ranked = await findEligibleProviders({
    serviceCategory,
    serviceId,
    excludeProviderIds: [],
    customerLat,
    customerLng,
    client
  });

  if (preferredProviderId) {
    const preferred = ranked.find((p) => p.id === preferredProviderId);
    if (!preferred) {
      const diagnosis = await diagnoseProvider(preferredProviderId, { serviceId, serviceCategory }, client);
      throw serviceError(diagnosis.code, diagnosis.message);
    }
    ranked = [preferred, ...ranked.filter((p) => p.id !== preferredProviderId)];
  }

  if (!ranked.length) {
    throw serviceError(
      'NO_ELIGIBLE_PROVIDERS',
      'No eligible providers are available for this request right now. Please try again later.'
    );
  }

  return withClientTransaction(client, async (tx) => {
    const assignedProvider = ranked[0];
    const timestamp = new Date();

    const baseAmount = amount != null && !Number.isNaN(Number(amount)) ? Number(amount) : null;

    // Per-booking platform charges were removed in favour of the monthly
    // platform fee. The customer pays the base amount and the provider keeps
    // the full amount (the booking columns are kept for historical shape).
    const booking = await tx.booking.create({
      data: {
        customerId,
        providerId: assignedProvider.id,
        serviceId: serviceId || null,
        serviceCategory,
        locationAddress,
        city,
        instructions,
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
    // (ranked[0]) remains the booking/lead owner until one of them accepts.
    await tx.leadAssignmentHistory.createMany({
      data: ranked.map((p) => ({
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

    return { booking, lead: assignedLead, provider: assignedProvider, providers: ranked, rankedCount: ranked.length };
  });
}

/**
 * Provider accepts a PENDING lead: PENDING → CONFIRMED (booking) and
 * NEW/VIEWED → ACCEPTED (lead), atomically and first-accept-wins. Any provider
 * with an open offer (`LeadAssignmentHistory.isCurrent`) may accept; everyone
 * else's open offer is auto-cancelled. Returns the booking, the accepted lead
 * and the providers whose offers were cancelled.
 */
export async function acceptLeadForBooking({ bookingId, providerId, client = prisma }) {
  return withClientTransaction(client, async (tx) => {
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

    const updated = await tx.booking.updateMany({
      where: { id: bookingId, status: 'PENDING' },
      data: {
        providerId,
        status: 'CONFIRMED',
        statusHistory: { push: { status: 'CONFIRMED', timestamp: new Date().toISOString(), note: 'Provider accepted the booking request' } }
      }
    });
    if (updated.count === 0) {
      throw serviceError('ACCEPT_RACE', 'This booking has already been handled. Another provider accepted it first.');
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
        accepted = await tx.lead.findUnique({ where: { id: lead.id } });
      }
    }

    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    return { booking, lead: accepted, cancelledProviders };
  });
}

/**
 * Provider starts work on a CONFIRMED booking: CONFIRMED → ONGOING. The only
 * legal source state is CONFIRMED; a compare-and-swap on `status` makes a
 * double-tap or a stale client fail atomically instead of double-transitioning.
 * Returns the updated booking.
 */
export async function startBookingWork({ bookingId, actorId, actorRole = 'provider', note = null, client = prisma }) {
  return withClientTransaction(client, async (tx) => {
    const transitioned = await tx.booking.updateMany({
      where: { id: bookingId, status: 'CONFIRMED' },
      data: {
        status: 'ONGOING',
        startedAt: new Date(),
        statusHistory: { push: { status: 'ONGOING', timestamp: new Date().toISOString(), note: note || 'Work started' } }
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
        statusHistory: { push: { status: 'COMPLETED', timestamp: new Date().toISOString(), note: 'Booking completed by provider' } }
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

    // Per-booking platform charges were removed; the provider keeps the full
    // booking amount (the monthly platform fee replaces commission).
    const amount = Number(booking.amount) || 0;
    const commission = 0;
    const earnings = amount;

    await tx.booking.update({
      where: { id: bookingId },
      data: { providerPlatformCharge: commission, providerPayout: earnings }
    });

    const jobDurationMs = booking.startedAt ? Math.max(0, Date.now() - new Date(booking.startedAt).getTime()) : null;
    await recordJobCompleted(providerId, amount, commission, { jobDurationMs, client: tx });
    await refreshProviderReputation(providerId, tx);
    const promotion = await applyPromotion(providerId, tx);
    const subscription = await consumeLeadOnCompletion(providerId, tx);

    // Credit the provider's wallet with their net payout for this job.
    if (earnings > 0) {
      const providerRow = await tx.provider.findUnique({ where: { id: providerId }, select: { userId: true } });
      if (providerRow?.userId) {
        await creditWallet({
          userId: providerRow.userId,
          amount: earnings,
          category: 'BOOKING_EARNING',
          referenceType: 'BOOKING',
          referenceId: bookingId,
          description: `Earnings for completed ${booking.serviceCategory || 'service'} booking`,
          client: tx
        });
      }
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
      promotion,
      subscription: {
        remainingLeads: subscription.remainingLeads,
        justExpired: subscription.justExpired,
        lowLeads: subscription.lowLeads
      }
    };
  });
}

/**
 * Reassign a lead to the next ranked eligible provider, skipping everyone who
 * was already offered it. Reopens a cancelled booking for a new provider when
 * possible. Runs inside `client`'s transaction.
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
      details: details ? { ...details, note: 'Lead reassigned to next ranked provider' } : { note: 'Lead reassigned to next ranked provider' }
    }
  });

  const updatedLead = await client.lead.update({
    where: { id: leadId },
    data: { providerId: nextProvider.id, status: 'NEW', expiryTime, transferCount: { increment: 1 } }
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
      // declining provider (who may have been ranked[0]) stops owning them.
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

/** Close every open broadcast offer for a lead (customer/admin cancelled, etc.). */
export async function cancelOpenOffers({ leadId, reason = 'CANCELLED', client = prisma }) {
  return withClientTransaction(client, async (tx) => {
    return tx.leadAssignmentHistory.updateMany({
      where: { leadId, isCurrent: true },
      data: { status: 'CANCELLED', isCurrent: false, actionAt: new Date(), reason }
    });
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
  return client.lead.findUnique({ where: { id: leadId } });
}

/** Ledger + booking view of a single lead. */
export async function getLeadWithHistory(leadId, client = prisma) {
  return client.lead.findUnique({
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
}

/**
 * Leads a provider is currently offered (open broadcast offer) or assigned to.
 * Auto-cancelled offers (another provider accepted first) drop out of the inbox.
 */
export async function listProviderLeads(providerId, client = prisma) {
  return client.lead.findMany({
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
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
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
        booking: { select: { id: true, status: true, serviceCategory: true, amount: true, createdAt: true } }
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
