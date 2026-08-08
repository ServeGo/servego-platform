import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../prisma/client.js';
import { TicketController } from '../controllers/ticketController.js';
import { ReviewController } from '../controllers/reviewController.js';
import { BookingController } from '../controllers/bookingController.js';
import { NotificationController } from '../controllers/notificationController.js';
import { parsePagination, offsetMeta, encodeCursor } from '../utils/pagination.js';

const dbReady = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
})();

const dbTest = dbReady ? test : test.skip;

const TEST_EMAIL = 'pagination-test@test.local';

function mockRes() {
  const box = {};
  const json = (payload) => { box.payload = payload; return payload; };
  return {
    status: () => ({ json }),
    json,
    __payload: box
  };
}

const call = async (fn, req) => {
  const res = mockRes();
  await fn(req, res);
  const payload = res.__payload.payload;
  // Controllers reply { success, data }; errors have no `data` and are passed through.
  return payload && payload.data !== undefined ? payload.data : payload;
};

const purge = async () => {
  if (!dbReady) return;
  for (const email of [
    TEST_EMAIL,
    'pagination-provider@test.local',
    'pagination-booking-provider@test.local'
  ]) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) continue;
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.ticket.deleteMany({ where: { OR: [{ userId: user.id }, { requesterEmail: email }] } });
    await prisma.review.deleteMany({ where: { reviewerId: user.id } });
    await prisma.booking.deleteMany({ where: { customerId: user.id } });
    await prisma.provider.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
};
test.before(purge);
test.after(purge);

async function seedUser() {
  await purge();
  return prisma.user.create({
    data: {
      email: TEST_EMAIL,
      name: 'Pagination Tester',
      password: 'x',
      phone: '0000000002',
      role: 'customer'
    }
  });
}

dbTest('parsePagination clamps and computes offset slices', () => {
  const a = parsePagination({}, { limit: 20 });
  assert.equal(a.page, 1);
  assert.equal(a.limit, 20);
  assert.equal(a.skip, 0);
  assert.equal(a.take, 20);

  const b = parsePagination({ page: '3', limit: '500' }, { limit: 20 });
  assert.equal(b.page, 3);
  assert.equal(b.limit, 100, 'limit must be clamped to max 100');
  assert.equal(b.skip, 200);

  const c = parsePagination({ page: '0', limit: '-4' }, { limit: 20 });
  assert.equal(c.page, 1);
  assert.equal(c.limit, 1);
});

dbTest('offsetMeta computes total pages', () => {
  assert.deepEqual(offsetMeta(0, 1, 20), { total: 0, page: 1, limit: 20, pages: 0 });
  assert.deepEqual(offsetMeta(45, 2, 20), { total: 45, page: 2, limit: 20, pages: 3 });
});

dbTest('ticketController.getAll returns { tickets, pagination } and honors limit', async () => {
  const user = await seedUser();
  for (let i = 0; i < 3; i++) {
    await prisma.ticket.create({
      data: { userId: user.id, requesterName: 'Pagination Tester', requesterEmail: TEST_EMAIL, subject: `Ticket ${i}`, message: 'body', status: 'OPEN' }
    });
  }

  const adminReq = { user: { id: 'admin-1', role: 'admin' }, query: { page: '1', limit: '2' } };
  const adminPayload = await call(TicketController.getAll, adminReq);
  assert.ok(adminPayload.pagination, 'admin payload must include pagination');
  assert.equal(adminPayload.tickets.length, 2);
  assert.equal(adminPayload.pagination.limit, 2);
  assert.ok(adminPayload.pagination.total >= 3);

  const userReq = { user: { id: user.id, role: 'customer', email: TEST_EMAIL }, query: { page: '1', limit: '100' } };
  const userPayload = await call(TicketController.getAll, userReq);
  assert.equal(userPayload.tickets.length, 3, 'customer must see exactly their own tickets');
  assert.equal(userPayload.pagination.total, 3);
  assert.ok(userPayload.tickets.every(t => t.requesterEmail === TEST_EMAIL));
});

dbTest('reviewController.getAll returns { reviews, pagination }', async () => {
  const user = await seedUser();
  const providerUser = await prisma.user.create({
    data: { email: 'pagination-provider@test.local', name: 'Pagination Provider', password: 'x', phone: '0000000003', role: 'provider' }
  });
  const provider = await prisma.provider.create({ data: { userId: providerUser.id, category: 'Test' } });
  await prisma.review.createMany({
    data: [
      { reviewerId: user.id, reviewerName: 'Pagination Tester', providerId: provider.id, rating: 5, comment: 'a' },
      { reviewerId: user.id, reviewerName: 'Pagination Tester', providerId: provider.id, rating: 4, comment: 'b' }
    ]
  });

  const payload = await call(ReviewController.getAll, { query: { page: '1', limit: '1' } });
  assert.equal(payload.reviews.length, 1);
  assert.ok(payload.pagination.total >= 2);

  const byProvider = await call(ReviewController.getByProvider, { params: { id: provider.id }, query: { page: '1', limit: '10' } });
  assert.equal(byProvider.reviews.length, 2);
  assert.equal(byProvider.pagination.total, 2);

  await prisma.review.deleteMany({ where: { providerId: provider.id } });
  await prisma.provider.delete({ where: { id: provider.id } });
  await prisma.user.delete({ where: { id: providerUser.id } });
});

dbTest('bookingController.getAll cursor mode pages without overlap', async () => {
  const user = await seedUser();
  const providerUser = await prisma.user.create({
    data: { email: 'pagination-booking-provider@test.local', name: 'Booking Provider', password: 'x', phone: '0000000004', role: 'provider' }
  });
  const provider = await prisma.provider.create({ data: { userId: providerUser.id, category: 'Test' } });
  const bookingIds = [];
  for (let i = 0; i < 5; i++) {
    const booking = await prisma.booking.create({
      data: {
        customerId: user.id,
        providerId: provider.id,
        serviceCategory: 'Test',
        locationAddress: 'addr',
        city: 'Hyderabad',
        status: 'PENDING'
      }
    });
    bookingIds.push(booking.id);
  }

  const baseReq = (cursor) => ({
    user: { id: user.id, role: 'customer' },
    query: cursor
      ? { limit: '2', cursor }
      : { limit: '2', mode: 'cursor' }
  });

  const page1 = await call(BookingController.getAll, baseReq(null));
  assert.equal(page1.bookings.length, 2);
  assert.ok(page1.pagination.total >= 5);
  assert.ok(page1.pagination.nextCursor, 'first page of 5 with limit 2 must have a next cursor');

  const page2 = await call(BookingController.getAll, baseReq(page1.pagination.nextCursor));
  assert.equal(page2.bookings.length, 2);
  assert.ok(page2.pagination.nextCursor, 'second page must still have a next cursor');

  const ids = [...page1.bookings, ...page2.bookings].map(b => b.id);
  assert.equal(new Set(ids).size, 4, 'no overlapping bookings across cursor pages');

  const page3 = await call(BookingController.getAll, baseReq(page2.pagination.nextCursor));
  assert.equal(page3.bookings.length, 1);
  assert.equal(page3.pagination.nextCursor, null, 'final page must not offer a next cursor');
  assert.equal(page3.pagination.hasMore, false);

  const invalid = await call(BookingController.getAll, baseReq('%%%%'));
  assert.equal(invalid.success, false);

  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  await prisma.provider.delete({ where: { id: provider.id } });
  await prisma.user.delete({ where: { id: providerUser.id } });
});

dbTest('notificationController cursor mode pages without overlap', async () => {
  const user = await seedUser();
  const notifIds = [];
  for (let i = 0; i < 3; i++) {
    const n = await prisma.notification.create({ data: { userId: user.id, title: `N${i}`, message: 'm', type: 'SYSTEM' } });
    notifIds.push(n.id);
  }

  const callNotif = async (cursor) => {
    const req = {
      user: { id: user.id, role: 'customer' },
      query: cursor ? { limit: '2', cursor } : { limit: '2', mode: 'cursor' }
    };
    return call(NotificationController.getAll, req);
  };

  const page1 = await callNotif(null);
  assert.equal(page1.notifications.length, 2);
  assert.ok(page1.pagination.nextCursor);

  const page2 = await callNotif(page1.pagination.nextCursor);
  assert.equal(page2.notifications.length, 1);
  assert.equal(page2.pagination.nextCursor, null);

  const ids = [...page1.notifications, ...page2.notifications].map(n => n.id);
  assert.equal(new Set(ids).size, 3, 'no overlapping notifications across cursor pages');

  const plain = await call(NotificationController.getAll, {
    user: { id: user.id, role: 'customer' },
    query: { limit: '2' }
  });
  assert.ok(Array.isArray(plain), 'without cursor the endpoint must keep returning a plain array');

  await prisma.notification.deleteMany({ where: { id: { in: notifIds } } });
});

dbTest('encodeCursor round-trips through parsePagination keyset', () => {
  const row = { id: 'abc', createdAt: new Date('2026-08-01T00:00:00Z') };
  const token = encodeCursor(row);
  assert.ok(token);
  assert.ok(!token.includes('|'), 'cursor must be URL-safe base64');
  const decoded = Buffer.from(token, 'base64').toString('utf8');
  assert.ok(decoded.startsWith('abc|'));
});
