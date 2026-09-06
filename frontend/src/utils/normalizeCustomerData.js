// Centralized client-side normalization for customer-facing data.
//
// The backend stores enums in UPPERCASE (e.g. PENDING, OPEN) and returns
// relational data nested (e.g. booking.provider.user.name). The customer UI
// expects canonical, flat, lowercased fields. Normalizing once here keeps every
// page/component consuming a single consistent shape.

const lc = (value) => (value ?? '').toString().trim().toLowerCase();

const eventToStatus = (action) => {
  const a = (action || '').toString().toUpperCase();
  if (a.includes('CANCELL')) return 'cancelled';
  if (a.includes('COMPLETE') || a.includes('FINISH')) return 'completed';
  if (a.includes('ONGOING') || a.includes('START') || a.includes('WORK')) return 'ongoing';
  if (a.includes('CONFIRM') || a.includes('ACCEPT') || a.includes('ASSIGN')) return 'confirmed';
  if (a.includes('CREATE') || a === 'CREATED') return 'pending';
  return null;
};

const terminalNote = (status) => {
  if (status === 'completed') return 'Booking completed';
  if (status === 'cancelled') return 'Booking cancelled';
  return `Status changed to ${status}`;
};

/**
 * Build a complete, chronologically-ordered tracking timeline for a booking.
 * Prefers the curated `statusHistory`, falls back to the `events` audit trail,
 * and finally derives a minimal timeline from the row scalars — so a completed
 * (or cancelled) job always shows its journey even when history was never
 * written for it.
 */
export function buildStatusTimeline(booking) {
  if (!booking) return [];

  const fromHistory = (Array.isArray(booking.statusHistory) ? booking.statusHistory : [])
    .map((h) => ({
      status: lc(h.status),
      note: h.note || '',
      timestamp: h.timestamp || booking.createdAt || null,
    }))
    .filter((h) => h.status && h.timestamp);

  if (fromHistory.length === 0) {
    const fromEvents = (Array.isArray(booking.events) ? booking.events : [])
      .map((e) => ({
        status: eventToStatus(e.action),
        note: e.note || '',
        timestamp: e.timestamp || e.createdAt || null,
      }))
      .filter((e) => e.status && e.timestamp);
    if (fromEvents.length > 0) return fromEvents;
  }

  // No history/events at all: derive a minimal terminal timeline.
  if (fromHistory.length === 0) {
    const status = lc(booking.status);
    const derived = [{ status: 'pending', note: 'Booking created', timestamp: booking.createdAt || null }];
    if (status && status !== 'pending') {
      derived.push({
        status,
        note: terminalNote(status),
        timestamp: booking.updatedAt || booking.createdAt || null,
      });
    }
    return derived.filter((d) => d.timestamp);
  }

  // Guarantee the terminal state is present even if its push was missed.
  const terminal = lc(booking.status);
  const last = fromHistory[fromHistory.length - 1];
  if (['completed', 'cancelled'].includes(terminal) && last?.status !== terminal) {
    fromHistory.push({
      status: terminal,
      note: terminalNote(terminal),
      timestamp: booking.updatedAt || last?.timestamp || booking.createdAt || null,
    });
  }

  return fromHistory;
}

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
    statusHistory: buildStatusTimeline(booking),
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
 * Canonical alert shape. Alerts arrive from `GET /alerts` as
 * { id, userId, title, message, type, data, createdAt }; every alert that
 * exists is unreviewed (reviewing deletes it), so `read` is always false.
 */
export function normalizeAlert(alert) {
  if (!alert) return alert;
  return {
    ...alert,
    read: false,
    timestamp: alert.timestamp || alert.createdAt,
  };
}

export const normalizeAlerts = (payload) => {
  const list = Array.isArray(payload) ? payload : payload?.alerts;
  return Array.isArray(list) ? list.map(normalizeAlert) : [];
};

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
