const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const normalizeDay = (value) => {
  const day = String(value || '').trim().toLowerCase();
  const aliases = {
    mon: 'Mon', monday: 'Mon', tue: 'Tue', tues: 'Tue', tuesday: 'Tue',
    wed: 'Wed', wednesday: 'Wed', thu: 'Thu', thur: 'Thu', thurs: 'Thu', thursday: 'Thu',
    fri: 'Fri', friday: 'Fri', sat: 'Sat', saturday: 'Sat', sun: 'Sun', sunday: 'Sun'
  };
  return aliases[day] || null;
};

function to24h(timeStr) {
  const s = String(timeStr || '').trim().toLowerCase();
  const match = s.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3];
  if (period === 'pm' && h !== 12) h += 12;
  if (period === 'am' && h === 12) h = 0;
  return h * 60 + m;
}

function isTimeInRange(requestedMin, startMin, endMin) {
  if (requestedMin === null || startMin === null || endMin === null) return false;
  if (endMin <= startMin) {
    return requestedMin >= startMin || requestedMin <= endMin;
  }
  return requestedMin >= startMin && requestedMin <= endMin;
}

export function parseCalendarDate(date) {
  if (date instanceof Date) return new Date(date);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(date);
}

export function isProviderAvailableForSlot(provider, date, slot) {
  const bookingDate = parseCalendarDate(date);
  if (Number.isNaN(bookingDate.getTime())) return false;

  const day = DAY_NAMES[bookingDate.getDay()];
  const availableDays = Array.isArray(provider.availableDays) ? provider.availableDays : [];
  if (!availableDays.map(normalizeDay).includes(day)) return false;

  const requestedSlot = String(slot || '').trim();
  if (!requestedSlot) return false;
  if (requestedSlot.toLowerCase() === 'flexible') return true;

  const configuredSlots = Array.isArray(provider.availabilitySlots) ? provider.availabilitySlots : [];
  if (configuredSlots.length) {
    const requestedMin = to24h(requestedSlot);
    return configuredSlots.some((configured) => {
      if (normalizeDay(configured.dayOfWeek) !== day) return false;
      const startMin = to24h(configured.startTime);
      const endMin = to24h(configured.endTime);
      if (requestedMin !== null) return isTimeInRange(requestedMin, startMin, endMin);
      return `${configured.startTime}-${configured.endTime}` === requestedSlot;
    });
  }

  const legacySlots = Array.isArray(provider.timeSlots) ? provider.timeSlots : [];
  return legacySlots.includes(requestedSlot);
}
