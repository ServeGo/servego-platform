import prisma from '../prisma/client.js';

// Formats a plain integer into the SG24-XXXX display numbering scheme.
export function formatBusinessNumber(value) {
  return `SG24-${String(value).padStart(4, '0')}`;
}

/**
 * Atomically reserve the next business number for a key family ('BOOKING',
 * 'SERVICE'). The counter is bumped inside BusinessSequenceCounter with a
 * transaction-safe increment, so two concurrent creations can never receive
 * the same number. Pass the transaction client when called inside
 * withClientTransaction so the number commits/rolls back together with the
 * entity row it is printed on.
 */
export async function nextBusinessNumber(key, client = prisma) {
  const counter = await client.businessSequenceCounter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1, updatedAt: new Date() },
    select: { value: true }
  });
  return formatBusinessNumber(counter.value);
}