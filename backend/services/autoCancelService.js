import prisma from '../prisma/client.js';
import { buildStatusHistory, normalizeBookingStatus } from '../utils/workflow.js';

const PENDING_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

let intervalId = null;

export function startAutoCancelCron(io) {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - PENDING_TIMEOUT_MS);

      const staleBookings = await prisma.booking.findMany({
        where: {
          status: 'PENDING',
          createdAt: { lt: cutoff }
        },
        include: {
          customer: { select: { id: true, name: true } },
          provider: { include: { user: { select: { id: true, name: true } } } }
        }
      });

      for (const booking of staleBookings) {
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
