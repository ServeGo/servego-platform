const BOOKING_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ONGOING', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

const STATUS_ALIASES = {
  PENDING: ['PENDING', 'NEW', 'OPEN'],
  CONFIRMED: ['CONFIRMED', 'ACCEPTED', 'APPROVED'],
  ONGOING: ['ONGOING', 'IN_PROGRESS', 'EN_ROUTE', 'WORK_IN_PROGRESS'],
  COMPLETED: ['COMPLETED', 'DONE', 'FINISHED', 'REVIEWED'],
  CANCELLED: ['CANCELLED', 'CANCELED', 'DECLINED', 'REJECTED']
};


export function normalizeBookingStatus(status) {
  const value = String(status || '').trim().toUpperCase();
  if (value in BOOKING_TRANSITIONS) return value;

  const matched = Object.entries(STATUS_ALIASES).find(([, aliases]) => aliases.includes(value));
  return matched ? matched[0] : 'PENDING';
}


export function isValidBookingTransition(currentStatus, nextStatus) {
  const from = normalizeBookingStatus(currentStatus);
  const to = normalizeBookingStatus(nextStatus);
  return BOOKING_TRANSITIONS[from]?.includes(to) || false;
}

export function buildStatusHistory(previousHistory, nextStatus, note) {
  const history = Array.isArray(previousHistory) ? previousHistory : [];
  return [
    ...history,
    {
      status: normalizeBookingStatus(nextStatus),
      timestamp: new Date().toISOString(),
      note: note || `Status changed to ${normalizeBookingStatus(nextStatus)}`
    }
  ];
}
