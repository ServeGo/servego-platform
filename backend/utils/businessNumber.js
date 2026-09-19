import prisma from '../prisma/client.js';

// Business number prefixes per key family. Every user-facing identifier flows
// from this single scheme so the same code shows up across admin lists, booking
// receipts and provider leads:
//   BOOKING  -> SG24-0001
//   CUSTOMER -> CID-0001
//   PROVIDER -> PID-0001
//   SERVICE  -> SID-0001  (SG24 is reserved exclusively for bookings)
const PREFIXES = {
  BOOKING: 'SG24',
  CUSTOMER: 'CID',
  PROVIDER: 'PID',
  SERVICE: 'SID'
};

// Maps counter key → the Prisma model table + column that stores the generated
// number, so we can derive the correct starting value from existing rows.
const COUNTER_MODEL = {
  CUSTOMER: { table: 'User', column: 'customerNumber' },
  PROVIDER: { table: 'User', column: 'providerNumber' },
  SERVICE: { table: 'Service', column: 'serviceNumber' }
};

// Formats a plain integer into a family-specific business number.
export function formatBusinessNumber(value, key = 'BOOKING') {
  const prefix = PREFIXES[key] || 'SG24';
  return `${prefix}-${String(value).padStart(4, '0')}`;
}

/**
 * Derive the next counter value from existing rows when the
 * BusinessSequenceCounter is missing or stale. Scans the model table for the
 * highest sequential number already assigned under the given prefix and returns
 * that count (so the next call to nextBusinessNumber produces count + 1).
 */
async function deriveCounterFromExistingRows(key) {
  const prefix = PREFIXES[key];
  const model = COUNTER_MODEL[key];
  if (!prefix || !model) return 0;

  const rows = await prisma.$queryRawUnsafe(
    `SELECT "${model.column}" AS num FROM "${model.table}" WHERE "${model.column}" LIKE $1`,
    `${prefix}-%`
  );

  let maxSeq = 0;
  for (const row of rows) {
    const suffix = String(row.num).replace(`${prefix}-`, '');
    const n = parseInt(suffix, 10);
    if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
  }
  return maxSeq;
}

/**
 * Atomically reserve the next business number for a key family ('BOOKING',
 * 'CUSTOMER', 'PROVIDER', 'SERVICE'). The counter is bumped inside
 * BusinessSequenceCounter with a transaction-safe increment, so two concurrent
 * creations can never receive the same number. Pass the transaction client when
 * called inside withClientTransaction so the number commits/rolls back together
 * with the entity row it is printed on.
 */
export async function nextBusinessNumber(key, client = prisma) {
  // Try the fast path: existing counter row.
  const existing = await client.businessSequenceCounter.findUnique({
    where: { key },
    select: { value: true }
  });

  if (existing) {
    const counter = await client.businessSequenceCounter.update({
      where: { key },
      data: { value: { increment: 1 }, updatedAt: new Date() },
      select: { value: true }
    });
    return formatBusinessNumber(counter.value, key);
  }

  // Counter doesn't exist — seed it from the highest number already in the
  // database so we never collide with backfilled or legacy rows.
  const maxSeq = await deriveCounterFromExistingRows(key);
  const seedValue = maxSeq + 1;

  // Use upsert with a unique guard: if two concurrent signups race to create
  // the counter, the second one wins the upsert and gets seedValue + 1.
  const counter = await client.businessSequenceCounter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: seedValue, updatedAt: new Date() },
    select: { value: true }
  });
  return formatBusinessNumber(counter.value, key);
}