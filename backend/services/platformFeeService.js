import prisma from '../prisma/client.js';
import { getConfig } from './adminConfigService.js';
import {
  createGatewayOrder,
  verifyPaymentSignature
} from './paymentGatewayService.js';
import {
  notifyProviderFeeDue,
  notifyProviderFeeOverdue,
  notifyProviderFeePaid,
  notifyCustomerFeeDue,
  notifyCustomerFeePaid
} from './notificationService.js';

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const REMINDER_LEAD_MS = 3 * 24 * 60 * 60 * 1000; // remind 3 days before due

function serviceError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function addMonth(date) {
  return new Date(new Date(date).getTime() + MONTH_MS);
}

function generateInvoiceNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `FEE-${stamp}-${Math.floor(100000 + Math.random() * 900000)}`;
}

/** Run `fn` inside a transaction unless the caller already provided one. */
function withClientTransaction(client, fn) {
  if (client === prisma) {
    return prisma.$transaction(fn, { isolationLevel: 'Serializable', maxWait: 20000, timeout: 30000 });
  }
  return fn(client);
}

/** Admin-configurable platform fee settings. */
export async function getPlatformFeeConfig(client = prisma) {
  const [providerEnabled, providerAmount, graceDays, customerEnabled, customerAmount] = await Promise.all([
    getConfig('platformFeeEnabled', true, client),
    getConfig('platformFeeAmount', 99, client),
    getConfig('platformFeeGraceDays', 30, client),
    getConfig('customerPlatformFeeEnabled', true, client),
    getConfig('customerPlatformFeeAmount', 49, client)
  ]);
  return {
    providerEnabled: Boolean(providerEnabled),
    providerAmount: Math.max(0, Number(providerAmount) || 0),
    graceDays: Math.max(0, Number(graceDays) || 0),
    customerEnabled: Boolean(customerEnabled),
    customerAmount: Math.max(0, Number(customerAmount) || 0)
  };
}

export function feeAmountForRole(config, role) {
  return role === 'CUSTOMER' ? config.customerAmount : config.providerAmount;
}

export function feeEnabledForRole(config, role) {
  return role === 'CUSTOMER' ? config.customerEnabled : config.providerEnabled;
}

/**
 * Pure overdue evaluation (unit-testable).
 * - No account → not overdue.
 * - DISABLED accounts are never overdue.
 * - Otherwise overdue once `now > periodEnd` (the current due date). Providers
 *   get `graceDays` from join before `periodEnd` is first reached.
 */
export function isAccountOverdue(account, now = new Date()) {
  if (!account) return false;
  if (account.status === 'DISABLED') return false;
  if (account.status === 'OVERDUE') return true;
  const due = account.periodEnd ? new Date(account.periodEnd).getTime() : null;
  return due != null && now.getTime() > due;
}

function initialAccountData(user, role, config, now = new Date()) {
  const joinedAt = user.createdAt ? new Date(user.createdAt) : now;
  if (role === 'CUSTOMER') {
    return {
      role,
      periodStart: joinedAt,
      periodEnd: addMonth(joinedAt),
      graceEndsAt: joinedAt,
      status: 'ACTIVE',
      amount: config.customerAmount
    };
  }
  const graceEndsAt = new Date(joinedAt.getTime() + config.graceDays * 24 * 60 * 60 * 1000);
  return {
    role,
    periodStart: joinedAt,
    periodEnd: graceEndsAt,
    graceEndsAt,
    status: now <= graceEndsAt ? 'GRACE' : 'OVERDUE',
    amount: config.providerAmount
  };
}

/**
 * Idempotently create a platform-fee account for a user if they don't have one.
 * Accounts for new users are created lazily here and by the billing cron.
 */
export async function ensurePlatformFeeAccount(userId, role, { client = prisma } = {}) {
  const existing = await client.platformFeeAccount.findUnique({ where: { userId } });
  if (existing) return existing;

  const user = await client.user.findUnique({ where: { id: userId }, select: { createdAt: true, role: true } });
  if (!user) throw serviceError('USER_NOT_FOUND', 'User not found.');

  const config = await getPlatformFeeConfig(client);
  const roleKey = role === 'CUSTOMER' ? 'CUSTOMER' : 'PROVIDER';
  const data = initialAccountData(user, roleKey, config);

  return client.platformFeeAccount.create({
    data: { userId, ...data }
  });
}

/**
 * Current fee status for a user — creates the account on first access.
 * Returns { account, enabled, amount, role, overdue, dueAt, graceEndsAt }.
 */
export async function getFeeStatus(userId, role, { client = prisma } = {}) {
  const account = await ensurePlatformFeeAccount(userId, role, { client });
  const config = await getPlatformFeeConfig(client);
  return {
    account,
    enabled: feeEnabledForRole(config, role),
    amount: feeAmountForRole(config, role),
    role,
    overdue: feeEnabledForRole(config, role) ? isAccountOverdue(account) : false,
    dueAt: account.periodEnd,
    graceEndsAt: account.graceEndsAt
  };
}

/**
 * Phase 1 — create a Razorpay order for the user's monthly platform fee. A
 * PENDING PlatformFeePayment is written for audit and promoted to PAID after
 * `confirmPlatformFeePayment` verifies the gateway signature.
 */
export async function createPlatformFeeOrder(userId, role, { client = prisma } = {}) {
  const config = await getPlatformFeeConfig(client);
  if (!feeEnabledForRole(config, role)) {
    throw serviceError('PLATFORM_FEE_DISABLED', 'The platform fee is currently disabled.');
  }

  const account = await ensurePlatformFeeAccount(userId, role, { client });
  const amount = Number(account.amount) || feeAmountForRole(config, role);
  if (amount <= 0) {
    throw serviceError('PLATFORM_FEE_ZERO', 'The configured platform fee is zero; nothing to pay.');
  }

  // Only one active checkout at a time per user — supersede abandoned ones.
  await client.platformFeePayment.updateMany({
    where: { userId, paymentStatus: 'PENDING' },
    data: { paymentStatus: 'FAILED', errorDetail: 'Superseded by a new payment order.' }
  });

  const periodStart = account.periodEnd || new Date();
  const periodEnd = addMonth(periodStart);
  const payment = await client.platformFeePayment.create({
    data: {
      accountId: account.id,
      userId,
      role,
      periodStart,
      periodEnd,
      amount,
      paymentStatus: 'PENDING',
      paymentGateway: 'razorpay',
      createdAt: new Date()
    }
  });

  let order;
  try {
    order = await createGatewayOrder({
      amountInr: amount,
      receipt: `FEE-${payment.id.slice(-14)}`,
      notes: { userId, role, feePeriod: periodEnd.toISOString() }
    });
  } catch (err) {
    await client.platformFeePayment.update({
      where: { id: payment.id },
      data: { paymentStatus: 'FAILED', errorDetail: err.message || 'Order creation failed.' }
    });
    throw err;
  }

  await client.platformFeePayment.update({
    where: { id: payment.id },
    data: { gatewayOrderId: order.id }
  });

  return {
    orderId: order.id,
    amountInr: amount,
    amountPaise: order.amount,
    currency: order.currency,
    transactionId: payment.id,
    role,
    gateway: 'razorpay',
    gatewayConfigured: true,
    keyId: process.env.RAZORPAY_KEY_ID || ''
  };
}

/**
 * Phase 2 — verify the completed checkout signature and, in one transaction,
 * mark the payment PAID and advance the account's billing window by one month.
 */
export async function confirmPlatformFeePayment({
  transactionId = null,
  orderId = null,
  paymentId,
  signature,
  verified = false,
  client = prisma
}) {
  if (!verified && (!paymentId || !signature)) {
    throw serviceError('MISSING_FIELDS', 'paymentId and signature are required to confirm the payment.');
  }
  if (!paymentId) {
    throw serviceError('MISSING_FIELDS', 'paymentId is required to confirm the payment.');
  }

  const existing = transactionId
    ? await client.platformFeePayment.findUnique({ where: { id: transactionId } })
    : orderId
      ? await client.platformFeePayment.findFirst({ where: { gatewayOrderId: orderId } })
      : null;
  if (!existing) throw serviceError('TRANSACTION_NOT_FOUND', 'No pending payment order was found.');

  const gatewayOrderId = existing.gatewayOrderId || orderId;
  if (!gatewayOrderId) throw serviceError('TRANSACTION_NOT_FOUND', 'No gateway order is associated with this transaction.');
  if (!verified) verifyPaymentSignature({ orderId: gatewayOrderId, paymentId, signature });

  if (existing.paymentStatus === 'PAID') {
    return {
      transaction: existing,
      account: await client.platformFeeAccount.findUnique({ where: { userId: existing.userId } }),
      alreadyPaid: true
    };
  }

  return withClientTransaction(client, async (tx) => {
    const account = await ensurePlatformFeeAccount(existing.userId, existing.role, { client: tx });
    const invoiceNumber = generateInvoiceNumber();
    const paidAt = new Date();

    const transaction = await tx.platformFeePayment.update({
      where: { id: existing.id },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: 'ONLINE',
        paymentGateway: 'razorpay',
        transactionId: paymentId,
        gatewayPaymentId: paymentId,
        invoiceNumber,
        errorDetail: null,
        paidAt
      }
    });

    // Advance coverage from the previous period end so late payments never
    // extend free time (periodStart stays the old due date).
    const periodStart = account.periodEnd ? new Date(account.periodEnd) : paidAt;
    const periodEnd = addMonth(periodStart);
    const updatedAccount = await tx.platformFeeAccount.update({
      where: { id: account.id },
      data: {
        periodStart,
        periodEnd,
        status: 'ACTIVE',
        amount: transaction.amount,
        lastPaymentAt: paidAt,
        lastReminderAt: null
      }
    });

    return { transaction, account: updatedAccount, alreadyPaid: false };
  });
}

/** Mark a pending gateway transaction as FAILED (webhook or abandoned checkout). */
export async function markPlatformFeePaymentFailed({ transactionId = null, orderId = null, errorDetail = 'Payment failed or was abandoned.', client = prisma } = {}) {
  const existing = transactionId
    ? await client.platformFeePayment.findUnique({ where: { id: transactionId } })
    : orderId
      ? await client.platformFeePayment.findFirst({ where: { gatewayOrderId: orderId } })
      : null;
  if (!existing || existing.paymentStatus === 'PAID') return null;
  return client.platformFeePayment.update({
    where: { id: existing.id },
    data: { paymentStatus: 'FAILED', errorDetail: String(errorDetail || '').slice(0, 500) }
  });
}

/** Mark a transaction REFUNDED (webhook `refund.processed`). */
export async function markPlatformFeePaymentRefunded({ transactionId = null, orderId = null, refundId = null, client = prisma } = {}) {
  const existing = transactionId
    ? await client.platformFeePayment.findUnique({ where: { id: transactionId } })
    : orderId
      ? await client.platformFeePayment.findFirst({ where: { gatewayOrderId: orderId } })
      : null;
  if (!existing || existing.paymentStatus === 'REFUNDED') return null;
  return client.platformFeePayment.update({
    where: { id: existing.id },
    data: { paymentStatus: 'REFUNDED', errorDetail: refundId ? `Refund processed (${refundId}).` : 'Refund processed.' }
  });
}

/**
 * Daily billing sweep:
 *   1. Create accounts for any users that don't have one yet.
 *   2. Mark accounts OVERDUE once their due date passes and notify the owner
 *      (providers are blocked from new leads; customers only get reminded).
 *   3. Send a reminder when the due date is within the reminder window and the
 *      account hasn't been reminded for the current period.
 */
export async function advanceFeeBilling({ io = null } = {}) {
  const config = await getPlatformFeeConfig();

  // Backfill accounts for users that never triggered a lazy creation.
  const usersWithoutAccount = await prisma.user.findMany({
    where: { platformFeeAccount: { is: null } },
    select: { id: true, role: true, createdAt: true }
  });
  for (const user of usersWithoutAccount) {
    const role = user.role === 'provider' ? 'PROVIDER' : user.role === 'admin' ? 'CUSTOMER' : 'CUSTOMER';
    const data = initialAccountData(user, role, config);
    await prisma.platformFeeAccount.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, ...data }
    });
  }

  const accounts = await prisma.platformFeeAccount.findMany({
    where: { status: { not: 'DISABLED' } },
    include: { user: { select: { id: true, role: true } } }
  });

  const now = new Date();
  let overdueCount = 0;
  let reminderCount = 0;

  for (const account of accounts) {
    const role = account.user.role === 'provider' ? 'PROVIDER' : 'CUSTOMER';
    const enabled = feeEnabledForRole(config, role);

    if (enabled && isAccountOverdue(account, now)) {
      if (account.status !== 'OVERDUE') {
        await prisma.platformFeeAccount.update({
          where: { id: account.id },
          data: { status: 'OVERDUE' }
        });
        overdueCount += 1;
        const payload = { amount: account.amount, dueAt: account.periodEnd, userId: account.userId, role };
        if (role === 'PROVIDER') {
          await notifyProviderFeeOverdue(io, account.userId, payload);
        } else {
          await notifyCustomerFeeDue(io, account.userId, payload);
        }
      }
      continue;
    }

    if (enabled && account.periodEnd) {
      const dueAt = new Date(account.periodEnd).getTime();
      const periodStartAt = account.periodStart ? new Date(account.periodStart).getTime() : 0;
      const remindedThisPeriod = account.lastReminderAt && new Date(account.lastReminderAt).getTime() >= periodStartAt;
      if (!remindedThisPeriod && now.getTime() >= dueAt - REMINDER_LEAD_MS && now.getTime() < dueAt) {
        await prisma.platformFeeAccount.update({
          where: { id: account.id },
          data: { lastReminderAt: now }
        });
        reminderCount += 1;
        const payload = { amount: account.amount, dueAt: account.periodEnd, userId: account.userId, role };
        if (role === 'PROVIDER') {
          await notifyProviderFeeDue(io, account.userId, payload);
        } else {
          await notifyCustomerFeeDue(io, account.userId, payload);
        }
      }
    }
  }

  return { accountsCreated: usersWithoutAccount.length, overdueCount, reminderCount };
}

/** Admin — list platform-fee accounts with user info and derived state. */
export async function listPlatformFeeAccounts({ status, role, page = 1, limit = 25, client = prisma } = {}) {
  const where = {};
  if (status) where.status = status;
  if (role) where.role = role;

  const [total, accounts] = await Promise.all([
    client.platformFeeAccount.count({ where }),
    client.platformFeeAccount.findMany({
      where,
      orderBy: { periodEnd: 'asc' },
      skip: (Math.max(1, Number(page) || 1) - 1) * Number(limit) || 0,
      take: Number(limit) || 25,
      include: { user: { select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } } }
    })
  ]);

  return {
    accounts: accounts.map((a) => ({
      ...a,
      overdue: isAccountOverdue(a)
    })),
    pagination: { total, page: Number(page) || 1, pages: Math.ceil(total / (Number(limit) || 25)) }
  };
}

/** Payment history for a user's platform fee. */
export async function getFeePaymentHistory(userId, { client = prisma } = {}) {
  return client.platformFeePayment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Notify the user that their platform fee payment succeeded and the billing
 * window advanced.
 */
export async function notifyFeePaid(io, userId, role, transaction, account) {
  const payload = {
    amount: transaction.amount,
    invoiceNumber: transaction.invoiceNumber,
    periodStart: account.periodStart,
    periodEnd: account.periodEnd,
    transactionId: transaction.transactionId
  };
  if (role === 'CUSTOMER') {
    await notifyCustomerFeePaid(io, userId, payload);
  } else {
    await notifyProviderFeePaid(io, userId, payload);
  }
  return payload;
}
