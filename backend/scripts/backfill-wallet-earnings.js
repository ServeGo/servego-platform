// One-time (re-runnable) backfill for Wallet.totalEarned.
//
// In the servego24 model the customer pays the provider directly, so completion
// never credits the wallet balance — it only debits platform commission. The
// gross accepted quotation total (Booking.amount) was therefore never recorded
// on Wallet.totalEarned, leaving it at 0 for providers with completed jobs.
//
// This sets each wallet's totalEarned to the sum of the provider's COMPLETED
// booking amounts (idempotent: it assigns the computed value, never increments).
//
// Usage: node scripts/backfill-wallet-earnings.js

import prisma from '../prisma/client.js';

async function main() {
  // Batch the per-provider sums in SQL, then map provider -> user in one query.
  const grouped = await prisma.booking.groupBy({
    by: ['providerId'],
    where: { status: 'COMPLETED' },
    _sum: { amount: true }
  });

  const providerIds = grouped.map((g) => g.providerId).filter(Boolean);
  const providers = providerIds.length
    ? await prisma.provider.findMany({
        where: { id: { in: providerIds } },
        select: { id: true, userId: true }
      })
    : [];
  const userIdByProvider = new Map(providers.map((p) => [p.id, p.userId]));

  const earnedByUser = new Map();
  for (const row of grouped) {
    const userId = userIdByProvider.get(row.providerId);
    if (!userId) continue;
    earnedByUser.set(userId, (earnedByUser.get(userId) || 0) + (Number(row._sum.amount) || 0));
  }

  const wallets = await prisma.wallet.findMany({
    select: { id: true, userId: true, totalEarned: true }
  });

  let updated = 0;
  for (const wallet of wallets) {
    const target = Math.round((earnedByUser.get(wallet.userId) || 0) * 100) / 100;
    if (Number(wallet.totalEarned || 0) !== target) {
      await prisma.wallet.update({ where: { id: wallet.id }, data: { totalEarned: target } });
      updated += 1;
    }
  }

  console.log(`[backfill-wallet-earnings] Completed. Wallets scanned: ${wallets.length}, updated: ${updated}.`);
}

main()
  .catch((err) => {
    console.error('[backfill-wallet-earnings] Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
