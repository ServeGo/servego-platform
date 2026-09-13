import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../prisma/client.js';
import { clearLocationHistory, sweepClosedLocationHistory } from '../services/trackingService.js';

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

const SUFFIX = 'cleanup';

async function purgeAll() {
  if (!dbReady) return;
  await prisma.bookingLocationUpdate.deleteMany({ where: { bookingId: { in: [`location-cleanup-booking-${SUFFIX}`, `location-cleanup-booking-${SUFFIX}-open`] } } });
  await prisma.booking.deleteMany({ where: { customerId: `location-cleanup-customer-${SUFFIX}` } });
  await prisma.booking.deleteMany({ where: { customerId: `location-cleanup-customer-${SUFFIX}-open` } });
  await prisma.provider.deleteMany({ where: { userId: { in: [`location-cleanup-provider-${SUFFIX}`, `location-cleanup-provider-${SUFFIX}-open`] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ `location-cleanup-customer-${SUFFIX}`, `location-cleanup-provider-${SUFFIX}`, `location-cleanup-customer-${SUFFIX}-open`, `location-cleanup-provider-${SUFFIX}-open` ] } } });
}

async function seed(suffix, { status, withLiveFix = false }) {
  const customerId = `location-cleanup-customer-${suffix}`;
  const providerUserId = `location-cleanup-provider-${suffix}`;
  const bookingId = `location-cleanup-booking-${suffix}`;
  const unique = suffix.replace(/-open$/, '');
  await prisma.user.upsert({
    where: { id: providerUserId },
    update: {},
    create: { id: providerUserId, name: 'Location Cleanup Provider', email: `${providerUserId}@example.com`, phone: `5522${unique}`.padEnd(10, '0'), role: 'provider', password: 'x' }
  });
  await prisma.user.upsert({
    where: { id: customerId },
    update: {},
    create: { id: customerId, name: 'Location Cleanup Customer', email: `${customerId}@example.com`, phone: `5521${unique}`.padEnd(10, '0'), role: 'customer', password: 'x' }
  });
  await prisma.provider.upsert({
    where: { userId: providerUserId },
    update: {},
    create: { userId: providerUserId, category: 'test-cleanup', maxRadiusKm: 10, isOnline: true, acceptingBookings: true }
  });
  const providerRow = (await prisma.provider.findUnique({ where: { userId: providerUserId }, select: { id: true } })).id;
  const booking = await prisma.booking.create({
    data: {
      id: bookingId,
      customerId,
      providerId: providerRow,
      serviceCategory: 'test-cleanup',
      locationAddress: 'Test Address',
      city: 'Test City',
      status,
      endLocation: { latitude: 19.1, longitude: 72.85 },
      ...(withLiveFix ? { providerLatitude: 19.11, providerLongitude: 72.86, providerLocationUpdatedAt: new Date() } : {})
    }
  });
  for (let i = 0; i < 2; i++) {
    await prisma.bookingLocationUpdate.create({
      data: { bookingId: booking.id, providerId: booking.providerId, latitude: 19.11 + i / 100, longitude: 72.86, recordedAt: new Date(Date.now() - i * 1000) }
    });
  }
  return booking;
}

test.before(async () => { await purgeAll(); });
test.after(async () => { await purgeAll(); });

dbTest('clearLocationHistory deletes every ping and the live fix, and is idempotent', async () => {
  await purgeAll();
  const booking = await seed(SUFFIX, { status: 'ONGOING', withLiveFix: true });
  const before = await prisma.bookingLocationUpdate.count({ where: { bookingId: booking.id } });
  assert.equal(before, 2);

  const result = await clearLocationHistory({ bookingId: booking.id });
  assert.equal(result.cleared, 2);
  assert.equal(await prisma.bookingLocationUpdate.count({ where: { bookingId: booking.id } }), 0);

  const row = await prisma.booking.findUnique({ where: { id: booking.id }, select: { providerLatitude: true, providerLongitude: true, providerLocationUpdatedAt: true } });
  assert.equal(row.providerLatitude, null);
  assert.equal(row.providerLongitude, null);
  assert.equal(row.providerLocationUpdatedAt, null);

  const again = await clearLocationHistory({ bookingId: booking.id });
  assert.equal(again.cleared, 0, 'a second purge is a no-op');
});

dbTest('sweepClosedLocationHistory clears closed bookings but leaves open ones untouched', async () => {
  await purgeAll();
  const closed = await seed(SUFFIX, { status: 'CANCELLED', withLiveFix: true });
  const open = await seed(`${SUFFIX}-open`, { status: 'PENDING' });

  const result = await sweepClosedLocationHistory();
  assert.ok(result.cleared >= 2, 'the closed booking pings are removed');
  assert.ok(result.liveFixesCleared >= 1, 'the closed booking live fix is nulled');

  assert.equal(await prisma.bookingLocationUpdate.count({ where: { bookingId: closed.id } }), 0);
  assert.equal(await prisma.bookingLocationUpdate.count({ where: { bookingId: open.id } }), 2);
  const closedRow = await prisma.booking.findUnique({ where: { id: closed.id }, select: { providerLatitude: true } });
  assert.equal(closedRow.providerLatitude, null);
});