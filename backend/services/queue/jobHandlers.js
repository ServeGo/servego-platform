import prisma from '../../prisma/client.js';
import { sendEmail } from '../emailService.js';
import {
  recordJobStarted,
  recordLateArrival,
  recordLeadIgnored,
  recordLeadExpired,
  recordLeadOffered,
  recordJobCompleted
} from '../providerPerformanceService.js';

/**
 * Worker handlers for the durable job queue. Each key is a job `type` and the
 * value runs inside the worker — never in the request path.
 *
 * Handlers must be idempotent where it matters: a handler that fails is retried
 * (with exponential backoff) until it succeeds or the job goes DEAD, so the
 * same payload may legitimately be executed more than once.
 */

function utcDayStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function generateBookingInvoiceNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `INV-BKG-${stamp}-${Math.floor(100000 + Math.random() * 900000)}`;
}

export const jobHandlers = {
  /**
   * Persist an in-app notification. The notification row is created in the
   * worker; the request path already emitted the socket event synchronously
   * using the same object (id and all), so nothing is lost if the insert lags
   * a little behind the real-time push.
   */
  notification: async (payload = {}) => {
    const { id, userId, title, message, type } = payload;
    if (!userId || !title) throw new Error('notification job requires userId and title');
    return prisma.notification.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId,
        title,
        message: message || '',
        type: type || 'SYSTEM',
        isRead: false
      }
    });
  },

  /**
   * Deliver a transactional email. SMTP I/O is the classic reason to queue:
   * it can block for seconds and the recipient only needs the message once.
   */
  email: async ({ to, subject, text = null, html = null } = {}) => {
    if (!to || !subject) throw new Error('email job requires "to" and "subject"');
    return sendEmail({ to, subject, text, html });
  },

  /**
   * Pre-aggregate platform activity into a daily stats row so dashboard reads
   * never scan the full Booking table. Increments are applied atomically.
   */
  analytics: async (payload = {}) => {
    const date = utcDayStart(payload.date ? new Date(payload.date) : new Date());
    const incrementFields = [
      'bookingsCreated',
      'bookingsCompleted',
      'bookingsCancelled',
      'leadsCreated',
      'leadsAccepted',
      'revenue',
      'commission'
    ];
    const values = {};
    for (const field of incrementFields) {
      const amount = Number(payload[field]);
      if (amount && !Number.isNaN(amount)) values[field] = amount;
    }
    if (!Object.keys(values).length) return null;

    return prisma.platformDailyStat.upsert({
      where: { date },
      create: { date, ...values },
      update: Object.fromEntries(
        Object.entries(values).map(([field, amount]) => [field, { increment: amount }])
      )
    });
  },

  /**
   * Generate (or re-snapshot) the invoice document for a booking. Idempotent —
   * one invoice per booking; retries update the existing row instead of
   * creating duplicates.
   */
  invoice: async ({ bookingId } = {}) => {
    if (!bookingId) throw new Error('invoice job requires bookingId');
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        customerId: true,
        providerId: true,
        serviceCategory: true,
        amount: true,
        totalAmount: true,
        providerPlatformCharge: true,
        providerPayout: true,
        status: true
      }
    });
    if (!booking) throw new Error(`Booking ${bookingId} not found for invoice generation`);

    const data = {
      invoiceNumber: generateBookingInvoiceNumber(),
      bookingId: booking.id,
      customerId: booking.customerId,
      providerId: booking.providerId,
      serviceCategory: booking.serviceCategory,
      amount: Number(booking.amount) || 0,
      totalAmount: Number(booking.totalAmount) || 0,
      platformCharge: Number(booking.providerPlatformCharge) || 0,
      providerPayout: Number(booking.providerPayout) || 0,
      status: booking.status === 'COMPLETED' ? 'PAID' : 'GENERATED'
    };

    return prisma.bookingInvoice.upsert({
      where: { bookingId },
      create: data,
      update: data
    });
  },

  /**
   * Provider performance bookkeeping. The counts are derived analytics, safe to
   * apply a moment after the state change that caused them.
   */
  performance: async ({ action, providerId, amount = 0, commission = 0, jobDurationMs = null } = {}) => {
    if (!providerId) throw new Error('performance job requires providerId');
    switch (action) {
      case 'leadOffered':
        return recordLeadOffered(providerId);
      case 'jobStarted':
        return recordJobStarted(providerId);
      case 'lateArrival':
        return recordLateArrival(providerId);
      case 'leadIgnored':
        return recordLeadIgnored(providerId);
      case 'leadExpired':
        return recordLeadExpired(providerId);
      case 'jobCompleted':
        return recordJobCompleted(providerId, amount, commission, { jobDurationMs });
      default:
        throw new Error(`Unknown performance action "${action}".`);
    }
  }
};

/** Register or replace a handler at runtime (used by tests and plugins). */
export function registerHandler(type, handler) {
  if (!type || typeof handler !== 'function') {
    throw new Error('registerHandler requires a type and a handler function.');
  }
  jobHandlers[type] = handler;
}
