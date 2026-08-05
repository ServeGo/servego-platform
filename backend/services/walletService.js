import prisma from '../prisma/client.js';
import { getConfig } from './adminConfigService.js';

/** Run `fn` inside a transaction unless the caller already provided a transaction client. */
function withClientTransaction(client, fn) {
  if (client === prisma) {
    return prisma.$transaction(fn, { isolationLevel: 'Serializable', maxWait: 20000, timeout: 30000 });
  }
  return fn(client);
}

function walletError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/** Ensure the user has a Wallet row (idempotent). */
export async function getOrCreateWallet(userId, client = prisma) {
  if (!userId) throw walletError('USER_REQUIRED', 'A user ID is required.');
  let wallet = await client.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await client.wallet.create({ data: { userId } });
  }
  return wallet;
}

async function mutateWallet({ userId, delta, type, category, referenceType, referenceId, description, status = 'COMPLETED', client }) {
  return withClientTransaction(client, async (tx) => {
    const wallet = await getOrCreateWallet(userId, tx);
    const newBalance = Number(wallet.balance) + delta;
    if (newBalance < 0) throw walletError('INSUFFICIENT_BALANCE', 'Insufficient wallet balance.');

    const data = {
      balance: newBalance,
      ...(delta > 0
        ? { totalCredited: { increment: delta } }
        : { totalDebited: { increment: Math.abs(delta) } })
    };
    if (delta > 0 && category === 'BOOKING_EARNING') data.totalEarned = { increment: delta };

    const updated = await tx.wallet.update({ where: { id: wallet.id }, data });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type,
        category,
        amount: Math.abs(delta),
        balanceAfter: newBalance,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        description: description || null,
        status
      }
    });

    return updated;
  });
}

/** Add funds to a wallet. Category must be a WalletTransactionCategory value. */
export function creditWallet({ userId, amount, category, referenceType = null, referenceId = null, description = null, status = 'COMPLETED', client = prisma }) {
  const amt = Number(amount) || 0;
  if (amt <= 0) throw walletError('INVALID_AMOUNT', 'Credit amount must be positive.');
  return mutateWallet({
    userId,
    delta: amt,
    type: 'CREDIT',
    category,
    referenceType,
    referenceId,
    description,
    status,
    client
  });
}

/** Withdraw funds from a wallet (hold for payouts, refunds are reversed via credit). */
export function debitWallet({ userId, amount, category, referenceType = null, referenceId = null, description = null, status = 'COMPLETED', client = prisma }) {
  const amt = Number(amount) || 0;
  if (amt <= 0) throw walletError('INVALID_AMOUNT', 'Debit amount must be positive.');
  return mutateWallet({
    userId,
    delta: -amt,
    type: 'DEBIT',
    category,
    referenceType,
    referenceId,
    description,
    status,
    client
  });
}

/** Wallet + latest transactions for the current user. */
export async function getWalletOverview(userId, client = prisma) {
  const wallet = await getOrCreateWallet(userId, client);
  const [transactions, totalCount] = await Promise.all([
    client.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    client.walletTransaction.count({ where: { userId } })
  ]);
  return {
    id: wallet.id,
    balance: Number(wallet.balance || 0),
    totalCredited: Number(wallet.totalCredited || 0),
    totalDebited: Number(wallet.totalDebited || 0),
    totalWithdrawn: Number(wallet.totalWithdrawn || 0),
    totalEarned: Number(wallet.totalEarned || 0),
    currency: wallet.currency,
    transactionCount: totalCount,
    recentTransactions: transactions
  };
}

/** Paginated ledger for the current user (optional category filter). */
export async function listWalletTransactions(userId, { page = 1, limit = 25, category = null } = {}, client = prisma) {
  const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)));
  const where = { userId };
  if (category) where.category = category;
  const [transactions, total] = await Promise.all([
    client.walletTransaction.findMany({ where, skip, take: Math.min(100, Math.max(1, parseInt(limit))), orderBy: { createdAt: 'desc' } }),
    client.walletTransaction.count({ where })
  ]);
  return {
    transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / Math.min(100, Math.max(1, parseInt(limit))))
    }
  };
}

/**
 * Provider requests a payout. The amount is debited immediately (held) so the
 * same funds cannot be withdrawn twice, and a PENDING request is created for
 * admin review. If the request is rejected the held amount is returned.
 */
export async function requestProviderWithdrawal({ userId, providerId, amount, accountDetails, description = null, client = prisma }) {
  const minWithdrawal = Math.max(1, Number(await getConfig('walletMinimumWithdrawal', 100)) || 100);
  const amt = Number(amount) || 0;
  if (amt <= 0) throw walletError('INVALID_AMOUNT', 'Withdrawal amount must be positive.');
  if (amt < minWithdrawal) throw walletError('BELOW_MINIMUM', `Minimum withdrawal amount is ₹${minWithdrawal}.`);

  return withClientTransaction(client, async (tx) => {
    const wallet = await getOrCreateWallet(userId, tx);
    await debitWallet({
      userId,
      amount: amt,
      category: 'WITHDRAWAL',
      referenceType: 'WITHDRAWAL',
      description: 'Withdrawal request — funds on hold',
      client: tx
    });

    const details = accountDetails && typeof accountDetails === 'object' ? accountDetails : {};
    if (!details.upiId && !details.accountNumber && !details.other) {
      throw walletError('ACCOUNT_DETAILS_REQUIRED', 'Provide at least a UPI ID or bank account details for the payout.');
    }

    return tx.walletWithdrawalRequest.create({
      data: {
        walletId: wallet.id,
        userId,
        providerId,
        amount: amt,
        accountDetails: details,
        description,
        status: 'PENDING'
      }
    });
  });
}

/** Provider's own withdrawal requests (latest first). */
export async function listMyWithdrawals(userId, client = prisma) {
  return client.walletWithdrawalRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { provider: { select: { id: true, user: { select: { name: true } } } } }
  });
}

/**
 * Admin processes a withdrawal request.
 *  - APPROVED: the hold remains; payout is queued for the provider.
 *  - REJECTED: the held amount is returned to the wallet.
 *  - PAID: payout executed (totalWithdrawn is bumped).
 */
export async function processProviderWithdrawal({ withdrawalId, action, adminId, adminNote = null, client = prisma }) {
  const normalized = String(action || '').toUpperCase();
  if (!['APPROVED', 'REJECTED', 'PAID'].includes(normalized)) {
    throw walletError('INVALID_ACTION', 'Action must be APPROVED, REJECTED or PAID.');
  }

  return withClientTransaction(client, async (tx) => {
    const request = await tx.walletWithdrawalRequest.findUnique({ where: { id: withdrawalId } });
    if (!request) throw walletError('NOT_FOUND', 'Withdrawal request not found.');
    const canProcess = request.status === 'PENDING' || (normalized === 'PAID' && request.status === 'APPROVED');
    if (!canProcess) {
      throw walletError('ALREADY_PROCESSED', 'This withdrawal request cannot be processed in its current state.');
    }

    if (normalized === 'REJECTED') {
      await creditWallet({
        userId: request.userId,
        amount: Number(request.amount) || 0,
        category: 'ADJUSTMENT',
        referenceType: 'WITHDRAWAL',
        referenceId: request.id,
        description: 'Withdrawal request rejected — held amount returned',
        client: tx
      });
    }

    const updated = await tx.walletWithdrawalRequest.update({
      where: { id: request.id },
      data: {
        status: normalized,
        processedBy: adminId,
        processedAt: new Date(),
        adminNote: adminNote || null
      }
    });

    if (normalized === 'PAID') {
      await tx.wallet.update({
        where: { id: request.walletId },
        data: { totalWithdrawn: { increment: Number(request.amount) || 0 } }
      });
    }

    return updated;
  });
}

/** Admin — pending withdrawals (default) or all by status. */
export async function listAdminWithdrawals({ status = null, page = 1, limit = 25 } = {}, client = prisma) {
  const where = status ? { status } : {};
  const [requests, total] = await Promise.all([
    client.walletWithdrawalRequest.findMany({
      where,
      skip: (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit))),
      take: Math.min(100, Math.max(1, parseInt(limit))),
      orderBy: { createdAt: 'desc' },
      include: {
        provider: { select: { id: true, user: { select: { id: true, name: true, email: true } } } },
        wallet: { select: { balance: true, currency: true } }
      }
    }),
    client.walletWithdrawalRequest.count({ where })
  ]);
  return {
    withdrawals: requests,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / Math.min(100, Math.max(1, parseInt(limit))))
    }
  };
}

/** Admin — ledger of every wallet transaction (filterable by category/status). */
export async function listAllWalletTransactions({ page = 1, limit = 25, category = null, userId = null } = {}, client = prisma) {
  const where = {};
  if (category) where.category = category;
  if (userId) where.userId = userId;
  const [transactions, total] = await Promise.all([
    client.walletTransaction.findMany({
      where,
      skip: (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit))),
      take: Math.min(100, Math.max(1, parseInt(limit))),
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    }),
    client.walletTransaction.count({ where })
  ]);
  return {
    transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / Math.min(100, Math.max(1, parseInt(limit))))
    }
  };
}

/** Admin — aggregate wallet health across the platform. */
export async function getAdminWalletOverview(client = prisma) {
  const [walletAgg, earnedAgg, pendingWithdrawals, recentWallets] = await Promise.all([
    client.wallet.aggregate({
      _sum: { balance: true, totalCredited: true, totalDebited: true, totalWithdrawn: true, totalEarned: true },
      _count: { id: true }
    }),
    client.walletTransaction.aggregate({
      where: { category: 'BOOKING_EARNING' },
      _sum: { amount: true }
    }),
    client.walletWithdrawalRequest.count({ where: { status: 'PENDING' } }),
    client.wallet.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    })
  ]);
  return {
    summary: {
      wallets: walletAgg._count.id,
      totalBalance: walletAgg._sum.balance || 0,
      totalCredited: walletAgg._sum.totalCredited || 0,
      totalDebited: walletAgg._sum.totalDebited || 0,
      totalWithdrawn: walletAgg._sum.totalWithdrawn || 0,
      totalEarned: walletAgg._sum.totalEarned || 0,
      bookingEarnings: earnedAgg._sum.amount || 0,
      pendingWithdrawals
    },
    recentWallets
  };
}

/** Admin — credit a user's wallet manually (promotional / adjustment). */
export async function adminCreditWallet({ userId, amount, category = 'PROMOTIONAL_CREDIT', description = null, adminId = null, client = prisma }) {
  if (!['PROMOTIONAL_CREDIT', 'ADJUSTMENT', 'BOOKING_REFUND', 'DISPUTE_REFUND'].includes(category)) {
    throw walletError('INVALID_CATEGORY', 'Category must be PROMOTIONAL_CREDIT, ADJUSTMENT, BOOKING_REFUND or DISPUTE_REFUND.');
  }
  const amt = Number(amount) || 0;
  if (amt <= 0) throw walletError('INVALID_AMOUNT', 'Credit amount must be positive.');
  const target = await client.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) throw walletError('USER_NOT_FOUND', 'User not found.');

  return creditWallet({
    userId,
    amount: amt,
    category,
    referenceType: category === 'PROMOTIONAL_CREDIT' ? 'ADMIN_CREDIT' : null,
    referenceId: adminId || null,
    description: description || `Manual credit by admin (${category})`,
    client
  });
}

export { withClientTransaction };
