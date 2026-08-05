import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidBookingTransition, normalizeBookingStatus } from '../utils/workflow.js';
import { canPerformAction } from '../utils/permissions.js';

test('allows standard booking lifecycle transitions', () => {
  assert.equal(isValidBookingTransition('PENDING', 'CONFIRMED'), true);
  assert.equal(isValidBookingTransition('CONFIRMED', 'ONGOING'), true);
  assert.equal(isValidBookingTransition('ONGOING', 'COMPLETED'), true);
  assert.equal(isValidBookingTransition('PENDING', 'CANCELLED'), true);
});

test('rejects invalid booking transition', () => {
  assert.equal(isValidBookingTransition('COMPLETED', 'CANCELLED'), false);
  assert.equal(isValidBookingTransition('CANCELLED', 'CONFIRMED'), false);
});

test('normalizes statuses consistently', () => {
  assert.equal(normalizeBookingStatus('pending'), 'PENDING');
});

test('maps legacy workflow aliases to canonical statuses', () => {
  assert.equal(normalizeBookingStatus('en_route'), 'ONGOING');
  assert.equal(normalizeBookingStatus('in_progress'), 'ONGOING');
  assert.equal(normalizeBookingStatus('reviewed'), 'COMPLETED');
  assert.equal(normalizeBookingStatus('rejected'), 'CANCELLED');
});

test('enforces booking permissions centrally', () => {
  assert.equal(
    canPerformAction({
      role: 'provider',
      action: 'update_booking_status',
      context: { requesterId: 'u1', assignedProviderUserId: 'u1', currentStatus: 'PENDING', nextStatus: 'CONFIRMED' }
    }),
    true
  );

  assert.equal(
    canPerformAction({
      role: 'provider',
      action: 'update_booking_status',
      context: { requesterId: 'u2', assignedProviderUserId: 'u1', currentStatus: 'PENDING', nextStatus: 'CONFIRMED' }
    }),
    false
  );

  assert.equal(
    canPerformAction({ role: 'customer', action: 'create_booking' }),
    true
  );

  assert.equal(
    canPerformAction({ role: 'customer', action: 'update_booking_status', context: { requesterId: 'u1', customerId: 'u2' } }),
    false
  );
});
