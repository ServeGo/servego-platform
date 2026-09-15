import prisma from '../prisma/client.js';

/**
 * Enrich rows that carry `relatedBookingId` (notifications, support tickets)
 * with the booking's business number (SG24-XXXX) so every human-facing
 * reference to a booking shows the stable number, never a raw cuid.
 *
 * One batched `findMany ... in` — never one query per row (AGENTS.md rule 12).
 * Returns new row objects (originals are not mutated).
 */
export async function withBookingNumber(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const bookingIds = [...new Set(rows.map((row) => row.relatedBookingId).filter(Boolean))];
  if (bookingIds.length === 0) return rows;

  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    select: { id: true, bookingNumber: true }
  });
  const byId = new Map(bookings.map((b) => [b.id, b.bookingNumber || null]));

  return rows.map((row) =>
    row.relatedBookingId ? { ...row, bookingNumber: byId.get(row.relatedBookingId) || null } : row
  );
}