// Purpose-specific response DTOs.
//
// Controllers previously returned raw Prisma rows with deep includes (e.g.
// every provider together with full review rows). Each screen only reads a
// handful of fields, so those payloads were expensive to serialize and slow to
// parse on the client. These serializers emit the lean, purpose-specific shape
// each endpoint contract needs. They are defensive: missing relations degrade
// to safe defaults instead of throwing.

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

const PROVIDER_SCALAR_FIELDS = [
  'id',
  'userId',
  'category',
  'rating',
  'reviewCount',
  'verificationLevel',
  'accountStatus',
  'profileComplete',
  'experienceYears',
  'jobsCompleted',
  'serviceFee',
  'bio',
  'specialties',
  'serviceAreas',
  'photo',
  'serviceInterested',
  'isVerified',
  'isFeatured',
  'providerLevel',
  'sector',
  'latitude',
  'longitude',
  'maxRadiusKm',
  'isOnline',
  'acceptingBookings',
  'availableDays',
  'timeSlots',
  'createdAt',
  'updatedAt'
];

const BOOKING_SCALAR_FIELDS = [
  'id',
  'customerId',
  'providerId',
  'serviceId',
  'serviceCategory',
  'bookingDate',
  'status',
  'locationAddress',
  'city',
  'instructions',
  'serviceLatitude',
  'serviceLongitude',
  'startedAt',
  'completedAt',
  'cancelledBy',
  'cancelledReason',
  'amount',
  'customerPlatformCharge',
  'providerPlatformCharge',
  'totalAmount',
  'providerPayout',
  'messages',
  'reviewed',
  'statusHistory',
  'startLocation',
  'endLocation',
  'providerLatitude',
  'providerLongitude',
  'providerLocationUpdatedAt',
  'providerPhase',
  'createdAt',
  'updatedAt'
];

/** Provider badge as rendered by the reputation UI. */
export function badgeItem(badge) {
  if (!badge) return null;
  return pick(badge, ['badgeType', 'awardedAt']);
}

/** Review as rendered by the review audit list. */
export function reviewItem(review) {
  if (!review) return null;
  return pick(review, [
    'id',
    'rating',
    'comment',
    'reviewerName',
    'serviceCategory',
    'bookingId',
    'date'
  ]);
}

/** Availability slot as rendered by the calendar availability UI. */
export function availabilitySlotItem(slot) {
  if (!slot) return null;
  return pick(slot, ['id', 'dayOfWeek', 'startTime', 'endTime']);
}

/**
 * ProviderListItem — `GET /providers` card rows.
 *
 * Consumed by the customer card grid, the admin provider pool, and the
 * provider's own dashboard. The one heavy relation that is genuinely rendered —
 * the full review audit list — is only the requester's OWN row (the provider
 * dashboard reviews tab). Every other row drops reviews entirely; customers and
 * admins get the aggregate rating/reviewCount instead. Contact fields follow
 * the same "need to know" rule: only admins and the profile owner receive them.
 */
export function providerListItem(provider, opts = {}) {
  const { includeContact = false, isOwnRow = false } = opts;
  if (!provider) return null;

  const user = provider.user || {};
  const contactUser =
    user.id === undefined
      ? user
      : pick(user, ['id', 'name', 'email', 'phone', 'avatar', 'role', 'status', 'referralCode', 'referralsCount', 'referralBonusEarned', 'referralDiscountBalance']);

  const item = {
    ...pick(provider, PROVIDER_SCALAR_FIELDS),
    name: user.name || 'Service Provider',
    avatar: provider.photo || user.avatar || null,
    ...(includeContact
      ? {
          email: user.email || '',
          phone: user.phone || '',
          referralCode: user.referralCode || null,
          referralsCount: user.referralsCount ?? 0,
          referralsEarningsBonus: user.referralBonusEarned ?? 0
        }
      : {}),
    badges: Array.isArray(provider.badges) ? provider.badges.map(badgeItem) : []
  };

  item.user = includeContact
    ? {
        ...contactUser,
        joinedDate: user.createdAt || null
      }
    : pick(user, ['id', 'name', 'avatar']);

  // The provider's own dashboard renders the review audit from this row.
  if (isOwnRow) {
    item.reviews = Array.isArray(provider.reviews) ? provider.reviews.map(reviewItem) : [];
  }

  return item;
}

/**
 * ProviderDetails — `GET /providers/:id`. Public profile keeps a lean contact
 * shape; owners and admins additionally receive contact + account fields.
 */
export function providerDetails(provider, opts = {}) {
  const { includeContact = false } = opts;
  if (!provider) return null;

  const user = provider.user || {};
  const item = {
    ...pick(provider, PROVIDER_SCALAR_FIELDS),
    name: user.name || 'Service Provider',
    avatar: provider.photo || user.avatar || null,
    ...(includeContact
      ? {
          email: user.email || '',
          phone: user.phone || '',
          referralCode: user.referralCode || null,
          referralsCount: user.referralsCount ?? 0,
          referralsEarningsBonus: user.referralBonusEarned ?? 0
        }
      : {}),
    badges: Array.isArray(provider.badges) ? provider.badges.map(badgeItem) : [],
    reviews: Array.isArray(provider.reviews) ? provider.reviews.map(reviewItem) : [],
    availabilitySlots: Array.isArray(provider.availabilitySlots)
      ? provider.availabilitySlots.map(availabilitySlotItem)
      : []
  };

  item.user = includeContact
    ? {
        ...pick(user, ['id', 'name', 'email', 'phone', 'avatar', 'role', 'status', 'referralCode', 'referralsCount', 'referralBonusEarned', 'referralDiscountBalance']),
        joinedDate: user.createdAt || null
      }
    : pick(user, ['id', 'name', 'avatar']);

  return item;
}

/**
 * BookingListItem — `GET /bookings` rows. All booking scalars are preserved
 * (the client normalizes and renders them), but the nested provider/service
 * relations are trimmed to what list screens actually read: provider identity
 * for the card and the service label. Contact-heavy shapes stay on the
 * single-booking `getById` path, not on every row of a list.
 */
export function bookingListItem(booking) {
  if (!booking) return null;

  const provider = booking.provider || {};
  const providerUser = provider.user || {};

  return {
    ...pick(booking, BOOKING_SCALAR_FIELDS),
    customer: pick(booking.customer || {}, ['id', 'name', 'email', 'phone']),
    provider: {
      ...pick(provider, ['id', 'photo']),
      user: pick(providerUser, ['id', 'name', 'avatar'])
    },
    service: pick(booking.service || {}, ['id', 'name']),
    // The live (latest) quotation for the booking — drives the Start Work /
    // Confirm quotation panels. Empty until a provider submits one.
    quotation: Array.isArray(booking.quotations) && booking.quotations[0]
      ? {
          id: booking.quotations[0].id,
          serviceFee: booking.quotations[0].serviceFee,
          items: booking.quotations[0].items,
          totalAmount: booking.quotations[0].totalAmount,
          status: booking.quotations[0].status,
          createdAt: booking.quotations[0].createdAt,
          updatedAt: booking.quotations[0].updatedAt
        }
      : null,
    // Lean ordered audit trail — lets the client rebuild a tracking timeline
    // for bookings whose `statusHistory` was never written.
    events: Array.isArray(booking.events)
      ? booking.events.map((e) => ({ action: e.action, note: e.note || null, actorRole: e.actorRole || null, timestamp: e.createdAt }))
      : []
  };
}

/**
 * ProviderDashboardSummary — `GET /providers/me/summary`. The provider's own
 * dashboard contract: profile + contact + availability + the review audit.
 * Everything the owner screens render, in one purpose-specific shape. Not for
 * public consumption — the owner row in `GET /providers` stays a lean card.
 */
export function providerDashboardSummary(provider) {
  return providerDetails(provider, { includeContact: true });
}

/**
 * ProviderPerformanceSummary — `GET /provider-performance/me`. Level + live
 * performance metrics for the provider's own dashboard. The DB select already
 * picks explicit columns; this trims everything the client does not read.
 */
export function providerPerformanceSummary(provider, performance, levelOrder) {
  return {
    provider: pick(provider || {}, [
      'id',
      'providerLevel',
      'promotionDate',
      'sector',
      'rating',
      'reviewCount',
      'jobsCompleted',
      'experienceYears',
      'serviceFee',
      'latitude',
      'longitude'
    ]),
    performance: performance || {},
    levelOrder: Array.isArray(levelOrder) ? levelOrder : []
  };
}
