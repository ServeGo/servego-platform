import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../prisma/client.js';
import { socketMetrics } from '../services/socketMetrics.js';
import { updateProviderLocation } from '../services/trackingService.js';
import { setConfig, invalidateConfig } from '../services/adminConfigService.js';

// Pure unit tests — always run, no DB needed.
test('socketMetrics records connections, events and counts over a window', () => {
  socketMetrics.reset();
  socketMetrics.recordConnection();
  socketMetrics.recordConnection();
  socketMetrics.recordDisconnection();
  socketMetrics.recordEvent('location:update');
  socketMetrics.recordEvent('location:update');
  socketMetrics.recordEvent('provider:onTheWay');
  socketMetrics.recordMessage(1024);
  socketMetrics.recordMessage(512);
  socketMetrics.recordDbWrite();
  socketMetrics.recordMapsCall();
  socketMetrics.recordHandlerDuration('location:update', 5);
  socketMetrics.recordHandlerDuration('location:update', 15);

  const snap = socketMetrics.snapshot();
  assert.equal(snap.connections.current, 1);
  assert.equal(snap.connections.total, 2);
  assert.equal(snap.events.total['location:update'], 2);
  assert.equal(snap.events.total['provider:onTheWay'], 1);
  assert.equal(snap.messages.total, 2);
  assert.equal(snap.messages.bytesTotal, 1536);
  assert.equal(snap.dbWrites.total, 1);
  assert.equal(snap.mapsCalls.total, 1);
  assert.equal(snap.handlerAvgMs['location:update'], 10);
  // perSec is events within the 60s sliding window, so it must be self-consistent.
  const win = 60;
  assert.equal(snap.events.perSec['location:update'], Number((2 / win).toFixed(2)));
  assert.equal(snap.events.perSec['provider:onTheWay'], Number((1 / win).toFixed(2)));
});

test('socketMetrics.resets all counters', () => {
  socketMetrics.recordConnection();
  socketMetrics.recordEvent('location:update');
  socketMetrics.reset();
  const snap = socketMetrics.snapshot();
  assert.equal(snap.connections.total, 0);
  assert.equal(snap.connections.current, 0);
  assert.deepEqual(snap.events.total, {});
});

// DB-backed tests auto-skip when the database is unreachable (CI / offline).
const dbReady = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
})();
const dbTest = dbReady ? test : test.skip;

// Each DB test seeds its own rows so tests never collide on unique keys; the
// purge strips every seed's rows before/after the whole file.
const SUFFIXES = ['persist', 'subcadence', 'invalid'];

async function purgeAll() {
  if (!dbReady) return;
  for (const suffix of SUFFIXES) {
    await prisma.bookingLocationUpdate.deleteMany({ where: { bookingId: `socket-metrics-booking-${suffix}` } });
    await prisma.booking.deleteMany({ where: { customerId: `socket-metrics-customer-${suffix}` } });
    await prisma.provider.deleteMany({ where: { userId: `socket-metrics-provider-${suffix}` } });
    await prisma.user.deleteMany({ where: { id: { in: [`socket-metrics-customer-${suffix}`, `socket-metrics-provider-${suffix}`] } } });
  }
}

// Widen the cadence interval to 1h so the seed timestamps decide pass/fail
// deterministically, independent of slow-CI wall clock between seed and ping.
const WIDE_INTERVAL = 3600;
async function widenInterval() {
  if (!dbReady) return;
  await setConfig('locationUpdateMinIntervalSeconds', WIDE_INTERVAL);
  invalidateConfig('locationUpdateMinIntervalSeconds');
}
async function restoreInterval() {
  if (!dbReady) return;
  await setConfig('locationUpdateMinIntervalSeconds', 3);
  invalidateConfig('locationUpdateMinIntervalSeconds');
}

test.before(async () => {
  await purgeAll();
  await widenInterval();
});
test.after(async () => {
  await purgeAll();
  await restoreInterval();
});

/**
 * Seed a confirmed booking and return its id. `providerLocationUpdatedAt`
 * controls the cadence gate deterministically — elapsed (> cadence) persists,
 * fresh (< cadence) does not — with no reliance on wall-clock ordering.
 */
async function seed(suffix, { providerLocationUpdatedAt }) {
  const customerId = `socket-metrics-customer-${suffix}`;
  const providerUserId = `socket-metrics-provider-${suffix}`;
  const bookingId = `socket-metrics-booking-${suffix}`;
  await prisma.user.create({
    data: { id: providerUserId, name: 'Socket Metrics Provider', email: `${providerUserId}@example.com`, phone: `5551${suffix.slice(0, 4)}`.padEnd(10, '0'), role: 'provider', password: 'x' }
  });
  await prisma.user.create({
    data: { id: customerId, name: 'Socket Metrics Customer', email: `${customerId}@example.com`, phone: `5552${suffix.slice(0, 4)}`.padEnd(10, '0'), role: 'customer', password: 'x' }
  });
  const provider = await prisma.provider.create({
    data: { userId: providerUserId, category: 'test-socket', maxRadiusKm: 10, isOnline: true, acceptingBookings: true }
  });
  const booking = await prisma.booking.create({
    data: {
      id: bookingId,
      customerId,
      providerId: provider.id,
      serviceCategory: 'test-socket',
      locationAddress: 'Test Address',
      city: 'Test City',
      status: 'CONFIRMED',
      endLocation: { latitude: 19.1, longitude: 72.85 },
      providerLocationUpdatedAt
    }
  });
  return { providerUserId, booking };
}

dbTest('updateProviderLocation persists when the cadence has elapsed', async () => {
  // 2h > 1h interval -> definitely elapsed regardless of DB latency.
  const { providerUserId } = await seed('persist', { providerLocationUpdatedAt: new Date(Date.now() - 2 * 3600_000) });
  const booking = await prisma.booking.findUnique({ where: { id: 'socket-metrics-booking-persist' } });
  const result = await updateProviderLocation({ bookingId: booking.id, providerUserId, latitude: 19.11, longitude: 72.86 });
  assert.equal(result.ok, true);
  assert.equal(result.payload.latitude, 19.11);
  const history = await prisma.bookingLocationUpdate.count({ where: { bookingId: booking.id } });
  assert.equal(history, 1, 'an elapsed cadence writes exactly one history row');
});

dbTest('updateProviderLocation skips PostgreSQL writes on a sub-cadence ping', async () => {
  const { providerUserId } = await seed('subcadence', { providerLocationUpdatedAt: new Date() });
  const booking = await prisma.booking.findUnique({ where: { id: 'socket-metrics-booking-subcadence' } });
  const result = await updateProviderLocation({ bookingId: booking.id, providerUserId, latitude: 19.11, longitude: 72.86 });
  assert.equal(result.ok, true);
  assert.equal(result.payload.latitude, 19.11, 'the live fix still returns in the broadcast payload');
  const history = await prisma.bookingLocationUpdate.count({ where: { bookingId: booking.id } });
  assert.equal(history, 0, 'a sub-cadence ping must not create history rows');
});

dbTest('updateProviderLocation rejects invalid coordinates without touching the DB', async () => {
  const { providerUserId } = await seed('invalid', { providerLocationUpdatedAt: new Date(Date.now() - 2 * 3600_000) });
  const booking = await prisma.booking.findUnique({ where: { id: 'socket-metrics-booking-invalid' } });
  await assert.rejects(
    () => updateProviderLocation({ bookingId: booking.id, providerUserId, latitude: 'abc', longitude: 72.86 }),
    /valid latitude and longitude/i
  );
  const history = await prisma.bookingLocationUpdate.count({ where: { bookingId: booking.id } });
  assert.equal(history, 0);
});