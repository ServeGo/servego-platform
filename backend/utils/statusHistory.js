/**
 * Append an entry to a booking's `statusHistory` JSON column.
 *
 * `Booking.statusHistory` is declared as `Json`, not `Json[]`, so Prisma's
 * list `push` operator must never be used — it stores the literal
 * `{ "push": {...} }` object and clobbers the whole array. Read the current
 * value first, then store the rebuilt array (this function is defensive: if a
 * prior bug left `{"push":...}` behind it resets cleanly instead of crashing).
 */
export function appendStatusHistory(history, entry) {
  const base = Array.isArray(history) ? history : [];
  return [...base, entry];
}