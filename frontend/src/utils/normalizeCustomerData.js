// Centralized client-side normalization for customer-facing data.
//
// The backend stores enums in UPPERCASE (e.g. PENDING, OPEN) and returns
// relational data nested (e.g. booking.provider.user.name). The customer UI
// expects canonical, flat, lowercased fields. Normalizing once here keeps every
// page/component consuming a single consistent shape.

const lc = (value) => (value ?? '').toString().trim().toLowerCase();

/**
 * Canonical booking shape consumed by the customer dashboard.
 * - status -> lowercase
 * - providerName / providerAvatar -> flattened from nested relation
 * - bookingDateLabel -> human readable date
 */
export function normalizeBooking(booking) {
  if (!booking) return booking;

  const providerUser = booking.provider?.user || {};

  return {
    ...booking,
    // Ensure customer-facing filters work reliably
    customerId: booking.customerId,
    providerId: booking.providerId,
    status: lc(booking.status),

    providerName:
      booking.providerName || providerUser.name || booking.provider?.name || 'Assigned Specialist',
    providerAvatar:
      booking.providerAvatar || booking.provider?.photo || providerUser.avatar || null,
    // serviceCategory must come from the booking record itself, never from provider.category
    serviceCategory: booking.serviceCategory || '',
    customerName: booking.customerName || booking.customer?.name || '',
    customerEmail: booking.customerEmail || booking.customer?.email || '',
    bookingDateLabel: formatDate(booking.createdAt || booking.bookingDate),
    messages: Array.isArray(booking.messages) ? booking.messages : [],
    statusHistory: Array.isArray(booking.statusHistory)
      ? booking.statusHistory.map((h) => ({
          ...h,
          status: lc(h.status),
        }))
      : [],
  };
}

export const normalizeBookings = (payload) => {
  // Booking collection endpoints include pagination, while older callers may
  // still provide a raw array. Support both without dropping valid results.
  const list = Array.isArray(payload) ? payload : payload?.bookings;
  return Array.isArray(list) ? list.map(normalizeBooking) : [];
};

/**
 * Canonical provider shape (from `GET /providers`, where name/avatar are nested
 * under `user`). Discovery endpoints already return a flat shape; this is a
 * no-op for already-flat objects.
 */
export function normalizeProvider(provider) {
  if (!provider) return provider;
  const user = provider.user || {};
  return {
    ...provider,
    name: provider.name || user.name || 'Service Provider',
    avatar: provider.avatar || provider.photo || user.avatar || null,
    email: provider.email || user.email || '',
    phone: provider.phone || user.phone || '',
  };
}

export const normalizeProviders = (list) =>
  Array.isArray(list) ? list.map(normalizeProvider) : [];

/**
 * Canonical ticket shape. Backend uses requesterEmail/requesterName/adminResponse
 * and UPPERCASE status; the UI expects email/name/response and lowercase status.
 */
export function normalizeTicket(ticket) {
  if (!ticket) return ticket;
  return {
    ...ticket,
    email: ticket.email || ticket.requesterEmail || '',
    name: ticket.name || ticket.requesterName || '',
    status: lc(ticket.status),
    response: ticket.response || ticket.adminResponse || '',
    createdAtLabel: formatDate(ticket.createdAt),
  };
}

export const normalizeTickets = (payload) => {
  // List endpoints now paginate -> { tickets, pagination }. Support raw arrays
  // for older callers without dropping valid results.
  const list = Array.isArray(payload) ? payload : payload?.tickets;
  return Array.isArray(list) ? list.map(normalizeTicket) : [];
};

/**
 * Canonical notification shape. Backend uses isRead/createdAt; the UI expects
 * read/timestamp.
 */
export function normalizeNotification(notification) {
  if (!notification) return notification;
  return {
    ...notification,
    read: typeof notification.read === 'boolean' ? notification.read : Boolean(notification.isRead),
    timestamp: notification.timestamp || notification.createdAt,
  };
}

export const normalizeNotifications = (payload) => {
  const list = Array.isArray(payload) ? payload : payload?.notifications;
  return Array.isArray(list) ? list.map(normalizeNotification) : [];
};

/**
 * Canonical dispute shape. Backend returns UPPERCASE statuses and nested
 * booking/customer/provider relations; the UI consumes lowercased status plus
 * flattened labels for the two parties.
 */
export function normalizeDispute(dispute) {
  if (!dispute) return dispute;
  const providerUser = dispute.provider?.user || {};
  return {
    ...dispute,
    status: lc(dispute.status),
    raisedBy: (dispute.raisedBy || '').toString().toUpperCase(),
    reason: dispute.reason || 'OTHER',
    resolutionType: dispute.resolutionType || null,
    evidence: Array.isArray(dispute.evidence) ? dispute.evidence : [],
    messages: Array.isArray(dispute.messages) ? dispute.messages : [],
    customerName: dispute.customer?.name || dispute.customerName || 'Customer',
    providerName: providerUser.name || dispute.providerName || 'Specialist',
    serviceCategory: dispute.booking?.serviceCategory || '',
    bookingAmount: Number(dispute.booking?.amount) || Number(dispute.bookingAmount) || 0,
    createdAtLabel: formatDate(dispute.createdAt),
  };
}

export const normalizeDisputes = (list) =>
  Array.isArray(list) ? list.map(normalizeDispute) : [];

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
