// Centralized client-side normalization for admin derived metrics.

export const TICKET_STATUS = Object.freeze({
  OPEN: 'open',
  CLOSED: 'closed',
});

const normalizeString = (value) => (value ?? '').toString().trim().toLowerCase();

/**
 * Canonical ticket status.
 * Backend may send `open`/`OPEN` or other casing.
 */
export function normalizeTicketStatus(status) {
  const s = normalizeString(status);

  // Only map known statuses; otherwise return normalized string.
  if (s === TICKET_STATUS.OPEN) return TICKET_STATUS.OPEN;
  if (s === TICKET_STATUS.CLOSED) return TICKET_STATUS.CLOSED;

  return s;
}

export function isOpenTicket(ticket) {
  if (!ticket) return false;
  return normalizeTicketStatus(ticket.status) === TICKET_STATUS.OPEN;
}

