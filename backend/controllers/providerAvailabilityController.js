import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { parseCalendarDate } from '../utils/availability.js';

function normalizeDowInput(day) {
  if (!day) return null;
  const d = String(day).trim().toLowerCase();
  const map = {
    mon: 'Mon',
    monday: 'Mon',
    tue: 'Tue',
    tues: 'Tue',
    tuesday: 'Tue',
    wed: 'Wed',
    wednesday: 'Wed',
    thu: 'Thu',
    thur: 'Thu',
    thurs: 'Thu',
    thursday: 'Thu',
    fri: 'Fri',
    friday: 'Fri',
    sat: 'Sat',
    saturday: 'Sat',
    sun: 'Sun',
    sunday: 'Sun',
  };
  return map[d] || null;
}

function dayOfWeekShort(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

export const ProviderAvailabilityController = {
  getAvailability: async (req, res) => {
    try {
      const providerId = req.params.id;
      // Schedules are public booking-flow data; mutations remain provider/admin-only.
      if (req.query.date) return ProviderAvailabilityController.getAvailabilityForDate(req, res);
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { userId: true, availableDays: true, timeSlots: true, availabilitySlots: true, accountStatus: true, isVerified: true, user: { select: { status: true } } }
      });
      if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Provider not found.');
      if (provider.accountStatus !== 'ACTIVE' || !provider.isVerified || provider.user?.status !== 'ACTIVE') return sendApiError(res, 404, 'NOT_FOUND', 'Provider not found.');
      return sendApiSuccess(res, 200, {
        providerId,
        availableDays: provider.availableDays,
        timeSlots: provider.timeSlots,
        availabilitySlots: provider.availabilitySlots
      });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to retrieve availability schedule', err.message);
    }
  },

  getAvailabilityForDate: async (req, res) => {
    try {
      const providerId = req.params.id;
      const { date } = req.query;

      if (!date) return sendApiError(res, 400, 'MISSING_FIELDS', 'Query param "date" is required (YYYY-MM-DD).');

      const parsed = parseCalendarDate(date);
      if (Number.isNaN(parsed.getTime())) {
        return sendApiError(res, 400, 'INVALID_DATE', 'Invalid date query param.');
      }

      const dayStart = new Date(parsed);
      dayStart.setHours(0, 0, 0, 0);

      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { availableDays: true, timeSlots: true, availabilitySlots: true, accountStatus: true, isVerified: true, user: { select: { status: true } } },
      });

      if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Provider not found.');
      if (provider.accountStatus !== 'ACTIVE' || !provider.isVerified || provider.user?.status !== 'ACTIVE') return sendApiError(res, 404, 'NOT_FOUND', 'Provider not found.');

      const dow = dayOfWeekShort(dayStart);
      const providerDays = Array.isArray(provider.availableDays) ? provider.availableDays : [];

      const normalizedProviderDays = providerDays
        .map(normalizeDowInput)
        .filter(Boolean);

      const isWorkingDay = normalizedProviderDays.includes(dow);

      if (!isWorkingDay) {
        return sendApiSuccess(res, 200, {
          providerId,
          date,
          isWorkingDay: false,
          slots: [],
        });
      }

      const configuredSlots = Array.isArray(provider.availabilitySlots) ? provider.availabilitySlots : [];
      const rawSlots = configuredSlots.length
        ? configuredSlots.filter((slot) => normalizeDowInput(slot.dayOfWeek) === dow).map((slot) => `${slot.startTime}-${slot.endTime}`)
        : (Array.isArray(provider.timeSlots) ? provider.timeSlots : []);
      const slots = rawSlots.length ? rawSlots : ['Flexible'];

      const hasActiveBooking = await prisma.booking.findFirst({
        where: {
          providerId,
          status: { in: ['PENDING', 'CONFIRMED', 'ONGOING'] },
        },
        select: { id: true },
      });

      const slotResults = slots.map((slot) => ({
        slot,
        busy: !!hasActiveBooking,
      }));

      return sendApiSuccess(res, 200, {
        providerId,
        date,
        isWorkingDay: true,
        slots: slotResults,
      });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to compute provider availability', err.message);
    }
  },
};

