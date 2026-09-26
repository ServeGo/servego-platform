import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadPayload, redactLeadForProvider } from '../services/leadService.js';
import { bookingListItem } from '../utils/serializers.js';

// ---------------------------------------------------------------------------
// Two privacy/consistency guarantees that used to be broken:
//
// 1. A PENDING booking was created against `eligible[0]` purely to satisfy a
//    NOT NULL `Booking.providerId` FK, so the customer's pending booking
//    displayed a provider they never chose (and that provider was locked out
//    of every later lead by their phantom PENDING booking).
// 2. Every provider holding a broadcast offer received the customer's phone
//    number, full address, instructions and exact map coordinates in the lead
//    payload — before anyone had accepted. The number was only stripped once
//    the booking was CANCELLED.
// ---------------------------------------------------------------------------

const customer = { id: 'c1', name: 'Anita', phone: '+919000000001', avatar: 'a.png' };

function pendingLead(overrides = {}) {
  return {
    id: 'lead-1',
    bookingId: 'b1',
    customerId: 'c1',
    serviceId: 'svc-1',
    serviceCategory: 'Plumbing',
    status: 'NEW',
    distanceKm: null,
    notes: null,
    expiryTime: null,
    transferCount: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides
  };
}

function pendingBooking(overrides = {}) {
  return {
    id: 'b1',
    bookingNumber: 'SG24-0001',
    status: 'PENDING',
    providerId: null,
    locationAddress: '12B, Road No. 5, Banjara Hills',
    city: 'Hyderabad',
    instructions: 'Leak under the kitchen sink, needs a washer replacement',
    amount: 850,
    providerPhase: 'EN_ROUTE_PENDING',
    serviceLatitude: 17.4126,
    serviceLongitude: 78.4482,
    endLocation: { address: '12B, Road No. 5, Banjara Hills', latitude: 17.4126, longitude: 78.4482 },
    providerLatitude: null,
    providerLongitude: null,
    providerLocationUpdatedAt: null,
    ...overrides
  };
}

const PRIVATE_BOOKING_FIELDS = [
  'locationAddress',
  'instructions',
  'serviceLatitude',
  'serviceLongitude',
  'endLocation'
];

// ---- 1. no provider on a pending booking -----------------------------------

test('PENDING booking serialises provider as null (no arbitrary provider is displayed)', () => {
  const item = bookingListItem({
    id: 'b1',
    status: 'PENDING',
    providerId: null,
    customer: { id: 'c1', name: 'Anita' },
    service: { id: 'svc-1', name: 'Tap Repair' }
  });

  assert.equal(item.provider, null, 'null — not {} which would render as an unnamed real provider');
  assert.equal(item.customer.name, 'Anita');
  assert.equal(item.service.name, 'Tap Repair');
});

test('an accepted booking still serialises its provider', () => {
  const item = bookingListItem({
    id: 'b1',
    status: 'CONFIRMED',
    providerId: 'p1',
    customer: { id: 'c1', name: 'Anita' },
    provider: { id: 'p1', photo: 'p.png', user: { id: 'u1', name: 'Ravi', avatar: null } },
    service: { id: 'svc-1', name: 'Tap Repair' }
  });

  assert.equal(item.provider.id, 'p1');
  assert.equal(item.provider.user.name, 'Ravi');
});

// ---- 2. a broadcast offer never carries the customer's details -------------

test('an open broadcast offer hides the phone, full address, instructions and exact coordinates', () => {
  const lead = pendingLead();
  const payload = buildLeadPayload(lead, { ...pendingBooking(), customer }, null, { forProviderId: 'p1' });

  assert.equal(payload.customer.phone, null, 'phone withheld until a provider accepts');
  assert.equal(payload.customer.name, 'Anita', 'the name alone is not contact information');
  for (const field of PRIVATE_BOOKING_FIELDS) {
    assert.equal(payload.booking[field], null, `${field} withheld until a provider accepts`);
  }
});

test('an open offer still shows what a provider needs to decide: service, city and amount', () => {
  const payload = buildLeadPayload(pendingLead(), { ...pendingBooking(), customer }, null, { forProviderId: 'p1' });

  assert.equal(payload.serviceCategory, 'Plumbing');
  assert.equal(payload.booking.city, 'Hyderabad', 'the city is the "general area" an offer is judged on');
  assert.equal(payload.booking.bookingNumber, 'SG24-0001');
  assert.equal(payload.booking.amount, 850);
  assert.equal(payload.status, 'NEW');
});

test('the provider who accepted gets the full customer details', () => {
  const lead = pendingLead({ status: 'ACCEPTED', providerId: 'p2' });
  const booking = pendingBooking({ status: 'CONFIRMED', providerId: 'p2', customer });
  const payload = buildLeadPayload(lead, booking, null, { forProviderId: 'p2' });

  assert.equal(payload.customer.phone, '+919000000001');
  assert.equal(payload.booking.locationAddress, '12B, Road No. 5, Banjara Hills');
  assert.equal(payload.booking.instructions, 'Leak under the kitchen sink, needs a washer replacement');
  assert.equal(payload.booking.serviceLatitude, 17.4126);
  assert.equal(payload.booking.endLocation.address, '12B, Road No. 5, Banjara Hills');
});

test('a LOSING provider is still redacted after another provider accepted (the CONFIRMED booking must not leak)', () => {
  // This is the accept-race case: `notifyLeadCancelled` sends the same now
  // CONFIRMED booking to every provider whose offer was auto-cancelled. The
  // booking being CONFIRMED is NOT proof that the recipient may see the
  // customer — only that THEY own it.
  const lead = pendingLead({ status: 'ACCEPTED', providerId: 'winner' });
  const booking = pendingBooking({ status: 'CONFIRMED', providerId: 'winner', customer });
  const payload = buildLeadPayload(lead, booking, null, { forProviderId: 'loser' });

  assert.equal(payload.customer.phone, null, 'a losing provider must not receive the phone number');
  assert.equal(payload.booking.locationAddress, null);
  assert.equal(payload.booking.instructions, null);
  assert.equal(payload.booking.serviceLatitude, null);
  assert.equal(payload.booking.serviceLongitude, null);
  assert.equal(payload.booking.endLocation, null);
});

test('the accepting provider still loses the phone number once the booking is cancelled', () => {
  const lead = pendingLead({ status: 'ACCEPTED', providerId: 'p1' });
  const booking = pendingBooking({ status: 'CANCELLED', providerId: 'p1', customer });
  const payload = buildLeadPayload(lead, booking, null, { forProviderId: 'p1' });

  assert.equal(payload.customer.phone, null, 'a cancelled booking can never re-expose the number');
  assert.equal(payload.booking.locationAddress, '12B, Road No. 5, Banjara Hills', 'the job location they already worked at stays visible');
});

test('customer- and admin-facing payloads are never redacted', () => {
  const lead = pendingLead();
  const booking = { ...pendingBooking(), customer };

  const forCustomer = buildLeadPayload(lead, booking);
  assert.equal(forCustomer.customer.phone, '+919000000001', 'the customer owns their own details');
  assert.equal(forCustomer.booking.locationAddress, '12B, Road No. 5, Banjara Hills');

  const forAdmin = buildLeadPayload(lead, booking);
  assert.equal(forAdmin.customer.phone, '+919000000001', 'admins can see everything for support');
});

// ---- 3. the same rule on the read paths (inbox / single lead) ---------------

test('redactLeadForProvider redacts an inbox row for a bystander and reveals it for the owner', () => {
  const row = (providerId) => ({
    ...pendingLead(providerId ? { status: 'ACCEPTED', providerId } : {}),
    customer,
    booking: pendingBooking(providerId ? { status: 'CONFIRMED', providerId, customer } : { customer })
  });

  const forBystander = redactLeadForProvider(row(null), 'p1');
  assert.equal(forBystander.customer.phone, null);
  assert.equal(forBystander.booking.locationAddress, null);
  assert.equal(forBystander.booking.city, 'Hyderabad', 'city survives so the offer is still readable');
  assert.equal(forBystander.booking.status, 'PENDING');

  const forOwner = redactLeadForProvider(row('p1'), 'p1');
  assert.equal(forOwner.customer.phone, '+919000000001');
  assert.equal(forOwner.booking.locationAddress, '12B, Road No. 5, Banjara Hills');
});

test('redactLeadForProvider does not mutate the row it is given', () => {
  const row = { ...pendingLead(), customer, booking: pendingBooking({ customer }) };
  redactLeadForProvider(row, 'p1');
  assert.equal(row.customer.phone, '+919000000001', 'the source row is untouched');
  assert.equal(row.booking.locationAddress, '12B, Road No. 5, Banjara Hills');
});
