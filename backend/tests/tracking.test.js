import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../prisma/client.js';
import { setQueueEnabled } from '../services/queue/queueService.js';
import { markProviderOnTheWay, markProviderArrived } from '../services/trackingService.js';

// Persist notifications inline (no worker process is running in tests).
setQueueEnabled(false);

// DB-backed tests auto-skip when the database is unreachable (CI / offline),
// keeping the suite green while the pure unit tests always run.
const dbReady = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
})();

const dbTest = dbReady ? test : test.skip;

function mockProviderClient(overrides = {}) {
  const provider = { id: 'p1', userId: 'pu1', user: { name: 'Test Provider', avatar: null } };
  const booking = {
    id: 'b1',
    status: 'CONFIRMED',
    customerId: 'c1',
    providerId: 'p1',
    providerPhase: null,
    endLocation: null,
    startLocation: null,
    providerLatitude: null,
    providerLongitude: null,
    ...overrides.booking
  };
  const calls = { updates: [] };
  return {
    calls,
    client: {
      provider: { findUnique: async () => provider },
      booking: {
        findUnique: async () => booking,
        update: async ({ data }) => {
          calls.updates.push(data);
          return { ...booking, ...data };
        }
      }
    }
  };
}

test('onTheWay/arrived reject a missing booking id', async () => {
  const { client } = mockProviderClient();
  await assert.rejects(() => markProviderOnTheWay({ bookingId: null, providerUserId: 'pu1', client }), /Booking ID is required/);
  await assert.rejects(() => markProviderArrived({ bookingId: '', providerUserId: 'pu1', client }), /Booking ID is required/);
});

test('onTheWay/arrived reject a non-assigned provider', async () => {
  const { client } = mockProviderClient({ booking: { providerId: 'someone-else' } });
  await assert.rejects(() => markProviderOnTheWay({ bookingId: 'b1', providerUserId: 'pu1', client }), /not assigned/);
});

test('onTheWay/arrived reject a booking that is not confirmed/ongoing', async () => {
  for (const status of ['PENDING', 'COMPLETED', 'CANCELLED']) {
    const { client } = mockProviderClient({ booking: { status } });
    await assert.rejects(() => markProviderOnTheWay({ bookingId: 'b1', providerUserId: 'pu1', client }), /confirmed or in progress/);
  }
});

const purge = async () => {
  if (!dbReady) return;
  await prisma.job.deleteMany({ where: { type: 'notification', payload: { path: ['userId'], equals: 'tracking-test-customer' } } });
  await prisma.notification.deleteMany({ where: { userId: 'tracking-test-customer' } });
  await prisma.booking.deleteMany({ where: { customerId: 'tracking-test-customer' } });
  await prisma.provider.deleteMany({ where: { userId: 'tracking-test-provider' } });
  await prisma.user.deleteMany({ where: { id: { in: ['tracking-test-customer', 'tracking-test-provider'] } } });
};
test.before(purge);
test.after(purge);

dbTest('markProviderOnTheWay persists the phase and notifies the customer', async () => {
  await prisma.user.create({
    data: { id: 'tracking-test-customer', name: 'Track Test Customer', email: 'tracking-test-customer@example.com', phone: '1111111111', role: 'customer', password: 'x' }
  });
  await prisma.user.create({
    data: { id: 'tracking-test-provider', name: 'Track Test Provider', email: 'tracking-test-provider@example.com', phone: '2222222222', role: 'provider', password: 'x' }
  });
  const provider = await prisma.provider.create({
    data: { userId: 'tracking-test-provider', category: 'test-track', maxRadiusKm: 10, isOnline: true, acceptingBookings: true }
  });
  const booking = await prisma.booking.create({
    data: {
      customerId: 'tracking-test-customer',
      providerId: provider.id,
      serviceCategory: 'test-track',
      locationAddress: 'Test Address',
      city: 'Test City',
      status: 'CONFIRMED',
      endLocation: { latitude: 19.1, longitude: 72.85 }
    }
  });

  const events = [];
  const io = { to: (room) => ({ emit: (event, data) => events.push({ room, event, data }) }) };

  const result = await markProviderOnTheWay({ bookingId: booking.id, providerUserId: 'tracking-test-provider', io });
  assert.equal(result.payload.providerPhase, 'ON_THE_WAY');

  const stored = await prisma.booking.findUnique({ where: { id: booking.id }, select: { providerPhase: true } });
  assert.equal(stored.providerPhase, 'ON_THE_WAY');

  const customerEvents = events.filter((e) => e.room === 'user:tracking-test-customer');
  assert.ok(customerEvents.some((e) => e.event === 'provider:onTheWay' && e.data.providerPhase === 'ON_THE_WAY'));

  const notification = await prisma.notification.findFirst({
    where: { userId: 'tracking-test-customer', type: 'BOOKING' },
    orderBy: { createdAt: 'desc' }
  });
  assert.ok(notification, 'customer should receive an in-app notification');
  assert.match(notification.message, /on the way/i);

  const arrived = await markProviderArrived({ bookingId: booking.id, providerUserId: 'tracking-test-provider', io });
  assert.equal(arrived.payload.providerPhase, 'ARRIVED');
  const storedAfter = await prisma.booking.findUnique({ where: { id: booking.id }, select: { providerPhase: true } });
  assert.equal(storedAfter.providerPhase, 'ARRIVED');
});
