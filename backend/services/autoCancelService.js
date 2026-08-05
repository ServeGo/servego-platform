import prisma from '../prisma/client.js';
import { buildStatusHistory, normalizeBookingStatus } from '../utils/workflow.js';
import { cancelLeadExpiry } from './leadExpiryService.js';

const PENDING_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

let intervalId = null;

/**
 * The latest PENDING entry in the status history. Reopened bookings (lead
 * reassignment) keep their original createdAt, so this is what the 1-hour
 * timer must measure against.
 */
function getLastPendingAt(booking) {
  const history = Array.isArray(booking.statusHistory) ? booking.statusHistory : [];
  let lastPending = null;
  for (const entry of history) {
    if (normalizeBookingStatus(entry?.status) === 'PENDING' && entry?.timestamp) {
      const time = new Date(entry.timestamp).getTime();
      if (!Number.isNaN(time) && (lastPending === null || time > lastPending)) lastPending = time;
    }
  }
  return lastPending !== null ? new Date(lastPending) : booking.createdAt;
}

export function startAutoCancelCron(io) {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    try {
      const cutoff = Date.now() - PENDING_TIMEOUT_MS;

      const staleBookings = await prisma.booking.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: new Date(cutoff) }
        },
        include: {
          customer: { select: { id: true, name: true } },
          provider: { include: { user: { select: { id: true, name: true } } } },
          lead: true
        }
      });

      for (const booking of staleBookings) {
        // A booking with an active lead is still being distributed — the lead
        // timer owns its resolution, not the hour-long auto-cancel.
        const liveLead = booking.lead && ['NEW', 'VIEWED'].includes(booking.lead.status);
        if (liveLead) continue;

        // Skip bookings that were reopened (recent PENDING in status history).
        if (getLastPendingAt(booking).getTime() >= cutoff) continue;

        const newHistory = buildStatusHistory(booking.statusHistory, 'CANCELLED', 'Auto-cancelled: provider did not respond within the allowed time.');

        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: 'CANCELLED',
            statusHistory: newHistory,
            cancelledBy: 'SYSTEM',
            cancelledReason: 'Auto-cancelled: provider did not respond within the allowed time.'
          }
        });

        await prisma.bookingEvent.create({
          data: {
            bookingId: booking.id,
            actorId: null,
            actorRole: 'SYSTEM',
            action: 'STATUS_CANCELLED',
            note: 'Auto-cancelled: provider did not respond within the allowed time.'
          }
        });

        if (booking.lead) {
          cancelLeadExpiry(booking.lead.id);
          await prisma.lead.update({
            where: { id: booking.lead.id },
            data: { status: 'EXPIRED', lastRejectReason: 'AUTO_CANCEL' }
          });
        }

        if (io) {
          const payload = { bookingId: booking.id, status: 'CANCELLED' };
          io.to(`user:${booking.customerId}`).emit('booking:cancelled', payload);
          if (booking.provider?.user?.id) {
            io.to(`user:${booking.provider.user.id}`).emit('booking:cancelled', payload);
          }
        }

        console.log(`[AutoCancel] Booking ${booking.id} auto-cancelled (no provider response)`);
      }
    } catch (err) {
      console.error('[AutoCancel] Error:', err.message);
    }
  }, 300_000); // Run every 5 minutes
}

export function stopAutoCancelCron() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
