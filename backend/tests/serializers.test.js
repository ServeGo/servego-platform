import test from 'node:test';
import assert from 'node:assert/strict';
import { badgeItem, reviewItem, providerListItem, providerDetails, bookingListItem, providerDashboardSummary, providerPerformanceSummary } from '../utils/serializers.js';

function providerFixture(overrides = {}) {
  return {
    id: 'prov_1',
    userId: 'user_1',
    category: 'Electrician',
    rating: 4.8,
    reviewCount: 12,
    isVerified: true,
    accountStatus: 'ACTIVE',
    bio: 'Licensed electrician',
    photo: 'photo.jpg',
    specialties: ['Wiring', 'Repair'],
    serviceAreas: ['Mumbai'],
    isOwnSecret: 'never-should-leak',
    user: {
      id: 'user_1',
      name: 'Arjun',
      email: 'arjun@example.com',
      phone: '+919000000000',
      avatar: 'avatar.jpg',
      role: 'provider',
      status: 'ACTIVE',
      referralCode: 'ARJUN10',
      referralsCount: 3,
      createdAt: new Date('2024-01-01T00:00:00.000Z')
    },
    reviews: [
      {
        id: 'rev_1',
        rating: 5,
        comment: 'Great',
        reviewerName: 'Priya',
        serviceCategory: 'Electrician',
        bookingId: 'bk_1',
        date: new Date('2024-02-01T00:00:00.000Z'),
        reviewerId: 'user_x',
        providerId: 'prov_1',
        createdAt: new Date('2024-02-01T00:00:00.000Z'),
        updatedAt: new Date('2024-02-01T00:00:00.000Z')
      }
    ],
    badges: [{ badgeType: 'TOP_RATED', awardedAt: new Date('2024-03-01T00:00:00.000Z'), providerId: 'prov_1' }],
    ...overrides
  };
}

function bookingFixture(overrides = {}) {
  return {
    id: 'bk_1',
    customerId: 'cust_1',
    providerId: 'prov_1',
    serviceId: 'svc_1',
    serviceCategory: 'Electrician',
    bookingDate: new Date('2024-05-01T00:00:00.000Z'),
    status: 'CONFIRMED',
    locationAddress: '123 Main St',
    city: 'Mumbai',
    messages: [],
    reviewed: false,
    statusHistory: [],
    providerPhase: 'ON_THE_WAY',
    createdAt: new Date('2024-05-01T00:00:00.000Z'),
    updatedAt: new Date('2024-05-01T00:00:00.000Z'),
    customer: { id: 'cust_1', name: 'Priya', email: 'priya@example.com', phone: '+919111111111' },
    provider: {
      id: 'prov_1',
      photo: 'photo.jpg',
      user: { id: 'user_1', name: 'Arjun', email: 'arjun@example.com', phone: '+919000000000', avatar: 'avatar.jpg' },
      isVerified: true
    },
    service: { id: 'svc_1', name: 'Electrician', description: 'Full electrical work', popularIssues: [] },
    ...overrides
  };
}

test('providerListItem strips relations and never leaks unknown fields', () => {
  const item = providerListItem(providerFixture(), { includeContact: false, isOwnRow: false });

  assert.equal(item.id, 'prov_1');
  assert.equal(item.rating, 4.8);
  assert.equal(item.name, 'Arjun');
  assert.equal(item.avatar, 'photo.jpg');
  assert.equal(item.badges.length, 1);
  assert.deepEqual(item.badges[0], { badgeType: 'TOP_RATED', awardedAt: item.badges[0].awardedAt });
  assert.equal(item.isOwnSecret, undefined);
  assert.equal(item.reviews, undefined);
  assert.equal(item.email, undefined);
  assert.equal(item.phone, undefined);
  assert.deepEqual(item.user, { id: 'user_1', name: 'Arjun', avatar: 'avatar.jpg' });
});

test('providerListItem exposes contact only for the profile owner', () => {
  const item = providerListItem(providerFixture(), { includeContact: true, isOwnRow: true });

  assert.equal(item.email, 'arjun@example.com');
  assert.equal(item.phone, '+919000000000');
  assert.equal(item.user.email, 'arjun@example.com');
  assert.equal(item.user.referralCode, 'ARJUN10');
  assert.equal(item.user.joinedDate instanceof Date, true);
  assert.equal(item.reviews.length, 1);
  assert.deepEqual(Object.keys(item.reviews[0]).sort(), [
    'bookingId', 'comment', 'date', 'id', 'rating', 'reviewerName', 'serviceCategory'
  ]);
});

test('providerDetails trims reviews and availability slots', () => {
  const full = providerFixture({
    availabilitySlots: [
      { id: 'slot_1', dayOfWeek: 'Monday', startTime: '09:00', endTime: '12:00', providerId: 'prov_1', createdAt: new Date() }
    ]
  });
  const item = providerDetails(full, { includeContact: true });

  assert.equal(item.reviews.length, 1);
  assert.equal(item.reviews[0].reviewerId, undefined);
  assert.deepEqual(item.availabilitySlots, [{ id: 'slot_1', dayOfWeek: 'Monday', startTime: '09:00', endTime: '12:00' }]);
  assert.equal(item.user.email, 'arjun@example.com');
});

test('providerDetails without contact hides user contact details', () => {
  const item = providerDetails(providerFixture(), { includeContact: false });

  assert.equal(item.user.email, undefined);
  assert.equal(item.user.phone, undefined);
  assert.equal(item.email, undefined);
  assert.equal(item.phone, undefined);
  assert.equal(item.user.id, 'user_1');
});

test('bookingListItem keeps list scalars and trims nested relations', () => {
  const item = bookingListItem(bookingFixture());

  assert.equal(item.status, 'CONFIRMED');
  assert.equal(item.serviceCategory, 'Electrician');
  assert.equal(item.providerPhase, 'ON_THE_WAY');
  assert.deepEqual(item.customer, { id: 'cust_1', name: 'Priya', email: 'priya@example.com', phone: '+919111111111' });
  assert.deepEqual(item.service, { id: 'svc_1', name: 'Electrician' });
  assert.deepEqual(item.provider, {
    id: 'prov_1',
    photo: 'photo.jpg',
    user: { id: 'user_1', name: 'Arjun', avatar: 'avatar.jpg' }
  });
  assert.equal(item.provider.isVerified, undefined);
});

test('serializers degrade gracefully on missing relations', () => {
  const bare = { id: 'x', userId: 'u', category: 'Plumber', user: { id: 'u', name: 'Ravi' } };

  const listItem = providerListItem(bare);
  assert.equal(listItem.name, 'Ravi');
  assert.deepEqual(listItem.badges, []);

  const details = providerDetails(bare, { includeContact: true });
  assert.deepEqual(details.reviews, []);
  assert.deepEqual(details.availabilitySlots, []);

  const booking = bookingListItem({ id: 'bk' });
  assert.equal(booking.providerId, undefined);
  assert.deepEqual(booking.provider, { user: {} });
  assert.deepEqual(booking.service, {});

  assert.equal(badgeItem(null), null);
  assert.equal(reviewItem(undefined), null);
  assert.equal(providerListItem(null), null);
  assert.equal(providerDetails(null), null);
  assert.equal(bookingListItem(null), null);
});

test('providerListItem with contact surfaces referral fields', () => {
  const item = providerListItem(providerFixture(), { includeContact: true, isOwnRow: false });

  assert.equal(item.referralCode, 'ARJUN10');
  assert.equal(item.referralsCount, 3);
  assert.equal(item.referralsEarningsBonus, 0);
});

test('providerDashboardSummary is the owner contract with contact + audit', () => {
  const full = providerFixture({
    availabilitySlots: [{ id: 'slot_1', dayOfWeek: 'Monday', startTime: '09:00', endTime: '12:00' }]
  });
  const item = providerDashboardSummary(full);

  assert.equal(item.email, 'arjun@example.com');
  assert.equal(item.phone, '+919000000000');
  assert.equal(item.referralCode, 'ARJUN10');
  assert.equal(item.user.email, 'arjun@example.com');
  assert.equal(item.user.joinedDate instanceof Date, true);
  assert.equal(item.reviews.length, 1);
  assert.equal(item.availabilitySlots.length, 1);
  assert.equal(item.name, 'Arjun');
});

test('providerPerformanceSummary keeps level and metrics', () => {
  const provider = {
    id: 'prov_1',
    providerLevel: 'GOLD',
    jobsCompleted: 14,
    serviceFee: 50
  };
  const performance = { acceptanceRate: 0.8, responseRate: 0.9, cooldownUntil: null };
  const item = providerPerformanceSummary(provider, performance, ['BRONZE', 'SILVER', 'GOLD']);

  assert.equal(item.provider.providerLevel, 'GOLD');
  assert.equal(item.provider.jobsCompleted, 14);
  assert.deepEqual(item.performance, performance);
  assert.deepEqual(item.levelOrder, ['BRONZE', 'SILVER', 'GOLD']);
});
