import prisma from '../prisma/client.js';

// Business number prefixes per key family. Every user-facing identifier flows
// from this single scheme so the same code shows up across admin lists, booking
// receipts and provider leads:
//   BOOKING  -> SG24-0001
//   CUSTOMER -> CID-0001
//   PROVIDER -> PID-0001
//   SERVICE  -> SG24-0001 (legacy shared prefix with BOOKING)
const PREFIXES = {
  BOOKING: 'SG24',
  CUSTOMER: 'CID',
  PROVIDER: 'PID',
  SERVICE: 'SG24'
};

// Formats a plain integer into a family-specific business number.
export function formatBusinessNumber(value, key = 'BOOKING') {
  const prefix = PREFIXES[key] || 'SG24';
  return `${prefix}-${String(value).padStart(4, '0')}`;
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
  const counter = await client.businessSequenceCounter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1, updatedAt: new Date() },
    select: { value: true }
  });
  return formatBusinessNumber(counter.value, key);
}