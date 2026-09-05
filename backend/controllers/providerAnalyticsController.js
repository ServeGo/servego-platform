import prisma from '../prisma/client.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

const toMonthKey = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const toDayKey = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const safeAvg = (nums) => {
  const arr = Array.isArray(nums) ? nums : [];
  if (!arr.length) return 0;
  const sum = arr.reduce((s, n) => s + (Number(n) || 0), 0);
  return sum / arr.length;
};

export const ProviderAnalyticsController = {
  getProviderAnalytics: async (req, res) => {
    try {
      const providerId = req.params.id;
      const { range = '90d' } = req.query || {};

      if (!['7d', '30d', '90d'].includes(range)) {
        return sendApiError(res, 400, 'INVALID_RANGE', 'range must be one of: 7d, 30d, 90d.');
      }

      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        select: { id: true, userId: true }
      });
      if (!provider) return sendApiError(res, 404, 'NOT_FOUND', 'Provider not found.');
      if (req.user.role === 'provider' && provider.userId !== req.user.id) {
        return sendApiError(res, 403, 'FORBIDDEN', 'You can only view your own analytics.');
      }

      const now = new Date();
      let since;
      if (range === '7d') since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (range === '30d') since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      else if (range === '90d') since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      else since = null;

      const whereBookings = {
        providerId,
      };
      if (since) {
        whereBookings.createdAt = { gte: since };
      }

      const bookings = await prisma.booking.findMany({
        where: whereBookings,
        select: {
          id: true,
          customerId: true,
          status: true,
          amount: true,
          providerPayout: true,
          createdAt: true,
          updatedAt: true,
          bookingDate: true,
        },
      });

      const completedCount = bookings.filter((b) => b.status === 'COMPLETED').length;
      const cancelledCount = bookings.filter((b) => b.status === 'CANCELLED').length;

      const completionRate = (() => {
        const denom = completedCount + cancelledCount;
        if (!denom) return 0;
        return completedCount / denom;
      })();

      const acceptedLike = new Set(['CONFIRMED', 'ONGOING', 'COMPLETED']);
      const offerCount = bookings.length;
      const acceptedCount = bookings.filter((b) => acceptedLike.has(b.status)).length;
      const acceptanceRate = offerCount ? acceptedCount / offerCount : 0;

      const cancellationRate = offerCount ? cancelledCount / offerCount : 0;

      const respondedBookings = bookings.filter((b) => b.status !== 'PENDING');
      const responseTimesMs = respondedBookings
        .map((b) => {
          const c = b.createdAt ? new Date(b.createdAt).getTime() : NaN;
          const u = b.updatedAt ? new Date(b.updatedAt).getTime() : NaN;
          if (!Number.isFinite(c) || !Number.isFinite(u)) return null;
          const diff = u - c;
          return diff >= 0 ? diff : null;
        })
        .filter((x) => x !== null);

      const avgResponseTimeMs = safeAvg(responseTimesMs);

      const byCustomer = new Map();
      for (const b of bookings) {
        const arr = byCustomer.get(b.customerId) || [];
        arr.push(b);
        byCustomer.set(b.customerId, arr);
      }
      const customerCount = byCustomer.size;
      const repeatCustomers = Array.from(byCustomer.values()).filter((arr) => arr.length >= 2).length;
      const retentionRate = customerCount ? repeatCustomers / customerCount : 0;

      const bookingTrendsByMonth = new Map();
      const revenueSeriesByMonth = new Map();
      const earningsByDay = new Map();

      for (const b of bookings) {
        const key = toMonthKey(b.bookingDate || b.createdAt);
        if (!key) continue;

        const existing = bookingTrendsByMonth.get(key) || {
          month: key,
          total: 0,
          completed: 0,
          cancelled: 0,
          pending: 0,
          confirmed: 0,
          ongoing: 0,
        };
        existing.total += 1;
        if (b.status === 'PENDING') existing.pending += 1;
        if (b.status === 'CONFIRMED') existing.confirmed += 1;
        if (b.status === 'ONGOING') existing.ongoing += 1;
        if (b.status === 'COMPLETED') existing.completed += 1;
        if (b.status === 'CANCELLED') existing.cancelled += 1;
        bookingTrendsByMonth.set(key, existing);

        const revExisting = revenueSeriesByMonth.get(key) || { month: key, completed: 0, earnings: 0 };
        if (b.status === 'COMPLETED') {
          revExisting.completed += 1;
          revExisting.earnings += Number(b.providerPayout) || 0;
        }
        revenueSeriesByMonth.set(key, revExisting);

        const dayKey = toDayKey(b.bookingDate || b.createdAt);
        if (b.status === 'COMPLETED' && dayKey) {
          const dayExisting = earningsByDay.get(dayKey) || { date: dayKey, bookings: 0, earnings: 0 };
          dayExisting.bookings += 1;
          dayExisting.earnings += Number(b.providerPayout) || 0;
          earningsByDay.set(dayKey, dayExisting);
        }
      }

      const bookingTrends = Array.from(bookingTrendsByMonth.values()).sort((a, b) => (a.month < b.month ? -1 : 1));
      const revenueSeries = Array.from(revenueSeriesByMonth.values()).sort((a, b) => (a.month < b.month ? -1 : 1));
      const dailyEarnings = Array.from(earningsByDay.values()).sort((a, b) => (a.date < b.date ? -1 : 1));

      const totalEarnings = bookings
        .filter((b) => b.status === 'COMPLETED')
        .reduce((sum, booking) => sum + (Number(booking.providerPayout) || 0), 0);

      return sendApiSuccess(res, 200, {
        providerId,
        range,
        totals: {
          totalEarnings,
          totalCompletedBookings: completedCount,
          completionRate,
          acceptanceRate,
          cancellationRate,
          avgResponseTimeMs,
          retentionRate,
          repeatCustomers,
          customerCount,
        },
        monthlyEarnings: revenueSeries,
        bookingTrendsByMonth: bookingTrends,
        dailyEarnings,
      });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load provider analytics', err.message);
    }
  },
};

