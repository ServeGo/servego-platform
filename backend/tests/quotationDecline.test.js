import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../prisma/client.js';
import { redistributeAfterDecline, declineQuotation } from '../services/quotationService.js';

// Pure unit tests (no DB): `redistributeAfterDecline` accepts a `client`, so a
// mock lets us pin down the re-broadcast behaviour without a database. The
// regression this guards is that the booking model broadcasts the original
// request to EVERY eligible provider at once (first-accept-wins), so the other
// eligible providers are already recorded in `leadAssignmentHistory` as
// cancelled losers. The old code excluded the WHOLE history, emptying the pool
// and cancelling the booking with "no other provider" every time. The fix
// excludes only providers who previously reached an ACCEPTED assignment (a
// declined quotation in an earlier round) plus the provider being declined now.

function makeClient({ acceptedRows = [], knownProviders = [], booking = {} }) {
  const calls = { createdAssignments: [], transfers: [], updates: [] };
  // `findEligibleProviders` nests its `id: { notIn }` filter inside
  // `where.AND[0]` (or at the top level) — walk both shapes.
  const excluded = (where) => {
    const walk = (node) => {
      if (!node || typeof node !== 'object') return [];
      if (Array.isArray(node.notIn)) return node.notIn;
      return Object.values(node).flatMap((v) => (Array.isArray(v) ? v.flatMap(walk) : walk(v)));
    };
    return new Set(walk(where?.id ?? undefined).concat(walk(where?.AND ?? undefined)));
  };
  return {
    calls,
    client: {
      leadAssignmentHistory: {
        // Only the status='ACCEPTED' query is used for exclusion now — never
        // the whole history.
        findMany: async () => acceptedRows,
        // Open-lead cap scan (findEligibleProviders) — assume nobody is capped.
        groupBy: async () => [],
        updateMany: async ({ where, data }) => {
          calls.updates.push({ where, data });
          return { count: 1 };
        },
        createMany: async ({ data }) => {
          calls.createdAssignments.push(...data);
          return { count: data.length };
        }
      },
      provider: {
        findMany: async ({ where }) => {
          const notIn = excluded(where);
          return knownProviders.filter((p) => !notIn.has(p.id));
        },
        // Not reached for leads without customer coordinates, kept for safety.
        aggregate: async () => ({ _max: { maxRadiusKm: null } })
      },
      leadTransferHistory: {
        createMany: async ({ data }) => {
          calls.transfers.push(...data);
          return { count: data.length };
        }
      },
      lead: {
        update: async ({ data }) => {
          calls.leadUpdate = data;
          return { id: 'lead-1', ...data };
        }
      },
      booking: {
        update: async ({ data }) => {
          calls.bookingUpdate = data;
          return { id: 'b1', ...data };
        },
        updateMany: async () => ({ count: 1 })
      },
      bookingLocationUpdate: { deleteMany: async () => ({ count: 0 }) },
      bookingEvent: { create: async () => ({}) },
      providerPerformance: {
        update: async () => ({}),
        upsert: async () => ({}),
        updateMany: async () => ({ count: 0 })
      },
      $executeRaw: async () => {}
    }
  };
}

const baseBooking = {
  id: 'b1',
  status: 'CONFIRMED',
  customerId: 'c1',
  providerId: 'p1',
  serviceCategory: 'Plumbing',
  serviceId: null,
  serviceLatitude: null,
  serviceLongitude: null,
  statusHistory: []
};
const baseLead = { id: 'lead-1', bookingId: 'b1', status: 'ACCEPTED' };

const p2 = { id: 'p2', user: { id: 'pu2', name: 'P2', avatar: null } };
const p3 = { id: 'p3', user: { id: 'pu3', name: 'P3', avatar: null } };

test('re-broadcasts to OTHER eligible providers of the same service (incl. original broadcast losers)', async () => {
  // p2/p3 were part of the ORIGINAL broadcast (they lost the race) — their rows
  // are CANCELLED, so the ACCEPTED query returns none of them. They must still
  // be part of the re-broadcast pool.
  const { client, calls } = makeClient({ knownProviders: [p2, p3] });

  const result = await redistributeAfterDecline({
    booking: baseBooking,
    lead: baseLead,
    providerIdToExclude: 'p1',
    reason: 'QUOTATION_DECLINED',
    client
  });

  assert.equal(result.settled, false);
  assert.equal(result.nextProvider.id, 'p2');
  assert.deepEqual(result.providers.map((p) => p.id), ['p2', 'p3']);

  // Every eligible provider gets an open offer (broadcast, first-accept-wins).
  assert.deepEqual(calls.createdAssignments.map((x) => x.providerId), ['p2', 'p3']);
  assert.ok(calls.createdAssignments.every((x) => x.status === 'NEW' && x.isCurrent === true));
  assert.deepEqual(calls.transfers.map((x) => x.toProviderId), ['p2', 'p3']);
  assert.equal(calls.leadUpdate.providerId, 'p2');
  assert.equal(calls.leadUpdate.status, 'NEW');
  assert.equal(calls.bookingUpdate.providerId, 'p2');
  assert.equal(calls.bookingUpdate.status, 'PENDING');
  assert.equal(calls.bookingUpdate.cancelledBy, null);
});

test('never re-offers a provider whose quotation was declined in a previous round', async () => {
  // p2 accepted earlier and its quotation was declined → ACCEPTED assignment.
  const { client, calls } = makeClient({
    acceptedRows: [{ providerId: 'p2' }],
    knownProviders: [p2, p3]
  });

  const result = await redistributeAfterDecline({
    booking: baseBooking,
    lead: baseLead,
    providerIdToExclude: 'p1',
    reason: 'QUOTATION_DECLINED',
    client
  });

  assert.equal(result.nextProvider.id, 'p3');
  assert.deepEqual(calls.createdAssignments.map((x) => x.providerId), ['p3']);
});

test('settles the lead and cancels the booking when no other provider is eligible', async () => {
  const { client, calls } = makeClient({ knownProviders: [] });

  const result = await redistributeAfterDecline({
    booking: baseBooking,
    lead: baseLead,
    providerIdToExclude: 'p1',
    reason: 'QUOTATION_DECLINED',
    client
  });

  assert.equal(result.settled, true);
  assert.equal(result.cancelled, true);
  assert.equal(result.nextProvider, null);
  assert.equal(calls.bookingUpdate?.status, 'CANCELLED');
  assert.equal(calls.bookingUpdate?.cancelledBy, 'c1');
  assert.ok(!calls.createdAssignments.length);
});

test('keeps the ACCEPTED marker on previously declined assignments so later rounds stay excluded', async () => {
  // The ACCEPTED de-currenting update must not overwrite the status; only the
  // non-accepted open offers get flipped to REJECTED.
  const { client, calls } = makeClient({ acceptedRows: [{ providerId: 'p2' }], knownProviders: [p3] });

  await redistributeAfterDecline({
    booking: baseBooking,
    lead: baseLead,
    providerIdToExclude: 'p1',
    reason: 'QUOTATION_DECLINED',
    client
  });

  const [acceptedClose, rejectRest] = calls.updates;
  assert.equal(acceptedClose.where.status, 'ACCEPTED');
  assert.deepEqual(acceptedClose.data, { isCurrent: false });
  assert.equal(rejectRest.where.status, undefined);
  assert.equal(rejectRest.data.status, 'REJECTED');
});

// ---- BLOCKER 5: decline-cancel writes must stay inside the transaction ------
// The lead-cancel, offer-close and final booking read after a decline-without-
// replacement used to go through the OUTER `client` (i.e. `prisma` itself) —
// auto-committing OUTSIDE `withClientTransaction`'s atomic unit. A later
// transaction rollback would then stranding a CANCELLED lead under a CONFIRMED
// booking. The regression: every one of those writes goes through `tx`, and the
// whole decline runs in a SINGLE transaction (`$transaction` invoked once).

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

function makeDeclineTx() {
  let booking = {
    id: 'b1',
    status: 'CONFIRMED',
    customerId: 'c1',
    providerId: 'p1',
    serviceCategory: 'Plumbing',
    serviceId: null,
    serviceLatitude: null,
    serviceLongitude: null,
    statusHistory: [],
    lead: { id: 'lead-1', bookingId: 'b1', status: 'ACCEPTED' }
  };
  const quotation = { id: 'q1', bookingId: 'b1', providerId: 'p1', status: 'SUBMITTED' };
  const txCalls = { leadUpdates: 0, offerCloses: 0, bookingReads: 0 };
  const tx = {
    adminConfig: { findUnique: async () => null },
    booking: {
      findUnique: async () => {
        txCalls.bookingReads += 1;
        return booking;
      },
      updateMany: async ({ data }) => {
        if (data.status === 'CANCELLED') booking = { ...booking, ...data };
        return { count: 1 };
      }
    },
    quotation: {
      findFirst: async () => quotation,
      updateMany: async () => ({ count: 1 })
    },
    bookingEvent: { create: async () => ({}) },
    bookingLocationUpdate: { deleteMany: async () => ({ count: 0 }) },
    provider: { findUnique: async () => ({ userId: 'pu1' }) },
    wallet: {
      findUnique: async () => ({ id: 'w1', userId: 'c1', balance: 0, totalCredited: 0, totalDebited: 0, totalEarned: 0 }),
      update: async ({ data }) => ({ id: 'w1', ...data }),
      create: async (args) => ({ id: 'w1', balance: 0, ...args.data })
    },
    walletTransaction: { create: async () => ({}) },
    lead: {
      update: async () => {
        txCalls.leadUpdates += 1;
        return { id: 'lead-1' };
      }
    },
    leadAssignmentHistory: {
      findMany: async () => [],
      updateMany: async () => {
        txCalls.offerCloses += 1;
        return { count: 0 };
      }
    },
    $executeRaw: async () => {}
  };
  return { tx, txCalls };
}

test('BLOCKER 5: decline-without-replacement cancels the lead + closes offers inside the SAME transaction (single atomic unit)', async () => {
  const { tx, txCalls } = makeDeclineTx();
  const escapes = { lead: 0, offers: 0, finalReads: 0, transactions: 0 };

  await withPrismaStubs(
    {
      $transaction: async (fn) => {
        escapes.transactions += 1;
        return fn(tx);
      },
      // Outer-prisma stubs: if any decline write leaks through `client`, it lands
      // here instead of the real DB, is recorded, and the assertions fail.
      lead: { update: async () => { escapes.lead += 1; return { id: 'lead-1' }; } },
      leadAssignmentHistory: {
        findMany: async () => { escapes.offers += 1; return []; },
        updateMany: async () => ({ count: 0 })
      },
      booking: { findUnique: async () => { escapes.finalReads += 1; return null; } }
    },
    () => declineQuotation({ bookingId: 'b1', actorId: 'c1', anotherProvider: false })
  );

  assert.equal(escapes.transactions, 1, 'the whole decline runs in ONE transaction — cancelOpenOffers must NOT open a second one');
  assert.equal(txCalls.leadUpdates, 1, 'the lead is cancelled through tx');
  assert.equal(txCalls.offerCloses, 1, 'open offers are closed through tx');
  assert.equal(txCalls.bookingReads, 2, 'both the initial load and the returned booking are read through tx');
  assert.equal(escapes.lead, 0, 'lead.update must never go through the outer prisma');
  assert.equal(escapes.offers, 0, 'cancelOpenOffers must never go through the outer prisma');
  assert.equal(escapes.finalReads, 0, 'the final booking read must never go through the outer prisma');
});