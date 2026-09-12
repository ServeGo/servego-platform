import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../prisma/client.js';
import { BookingController } from '../controllers/bookingController.js';
import { cancelLeadExpiry } from '../services/leadExpiryService.js';
import { setQueueEnabled } from '../services/queue/queueService.js';
import {
  findEligibleProviders,
  createBookingWithLead,
  acceptLeadForBooking,
  rejectLead
} from '../services/leadService.js';
import { levelRank, getProviderLevelForJobs, invalidateLevelCache } from '../services/providerLevelService.js';

// ---------------------------------------------------------------------------
// End-to-end test of the booking pipeline: customer books → lead broadcast →
// provider accept/decline rotation → customer re-booking rules → provider
// level prioritisation. Pure unit tests (mocked `client`s), matching the
// quotationDecline.test.js pattern. The five product rules under test:
//
//   1. A booking for service X is broadcast to EVERY eligible provider who has
//      that service approved (first-accept-wins).
//   2. A provider holds at most 2 open leads; declining one frees a slot and
//      the next lead shows up; accepting one closes the other open offers.
//   3. A provider can accept only ONE lead at a time, regardless of service.
//   4. A customer cannot rebook the same service while a booking is active,
//      but may book other services in parallel.
//   5. Distribution is UNRANKED: every eligible provider gets the offer and the
//      FK owner is just the first in deterministic (createdAt, id) order.
//      `isOnline`, `acceptingBookings` and cooldown are NOT eligibility gates.
// ---------------------------------------------------------------------------

// ---- fixtures ---------------------------------------------------------------

const perfRow = {
  id: 'perf-1',
  providerId: 'p1',
  totalLeads: 2,
  acceptedLeads: 1,
  rejectedLeads: 0,
  completedJobs: 0,
  cancelledJobs: 0,
  jobsStarted: 0,
  lateArrivalCount: 0,
  acceptanceRate: 0,
  responseRate: 0,
  cancellationRate: 0
};

function makeProvider(id, opts = {}) {
  return {
    id,
    userId: opts.userId ?? `u-${id}`,
    rating: opts.rating ?? 4.5,
    providerLevel: opts.providerLevel ?? 'BRONZE',
    experienceYears: opts.experienceYears ?? 3,
    reviewCount: opts.reviewCount ?? 10,
    serviceFee: opts.serviceFee ?? 400,
    latitude: opts.latitude ?? null,
    longitude: opts.longitude ?? null,
    maxRadiusKm: opts.maxRadiusKm ?? 50,
    createdAt: opts.createdAt ?? new Date('2024-01-01T00:00:00Z'),
    user: { id: opts.userId ?? `u-${id}`, name: `P ${id}`, avatar: null, phone: '9999999999' },
    performance: opts.performance ?? null,
    // semantic fields consumed by the mock's eligibility filter (the service
    // itself only declares them in the `where` it passes to the DB):
    isVerified: opts.isVerified ?? true,
    accountStatus: opts.accountStatus ?? 'ACTIVE',
    userStatus: opts.userStatus ?? 'ACTIVE',
    walletBalance: opts.walletBalance ?? 0,
    isOnline: opts.isOnline ?? true,
    acceptingBookings: opts.acceptingBookings ?? true,
    activeBooking: opts.activeBooking ?? null,
    approvedServiceIds: opts.approvedServiceIds ?? ['svc-1'],
    approvedServiceCategories: opts.approvedServiceCategories ?? ['Plumbing'],
    cooldownUntil: opts.cooldownUntil ?? null
  };
}

function activeWhere(base) {
  return {
    isVerified: { __seen: true, ...(base?.isVerified ?? {}) },
    accountStatus: base?.accountStatus,
    user: base?.user ? { status: base.user.status, OR: base.user.OR } : null,
    walletGate: !!base?.user?.OR,
    bookingGate: !!base?.bookings?.none,
    serviceGate: !!base?.providerServices?.some,
    serviceId: base?.providerServices?.some?.serviceId ?? null,
    serviceName: base?.providerServices?.some?.service?.name?.equals ?? null,
    excluded: base?.id?.notIn ?? []
  };
}

function passesEligibility(where, p) {
  const base = where?.AND?.[0] ?? where ?? {};
  if (base.isVerified && p.isVerified !== true) return false;
  if (base.accountStatus && p.accountStatus !== base.accountStatus) return false;
  if (base.user) {
    if (base.user.status && p.userStatus !== base.user.status) return false;
    if (p.walletBalance != null && p.walletBalance < 0) return false;
  }
  if (base.bookings?.none) {
    const active = base.bookings.none.status?.in ?? [];
    if (active.length && p.activeBooking != null && active.includes(p.activeBooking)) return false;
  }
  if (base.providerServices) {
    const some = base.providerServices.some ?? {};
    if (some.serviceId) {
      if (!(p.approvedServiceIds ?? []).includes(some.serviceId)) return false;
    } else if (some.service?.name?.equals) {
      const target = String(some.service.name.equals).toLowerCase();
      const cats = (p.approvedServiceCategories ?? []).map((c) => String(c).toLowerCase());
      if (!cats.includes(target)) return false;
    }
  }
  return true;
}

function makeEligibilityClient({ providers, atCap = [] }) {
  const recorded = { groupBy: null, findMany: [], seenGates: null };
  const client = {
    leadAssignmentHistory: {
      groupBy: async (args) => {
        recorded.groupBy = args;
        return atCap.map((providerId) => ({ providerId }));
      }
    },
    provider: {
      aggregate: async (args) => {
        recorded.aggregate = args;
        return { _max: { maxRadiusKm: 50 } };
      },
      findMany: async ({ where }) => {
        recorded.findMany.push(where);
        recorded.seenGates = activeWhere(where?.AND?.[0] ?? where);
        const notIn = new Set((where?.AND?.[0]?.id?.notIn ?? where?.id?.notIn ?? []));
        return providers.filter((p) => !notIn.has(p.id) && passesEligibility(where, p));
      }
    }
  };
  return { client, recorded };
}

// ---- RULE 1: broadcast to every eligible provider ---------------------------

test('RULE 1: booking for service X is offered to every eligible provider who has X approved', async () => {
  const p1 = makeProvider('p1');
  const p2 = makeProvider('p2', { approvedServiceIds: ['svc-1'], rating: 4.9 });
  const p3 = makeProvider('p3', { approvedServiceIds: ['svc-1'] });
  const { client } = makeEligibilityClient({ providers: [p1, p2, p3] });

  const ranked = await findEligibleProviders({ serviceId: 'svc-1', serviceCategory: 'Plumbing', client });

  assert.deepEqual(ranked.map((p) => p.id).sort(), ['p1', 'p2', 'p3']);
});

test('RULE 1: providers without the requested service approved are excluded', async () => {
  const p1 = makeProvider('p1', { approvedServiceIds: ['svc-1'] });
  const p2 = makeProvider('p2', { approvedServiceIds: ['svc-9'] });
  const p3 = makeProvider('p3', { approvedServiceIds: ['svc-1'] });
  const { client } = makeEligibilityClient({ providers: [p1, p2, p3] });

  const ranked = await findEligibleProviders({ serviceId: 'svc-1', serviceCategory: 'Plumbing', client });

  assert.deepEqual(ranked.map((p) => p.id).sort(), ['p1', 'p3']);
});

test('RULE 1: busy, unverified, inactive or negative-wallet providers are excluded', async () => {
  const pOk = makeProvider('p1');
  const pBusy = makeProvider('p2', { activeBooking: 'CONFIRMED' });
  const pOffline = makeProvider('p3', { isOnline: false });
  const pUnverified = makeProvider('p4', { isVerified: false });
  const pInactive = makeProvider('p5', { accountStatus: 'SUSPENDED' });
  const pCooldown = makeProvider('p6', { cooldownUntil: new Date(Date.now() + 60 * 60 * 1000) });
  const pNegativeWallet = makeProvider('p7', { walletBalance: -100 });
  const { client } = makeEligibilityClient({
    providers: [pOk, pBusy, pOffline, pUnverified, pInactive, pCooldown, pNegativeWallet]
  });

  const ranked = await findEligibleProviders({ serviceId: 'svc-1', serviceCategory: 'Plumbing', client });

  assert.deepEqual(ranked.map((p) => p.id), ['p1', 'p3', 'p6'], 'offline and cooling-down providers remain eligible');
});

test('RULE 1: eligibility WHERE carries each hard gate (approved service, verified, wallet, radius-ready); online/accepting/cooldown are NOT gates', async () => {
  const p1 = makeProvider('p1');
  const { client, recorded } = makeEligibilityClient({ providers: [p1] });

  await findEligibleProviders({ serviceId: 'svc-1', serviceCategory: 'Plumbing', client });

  const gates = recorded.seenGates;
  assert.equal(gates.isVerified.__seen, true, 'isVerified filter present');
  assert.equal(gates.accountStatus, 'ACTIVE', 'active account filter present');
  assert.equal(gates.user.status, 'ACTIVE', 'active user filter present');
  assert.equal(gates.walletGate, true, 'wallet gate present');
  assert.equal(gates.isOnline, undefined, 'isOnline is NOT an eligibility gate');
  assert.equal(gates.acceptingBookings, undefined, 'acceptingBookings is NOT an eligibility gate');
  assert.equal(gates.bookingGate, true, 'no-active-booking filter present');
  assert.equal(gates.serviceGate, true, 'approved-service filter present');
  assert.equal(gates.serviceId, 'svc-1', 'serviceId filter pinned to requested service');
});

test('RULE 1: createBookingWithLead broadcasts open offers to EVERY eligible provider (first-accept-wins)', async () => {
  const p1 = makeProvider('p1');
  const p2 = makeProvider('p2', { rating: 4.9 });
  const p3 = makeProvider('p3', { rating: 4.8 });
  const { client } = makeEligibilityClient({ providers: [p1, p2, p3] });

  const creates = [];
  const client2 = {
    ...client,
    businessSequenceCounter: { upsert: async () => ({ value: 1 }) },
    booking: {
      create: async ({ data }) => ({ id: 'b1', ...data })
    },
    bookingEvent: { create: async () => ({}) },
    lead: {
      create: async ({ data }) => ({ id: 'lead-1', ...data }),
      update: async ({ data }) => ({ id: 'lead-1', status: 'NEW', ...data })
    },
    leadAssignmentHistory: {
      createMany: async ({ data }) => {
        creates.push(...data);
        return { count: data.length };
      },
      groupBy: client.leadAssignmentHistory.groupBy
    }
  };

  const result = await createBookingWithLead({
    customerId: 'c1',
    serviceId: 'svc-1',
    serviceCategory: 'Plumbing',
    amount: 500,
    client: client2
  });

  assert.equal(result.eligibleCount, 3, 'all three eligible providers are in the broadcast');
  assert.deepEqual(creates.map((c) => c.providerId).sort(), ['p1', 'p2', 'p3'], 'every provider got an open offer');
  assert.ok(creates.every((c) => c.status === 'NEW' && c.isCurrent === true), 'offers are open (NEW + current)');
});

test('RULE 1: when no provider is eligible the booking is rejected with NO_ELIGIBLE_PROVIDERS', async () => {
  const { client } = makeEligibilityClient({ providers: [] });
  await assert.rejects(
    createBookingWithLead({ customerId: 'c1', serviceId: 'svc-1', serviceCategory: 'Plumbing', client }),
    (err) => err.code === 'NO_ELIGIBLE_PROVIDERS'
  );
});

// ---- RULE 2: max 2 open leads, decline frees a slot, accept closes the rest --

test('RULE 2: providers already holding 2 open leads drop out of new broadcasts', async () => {
  const pAtCap = makeProvider('p1', { rating: 5 });
  const pFree = makeProvider('p2', { rating: 4 });
  const { client, recorded } = makeEligibilityClient({
    providers: [pAtCap, pFree],
    atCap: ['p1'] // p1 holds 2 open NEW/VIEWED offers (MAX_OPEN_LEADS)
  });

  const ranked = await findEligibleProviders({ serviceId: 'svc-1', serviceCategory: 'Plumbing', client });

  assert.deepEqual(ranked.map((p) => p.id), ['p2'], 'capped provider excluded even though highest-rated');
  const capWhere = recorded.groupBy?.where;
  assert.equal(capWhere.isCurrent, true, 'cap counts current offers only');
  assert.deepEqual(capWhere.lead.status.in, ['NEW', 'VIEWED'], 'cap counts open actionable leads only');
});

test('RULE 2: a provider with fewer than 2 open leads keeps receiving leads', async () => {
  const p1 = makeProvider('p1');
  const { client } = makeEligibilityClient({ providers: [p1], atCap: [] });

  const ranked = await findEligibleProviders({ serviceId: 'svc-1', serviceCategory: 'Plumbing', client });

  assert.equal(ranked.length, 1);
});

const baseLead = (overrides = {}) => ({
  id: 'lead-1',
  bookingId: 'b1',
  customerId: 'c1',
  serviceId: 'svc-1',
  serviceCategory: 'Plumbing',
  status: 'NEW',
  providerId: 'p1',
  booking: { id: 'b1', status: 'PENDING', providerId: 'p1' },
  ...overrides
});

function makeRejectClient({ lead = baseLead(), remaining = 1, nextOffer = null, withdrawCount = 1 } = {}) {
  const calls = { withdrawn: [], leadUpdates: [], bookingUpdates: [], bookingEvents: [], expirations: [], cancels: [] };
  const perf = () => ({ ...perfRow });
  const client = {
    lead: {
      findUnique: async () => lead,
      update: async ({ data }) => {
        calls.leadUpdates.push(data);
        if (data.status === 'EXPIRED') calls.expirations.push(data);
        return { ...lead, ...data };
      }
    },
    leadAssignmentHistory: {
      updateMany: async ({ where, data }) => {
        calls.withdrawn.push({ where, data });
        return { count: withdrawCount };
      },
      count: async () => remaining,
      findFirst: async () => nextOffer
    },
    booking: {
      update: async ({ data }) => {
        calls.bookingUpdates.push(data);
        if (data.status === 'CANCELLED') calls.cancels.push(data);
        return { ...(lead.booking ?? {}), ...data };
      }
    },
    bookingEvent: { create: async (args) => calls.bookingEvents.push(args) },
    $executeRaw: async () => {},
    providerPerformance: {
      findUniqueOrThrow: async () => perf(),
      update: async ({ data }) => ({ ...perf(), ...data })
    }
  };
  return { client, calls };
}

test('RULE 2: declining a lead withdraws the offer (frees a slot) and hands it to the next provider', async () => {
  const { client, calls } = makeRejectClient({
    lead: baseLead(),
    remaining: 2,
    nextOffer: { providerId: 'p2' }
  });

  const result = await rejectLead({ leadId: 'lead-1', providerId: 'p1', reason: 'BUSY', client });

  assert.equal(result.settled, false, 'booking stays open for the next provider');
  assert.equal(result.remaining, 2);
  assert.equal(calls.withdrawn.length, 1, 'the declining provider offer is closed');
  assert.equal(calls.withdrawn[0].where.isCurrent, true);
  assert.equal(calls.withdrawn[0].data.isCurrent, false, 'isCurrent flipped false = slot freed');
  assert.equal(calls.withdrawn[0].data.status, 'REJECTED');
  assert.equal(result.lead.providerId, 'p2', 'lead re-pointed to the next ranked provider');
  assert.equal(result.booking.providerId, 'p2', 'booking re-pointed too');
  assert.equal(result.booking.status, 'PENDING');
  assert.equal(calls.cancels.length, 0, 'booking NOT cancelled while another provider still holds an offer');
});

test('RULE 2: declining the LAST open offer expires the lead and cancels the booking', async () => {
  const { client, calls } = makeRejectClient({ lead: baseLead(), remaining: 0, nextOffer: null });

  const result = await rejectLead({ leadId: 'lead-1', providerId: 'p1', reason: 'BUSY', client });

  assert.equal(result.settled, true);
  assert.equal(result.exhausted, true);
  assert.equal(calls.expirations.length, 1, 'lead marked EXPIRED');
  assert.equal(calls.cancels.length, 1, 'booking cancelled when every provider declined');
});

test('RULE 2: a lead that is already accepted cannot be declined (LEAD_SETTLED)', async () => {
  const { client } = makeRejectClient({ lead: baseLead({ status: 'ACCEPTED', providerId: 'p1' }) });

  await assert.rejects(
    rejectLead({ leadId: 'lead-1', providerId: 'p1', reason: 'BUSY', client }),
    (err) => err.code === 'LEAD_SETTLED'
  );
});

// ---- RULE 3: only one accepted lead per provider at a time -------------------

function makeAcceptClient({
  lead = baseLead(),
  booking = { id: 'b1', providerId: 'p1', status: 'PENDING', statusHistory: [] },
  offer = { id: 'offer-1' },
  updateCount = 1,
  otherActive = null,
  cancelledRows = [],
  cancelledRowUsers = []
} = {}) {
  const calls = { updateMany: [], bookingEvents: [], perf: [] };
  const perf = () => ({ ...perfRow, providerId });
  const providerId = booking.providerId;
  let currentBooking = booking;
  const client = {
    lead: {
      findUnique: async (args) => {
        if (args?.include?.provider) return { ...lead, provider: { userId: `u-${providerId}` } };
        return lead;
      },
      updateMany: async ({ data }) => {
        calls.leadUpdates = data;
        return { count: 1 };
      }
    },
    leadAssignmentHistory: {
      findFirst: async () => offer,
      updateMany: async ({ where, data }) => {
        calls.updateMany.push({ where, data });
        return { count: 1 };
      },
      findMany: async () =>
        cancelledRowUsers.length ? cancelledRowUsers : cancelledRows.map((pid) => ({ providerId: pid, provider: { userId: `u-${pid}` } }))
    },
    booking: {
      findUnique: async (args) => {
        if (args?.select?.statusHistory) return { id: currentBooking.id, statusHistory: currentBooking.statusHistory ?? [] };
        return currentBooking;
      },
      updateMany: async ({ data }) => {
        calls.bookingUpdate = data;
        if (updateCount > 0) currentBooking = { ...currentBooking, ...data };
        return { count: updateCount };
      },
      findFirst: async () => otherActive
    },
    bookingEvent: { create: async (args) => calls.bookingEvents.push(args) },
    $executeRaw: async () => {},
    providerPerformance: {
      findUniqueOrThrow: async () => perf(),
      update: async ({ data }) => ({ ...perf(), ...data })
    },
    alert: { deleteMany: async () => ({ count: 0 }) }
  };
  return { client, calls };
}

test('RULE 3: accepting a lead moves the booking PENDING→CONFIRMED and closes every other offer', async () => {
  const { client, calls } = makeAcceptClient({
    lead: baseLead({ createdAt: new Date(Date.now() - 60_000) }),
    booking: { id: 'b1', providerId: 'p1', status: 'PENDING', statusHistory: [] },
    cancelledRows: ['p2', 'p3']
  });

  const result = await acceptLeadForBooking({ bookingId: 'b1', providerId: 'p1', client });

  assert.equal(result.alreadyAccepted, undefined, 'first accept is not an idempotent replay');
  assert.equal(result.booking.status, 'CONFIRMED');
  assert.equal(calls.bookingUpdate.status, 'CONFIRMED');
  assert.equal(calls.bookingUpdate.providerId, 'p1');

  const own = calls.updateMany.find((c) => c.data.status === 'ACCEPTED');
  assert.ok(own, 'the accepting provider offer is marked ACCEPTED');

  const otherOffers = calls.updateMany.find((c) => c.data.reason === 'PROVIDER_ACCEPTED_ANOTHER_JOB');
  assert.ok(otherOffers, 'this provider OTHER open offers are closed');
  assert.equal(otherOffers.where.providerId, 'p1');
  assert.equal(otherOffers.where.leadId.not, 'lead-1', 'closes the OTHER leads, not the accepted one');

  const losers = calls.updateMany.find((c) => c.data.reason === 'ACCEPTED_BY_ANOTHER_PROVIDER');
  assert.ok(losers, 'every OTHER provider offer is cancelled (first-accept-wins)');
  assert.equal(losers.where.providerId.not, 'p1');
});

test('RULE 3: a provider with an existing CONFIRMED/ONGOING booking cannot accept another lead (any service)', async () => {
  const { client, calls } = makeAcceptClient({
    lead: baseLead(),
    booking: { id: 'b1', providerId: 'p1', status: 'PENDING', statusHistory: [] },
    otherActive: { id: 'b9', providerId: 'p1', status: 'ONGOING' }
  });

  await assert.rejects(
    acceptLeadForBooking({ bookingId: 'b1', providerId: 'p1', client }),
    (err) => err.code === 'ACTIVE_BOOKING_EXISTS'
  );
  assert.equal(calls.bookingEvents.length, 0, 'no event recorded before the guard aborts');
});

test('RULE 3: a provider who is not offered the lead cannot accept it (NOT_ASSIGNED)', async () => {
  const { client } = makeAcceptClient({ lead: baseLead(), offer: null });

  await assert.rejects(
    acceptLeadForBooking({ bookingId: 'b1', providerId: 'p9', client }),
    (err) => err.code === 'NOT_ASSIGNED'
  );
});

test('RULE 3: racing double-accept is defeated by the compare-and-swap (ACCEPT_RACE)', async () => {
  const { client, calls } = makeAcceptClient({ updateCount: 0 });

  await assert.rejects(
    acceptLeadForBooking({ bookingId: 'b1', providerId: 'p1', client }),
    (err) => err.code === 'ACCEPT_RACE'
  );
  assert.equal(calls.bookingEvents.length, 0, 'no side effects fired on a lost race');
});

test('RULE 3: an idempotent retry of an already-accepted booking returns committed state, no duplicate writes', async () => {
  const { client, calls } = makeAcceptClient({
    lead: baseLead({ providerId: 'p1' }),
    booking: { id: 'b1', providerId: 'p1', status: 'CONFIRMED', statusHistory: [{ status: 'CONFIRMED' }] }
  });

  const result = await acceptLeadForBooking({ bookingId: 'b1', providerId: 'p1', client });

  assert.equal(result.alreadyAccepted, true);
  assert.equal(result.booking.status, 'CONFIRMED');
  assert.equal(calls.updateMany.length, 0, 'no offer churn on a replay');
  assert.equal(calls.bookingEvents.length, 0, 'no duplicate event on a replay');
});

// ---- RULE 4: customer re-booking rules ---------------------------------------

function mockRes() {
  const res = {
    headersSent: false,
    statusCode: null,
    body: null,
    status(status) {
      this.statusCode = status;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
  return res;
}

async function withPrismaStubs(stubs, fn) {
  const originals = new Map();
  for (const [key, value] of Object.entries(stubs)) {
    originals.set(key, prisma[key]);
    prisma[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, original] of originals) prisma[key] = original;
  }
}

test('RULE 4: customer cannot book the same service again while a booking is active (409 CUSTOMER_BUSY)', async () => {
  setQueueEnabled(false);
  const res = mockRes();
  await withPrismaStubs(
    {
      user: { findUnique: async () => ({ id: 'c1', name: 'C', email: 'c@x.com', latitude: null, longitude: null }) },
      booking: {
        findMany: async () => [{ id: 'b1', serviceId: 'svc-1', serviceCategory: 'Plumbing' }]
      }
    },
    () =>
      BookingController.create(
        { user: { id: 'c1', role: 'customer' }, body: { serviceId: 'svc-1', serviceCategory: 'Plumbing' }, app: { get: () => null } },
        res
      )
  );

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'CUSTOMER_BUSY');
});

test('RULE 4: the same-service guard also matches by service category (case-insensitive)', async () => {
  setQueueEnabled(false);
  const res = mockRes();
  await withPrismaStubs(
    {
      user: { findUnique: async () => ({ id: 'c1', name: 'C', email: 'c@x.com', latitude: null, longitude: null }) },
      booking: {
        findMany: async () => [{ id: 'b1', serviceId: 'svc-2', serviceCategory: 'Plumbing' }]
      }
    },
    () =>
      BookingController.create(
        { user: { id: 'c1', role: 'customer' }, body: { serviceId: 'svc-1', serviceCategory: 'plumbing' }, app: { get: () => null } },
        res
      )
  );

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'CUSTOMER_BUSY');
});

test('RULE 4: a different service is allowed while another booking is active (parallel bookings)', async () => {
  setQueueEnabled(false);
  const res = mockRes();
  const activeProvider = makeProvider('p1');
  const created = [];

  await withPrismaStubs(
    {
      user: { findUnique: async () => ({ id: 'c1', name: 'C', email: 'c@x.com', latitude: null, longitude: null }) },
      booking: {
        findMany: async () => [{ id: 'b1', serviceId: 'svc-2', serviceCategory: 'Plumbing' }],
        create: async ({ data }) => {
          created.push(data);
          return { id: 'b2', ...data };
        }
      },
      leadAssignmentHistory: {
        groupBy: async () => [],
        createMany: async ({ data }) => {
          created.push({ offerCount: data.length });
          return { count: data.length };
        }
      },
      provider: {
        aggregate: async () => ({ _max: { maxRadiusKm: 50 } }),
        findMany: async () => [activeProvider]
      },
      businessSequenceCounter: { upsert: async () => ({ value: 2 }) },
      bookingEvent: { create: async () => ({}) },
      lead: {
        create: async ({ data }) => ({ id: 'lead-2', ...data }),
        update: async ({ data }) => ({ id: 'lead-2', ...data, expiryTime: new Date(Date.now() + 86_400_000) })
      },
      $transaction: async (fn) => fn(prisma),
      $executeRaw: async () => {},
      providerPerformance: {
        findUniqueOrThrow: async () => ({ ...perfRow }),
        update: async ({ data }) => ({ ...perfRow, ...data })
      }
    },
    async () => {
      const b = created; // ref for closure
      void b;
      await BookingController.create(
        {
          user: { id: 'c1', role: 'customer' },
          body: { serviceId: 'svc-3', serviceCategory: 'Electrician', amount: 600, city: 'Hyderabad' },
          app: { get: () => null }
        },
        res
      );
      cancelLeadExpiry('lead-2');
    }
  );

  assert.equal(res.statusCode, 201, 'parallel different-service booking succeeds');
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.booking.serviceCategory, 'Electrician');
  assert.equal(res.body.data.booking.providerId, 'p1', 'first eligible provider owns the booking');
  assert.deepEqual(created.filter((c) => c.offerCount != null).map((c) => c.offerCount), [1], 'one provider got an offer');
});

// ---- RULE 5: unranked distribution ------------------------------------------
// No ranking or "top provider" concept: every eligible provider gets the same
// open offer (first-accept-wins); provider level / distance / rating do NOT
// prioritise anyone. The FK owner is simply the first in deterministic
// (createdAt, id) order.

test('RULE 5: levelRank still orders BRONZE < SILVER < GOLD < PLATINUM < DIAMOND (level engine unchanged)', () => {
  assert.ok(levelRank('BRONZE') < levelRank('SILVER'));
  assert.ok(levelRank('SILVER') < levelRank('GOLD'));
  assert.ok(levelRank('GOLD') < levelRank('PLATINUM'));
  assert.ok(levelRank('PLATINUM') < levelRank('DIAMOND'));
  assert.ok(levelRank('DIAMOND') > levelRank('BRONZE'));
});

test('RULE 5: at identical distance/rating, DIAMOND and BRONZE are both eligible — level does NOT prioritise (appears first merely by id)', async () => {
  const diamond = makeProvider('p1', {
    providerLevel: 'DIAMOND',
    rating: 4.5,
    latitude: 17.3850,
    longitude: 78.4867
  });
  const bronze = makeProvider('p2', {
    providerLevel: 'BRONZE',
    rating: 4.5,
    latitude: 17.3850,
    longitude: 78.4867
  });
  const { client } = makeEligibilityClient({ providers: [diamond, bronze] });

  const ranked = await findEligibleProviders({
    serviceId: 'svc-1',
    serviceCategory: 'Plumbing',
    customerLat: 17.3850,
    customerLng: 78.4867,
    client
  });

  assert.deepEqual(ranked.map((p) => p.id).sort(), ['p1', 'p2'], 'both providers are offered the lead');
});

test('RULE 5: distance does NOT rank — every provider within radius is eligible and offered', async () => {
  const closeBronze = makeProvider('p1', { providerLevel: 'BRONZE', latitude: 17.3851, longitude: 78.4868 });
  const farDiamond = makeProvider('p2', { providerLevel: 'DIAMOND', latitude: 17.42, longitude: 78.52, maxRadiusKm: 50 });
  const { client } = makeEligibilityClient({ providers: [closeBronze, farDiamond] });

  const ranked = await findEligibleProviders({
    serviceId: 'svc-1',
    serviceCategory: 'Plumbing',
    customerLat: 17.3850,
    customerLng: 78.4867,
    client
  });

  assert.deepEqual(ranked.map((p) => p.id).sort(), ['p1', 'p2'], 'both are within their radius — no distance prioritisation');
});

test('RULE 5: createBookingWithLead assigns the first eligible provider (deterministic createdAt/id) as owner — no level preference', async () => {
  const olderBronze = makeProvider('p1', { providerLevel: 'BRONZE', rating: 4.5, latitude: 17.3850, longitude: 78.4867, createdAt: new Date('2023-01-01T00:00:00Z') });
  const newerDiamond = makeProvider('p2', { providerLevel: 'DIAMOND', rating: 4.5, latitude: 17.3850, longitude: 78.4867, createdAt: new Date('2025-01-01T00:00:00Z') });
  const { client } = makeEligibilityClient({ providers: [olderBronze, newerDiamond] });

  const result = await createBookingWithLead({
    customerId: 'c1',
    serviceId: 'svc-1',
    serviceCategory: 'Plumbing',
    amount: 500,
    customerLat: 17.3850,
    customerLng: 78.4867,
    client: {
      ...client,
      businessSequenceCounter: { upsert: async () => ({ value: 1 }) },
      booking: { create: async ({ data }) => ({ id: 'b1', ...data }) },
      bookingEvent: { create: async () => ({}) },
      lead: {
        create: async ({ data }) => ({ id: 'lead-1', ...data }),
        update: async ({ data }) => ({ id: 'lead-1', ...data })
      },
      leadAssignmentHistory: {
        createMany: async () => ({ count: 2 }),
        groupBy: client.leadAssignmentHistory.groupBy
      }
    }
  });

  assert.equal(result.provider.id, 'p1', 'first eligible provider owns the booking (createdAt order, NOT level)');
  assert.equal(result.booking.providerId, 'p1');
  assert.equal(result.eligibleCount, 2, 'but both providers still received the broadcast offer');
});

test('RULE 5: provider level rises with completed jobs (level engine thresholds)', async () => {
  invalidateLevelCache();
  const client = {
    providerLevelRule: {
      findMany: async () => [
        { level: 'BRONZE', minJobs: 0, discountPercent: 0 },
        { level: 'SILVER', minJobs: 5, discountPercent: 5 },
        { level: 'GOLD', minJobs: 20, discountPercent: 10 },
        { level: 'PLATINUM', minJobs: 50, discountPercent: 15 },
        { level: 'DIAMOND', minJobs: 100, discountPercent: 20 }
      ]
    }
  };

  assert.equal(await getProviderLevelForJobs(0, client), 'BRONZE');
  assert.equal(await getProviderLevelForJobs(4, client), 'BRONZE');
  assert.equal(await getProviderLevelForJobs(5, client), 'SILVER');
  assert.equal(await getProviderLevelForJobs(20, client), 'GOLD');
  assert.equal(await getProviderLevelForJobs(250, client), 'DIAMOND');
  invalidateLevelCache();
});