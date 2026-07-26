const ROLE_ACTIONS = {
  customer: {
    create_booking: true,
    cancel_booking: true,
    update_booking_status: true,
    review_provider: true,
    view_own_bookings: true
  },
  provider: {
    accept_booking: true,
    reject_booking: true,
    complete_booking: true,
    update_booking_status: true,
    view_assigned_bookings: true
  },
  admin: {
    approve_provider_service: true,
    verify_provider: true,
    manage_users: true,
    refund_payment: true,
    update_booking_status: true
  }
};

export function canPerformAction({ role, action, context = {} }) {
  const normalizedRole = String(role || '').toLowerCase();
  const allowed = ROLE_ACTIONS[normalizedRole]?.[action];

  if (!allowed) return false;

  if (action !== 'update_booking_status') return true;

  const currentStatus = String(context.currentStatus || '').toUpperCase();
  const nextStatus = String(context.nextStatus || '').toUpperCase();
  const requesterId = context.requesterId;
  const assignedProviderUserId = context.assignedProviderUserId;
  const customerId = context.customerId;

  if (normalizedRole === 'admin') return true;

  if (normalizedRole === 'provider') {
    return Boolean(requesterId && assignedProviderUserId && requesterId === assignedProviderUserId);
  }

  if (normalizedRole === 'customer') {
    return Boolean(requesterId && customerId && requesterId === customerId);
  }

  return false;
}
