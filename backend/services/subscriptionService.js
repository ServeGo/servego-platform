import prisma from '../prisma/client.js';
import { ensureProviderSubscription } from '../seeders/businessModelSeed.js';
import { getLevelDiscount } from './providerLevelService.js';
import { createTtlCache } from '../utils/ttlCache.js';
import {
  createGatewayOrder,
  verifyPaymentSignature,
  isGatewayConfigured,
  getGatewayConfig
} from './paymentGatewayService.js';

// Subscription plans are admin-configured and rarely change, but are read on
// every plans screen. Cache briefly; invalidate on admin plan writes.
const PLANS_CACHE_TTL_MS = 60 * 1000;
const plansCache = createTtlCache(PLANS_CACHE_TTL_MS);

export function invalidatePlansCache() {
  plansCache.invalidate('active');
  plansCache.invalidate('all');
}

async function getActivePlans(client) {
  if (client === prisma) {
    const cached = plansCache.get('active');
    if (cached !== undefined) return cached;
  }
  const plans = await client.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { level: 'asc' }
  });
  if (client === prisma) plansCache.set('active', plans);
  return plans;
}

export async function getAllPlans(client = prisma) {
  if (client === prisma) {
    const cached = plansCache.get('all');
    if (cached !== undefined) return cached;
  }
  const plans = await client.subscriptionPlan.findMany({ orderBy: { level: 'asc' } });
  if (client === prisma) plansCache.set('all', plans);
  return plans;
}

/** Run `fn` inside a transaction unless the caller already provided a transaction client. */
function withClientTransaction(client, fn) {
  if (client === prisma) {
    return prisma.$transaction(fn, { isolationLevel: 'Serializable', maxWait: 20000, timeout: 30000 });
  }
  return fn(client);
}

function generateInvoiceNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `INV-${stamp}-${Math.floor(100000 + Math.random() * 900000)}`;
}

function serviceError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

async function loadPurchasablePlan(client, planLevel) {
  const plan = await client.subscriptionPlan.findUnique({ where: { level: Number(planLevel) } });
  if (!plan) {
    const err = new Error('Subscription plan not found.');
    err.code = 'PLAN_NOT_FOUND';
    throw err;
  }
  if (!plan.active) {
    const err = new Error('This subscription plan is not available.');
    err.code = 'PLAN_INACTIVE';
    throw err;
  }
  if (plan.isFree) {
    const err = new Error('The free lead is granted automatically and cannot be purchased.');
    err.code = 'FREE_PLAN_NOT_PURCHASABLE';
    throw err;
  }
  return plan;
}

async function computePricing(client, provider, plan) {
  const price = Number(plan.price) || 0;
  const discountPercent = await getLevelDiscount(provider.providerLevel, client);
  const discountAmount = Number(((price * discountPercent) / 100).toFixed(2));
  const finalAmount = Number((price - discountAmount).toFixed(2));
  return { price, discountPercent, discountAmount, finalAmount };
}

/**
 * Activate the provider's subscription from a successful purchase. Credits the
 * leads, mirrors the payment snapshot, upgrades a General → Premium sector on
 * first purchase and returns the updated row. Runs inside the caller's client.
 */
async function activateSubscriptionInTx(tx, { provider, providerId, plan, transaction, price, discountPercent, discountAmount, finalAmount, purchasedAt, invoiceNumber }) {
  const subscription = await ensureProviderSubscription(providerId, tx);

  const updated = await tx.providerSubscription.update({
    where: { id: subscription.id },
    data: {
      level: plan.level,
      status: 'ACTIVE',
      remainingLeads: plan.leadCount,
      leadCount: plan.leadCount,
      completedJobsCurrentSubscription: 0,
      sector: plan.sector,
      planId: plan.id,
      freeLeadUsed: true,
      price,
      discountAmount,
      finalAmount,
      paymentStatus: 'PAID',
      paymentMethod: transaction.paymentMethod || null,
      paymentGateway: transaction.paymentGateway || null,
      transactionId: transaction.transactionId || null,
      invoiceNumber,
      lastPurchaseAt: purchasedAt,
      activatedAt: purchasedAt
    },
    include: { plan: true }
  });

  // First purchase moves the provider from General to Premium. Providers keep
  // their Premium sector even after the subscription lapses (rule 17).
  const upgradedSector = provider.sector === 'GENERAL' && plan.sector === 'PREMIUM';
  if (upgradedSector) {
    await tx.provider.update({ where: { id: providerId }, data: { sector: 'PREMIUM' } });
  }

  return { subscription: updated, upgradedSector };
}

/**
 * Phase 1 of an online subscription purchase. Validates the plan, computes the
 * discounted price and creates a Razorpay order. A PENDING
 * SubscriptionTransaction is written immediately so the payment attempt is
 * audited; it is promoted to PAID (and the subscription activated) only after
 * `confirmSubscriptionPayment` verifies the gateway signature.
 *
 * Returns everything the frontend needs to open the Razorpay checkout.
 */
export async function createSubscriptionOrder(providerId, planLevel, { client = prisma } = {}) {
  const plan = await loadPurchasablePlan(client, planLevel);

  const provider = await client.provider.findUnique({
    where: { id: providerId },
    select: { id: true, providerLevel: true, sector: true, userId: true }
  });
  if (!provider) throw serviceError('PROVIDER_NOT_FOUND', 'Provider not found.');

  const { price, discountPercent, discountAmount, finalAmount } = await computePricing(client, provider, plan);

  // Abandoned checkouts leave PENDING transactions behind. Close any previous
  // pending order for this provider so only one active order exists at a time.
  // If an old checkout is later captured, its signature still confirms it.
  await client.subscriptionTransaction.updateMany({
    where: { providerId, paymentStatus: 'PENDING' },
    data: { paymentStatus: 'FAILED', errorDetail: 'Superseded by a new payment order.' }
  });

  const transaction = await client.subscriptionTransaction.create({
    data: {
      providerId,
      planId: plan.id,
      levelPurchased: plan.level,
      planName: plan.name,
      price,
      discountPercent,
      discountAmount,
      finalAmount,
      leadCount: plan.leadCount,
      paymentStatus: 'PENDING',
      paymentGateway: 'razorpay',
      purchasedAt: new Date()
    }
  });

  let order;
  try {
    order = await createGatewayOrder({
      amountInr: finalAmount,
      receipt: `SUB-${transaction.id.slice(-14)}`,
      notes: { providerId, planLevel: String(plan.level), planName: plan.name }
    });
  } catch (err) {
    await client.subscriptionTransaction.update({
      where: { id: transaction.id },
      data: { paymentStatus: 'FAILED', errorDetail: err.message || 'Order creation failed.' }
    });
    throw err;
  }

  await client.subscriptionTransaction.update({
    where: { id: transaction.id },
    data: { gatewayOrderId: order.id }
  });

  return {
    orderId: order.id,
    amountInr: finalAmount,
    amountPaise: order.amount,
    currency: order.currency,
    transactionId: transaction.id,
    planLevel: plan.level,
    gateway: 'razorpay',
    gatewayConfigured: isGatewayConfigured(),
    keyId: getGatewayConfig().keyId
  };
}

/**
 * Phase 2 of an online subscription purchase. Verifies the gateway signature
 * for the payment the customer completed in the Razorpay checkout, then — in a
 * Serializable transaction — promotes the PENDING transaction to PAID and
 * activates the subscription (credits leads, mirrors the snapshot, sector
 * upgrade). Returns the same shape as `purchaseSubscription`.
 */
export async function confirmSubscriptionPayment({
  transactionId = null,
  orderId = null,
  paymentId,
  signature,
  paymentGateway = 'razorpay',
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
    ? await client.subscriptionTransaction.findUnique({ where: { id: transactionId } })
    : orderId
      ? await client.subscriptionTransaction.findFirst({ where: { gatewayOrderId: orderId } })
      : null;
  if (!existing) throw serviceError('TRANSACTION_NOT_FOUND', 'No pending payment order was found.');

  const gatewayOrderId = existing.gatewayOrderId || orderId;
  if (!gatewayOrderId) throw serviceError('TRANSACTION_NOT_FOUND', 'No gateway order is associated with this transaction.');
  if (!verified) verifyPaymentSignature({ orderId: gatewayOrderId, paymentId, signature });

  // Idempotent — a replayed confirmation must not double-activate.
  if (existing.paymentStatus === 'PAID') {
    const transaction = await client.subscriptionTransaction.findUnique({
      where: { id: existing.id }
    });
    const subscription = await ensureProviderSubscription(existing.providerId, client);
    return {
      transaction,
      subscription: await client.providerSubscription.findUnique({ where: { id: subscription.id }, include: { plan: true } }),
      upgradedSector: false,
      discountPercent: existing.discountPercent,
      discountAmount: existing.discountAmount,
      finalAmount: existing.finalAmount,
      alreadyPaid: true
    };
  }

  return withClientTransaction(client, async (tx) => {
    const transaction = await tx.subscriptionTransaction.findUnique({ where: { id: existing.id } });
    const provider = await tx.provider.findUnique({
      where: { id: existing.providerId },
      select: { id: true, providerLevel: true, sector: true, userId: true }
    });
    if (!provider) throw serviceError('PROVIDER_NOT_FOUND', 'Provider not found.');

    const plan = await loadPurchasablePlan(tx, transaction.levelPurchased);
    const invoiceNumber = generateInvoiceNumber();
    const purchasedAt = new Date();

    const paid = await tx.subscriptionTransaction.update({
      where: { id: existing.id },
      data: {
        paymentStatus: 'PAID',
        paymentMethod: 'ONLINE',
        paymentGateway: paymentGateway || 'razorpay',
        transactionId: paymentId,
        gatewayPaymentId: paymentId,
        invoiceNumber,
        errorDetail: null,
        purchasedAt
      }
    });

    const { subscription, upgradedSector } = await activateSubscriptionInTx(tx, {
      provider,
      providerId: existing.providerId,
      plan,
      transaction: paid,
      price: paid.price,
      discountPercent: paid.discountPercent,
      discountAmount: paid.discountAmount,
      finalAmount: paid.finalAmount,
      purchasedAt,
      invoiceNumber
    });

    return {
      transaction: paid,
      subscription,
      upgradedSector,
      discountPercent: paid.discountPercent,
      discountAmount: paid.discountAmount,
      finalAmount: paid.finalAmount
    };
  });
}

/**
 * Mark a pending gateway transaction as FAILED (webhook `payment.failed` or an
 * abandoned checkout). Never touches an already-PAID transaction.
 */
export async function markSubscriptionPaymentFailed({ transactionId = null, orderId = null, errorDetail = 'Payment failed or was abandoned.', client = prisma } = {}) {
  const existing = transactionId
    ? await client.subscriptionTransaction.findUnique({ where: { id: transactionId } })
    : orderId
      ? await client.subscriptionTransaction.findFirst({ where: { gatewayOrderId: orderId } })
      : null;
  if (!existing || existing.paymentStatus === 'PAID') return null;

  return client.subscriptionTransaction.update({
    where: { id: existing.id },
    data: { paymentStatus: 'FAILED', errorDetail: String(errorDetail || '').slice(0, 500) }
  });
}

/** Mark a transaction REFUNDED (webhook `refund.processed`). */
export async function markSubscriptionRefunded({ transactionId = null, orderId = null, refundId = null, client = prisma } = {}) {
  const existing = transactionId
    ? await client.subscriptionTransaction.findUnique({ where: { id: transactionId } })
    : orderId
      ? await client.subscriptionTransaction.findFirst({ where: { gatewayOrderId: orderId } })
      : null;
  if (!existing || existing.paymentStatus === 'REFUNDED') return null;

  return client.subscriptionTransaction.update({
    where: { id: existing.id },
    data: {
      paymentStatus: 'REFUNDED',
      errorDetail: refundId ? `Refund processed (${refundId}).` : 'Refund processed.'
    }
  });
}

/**
 * Effective "Subscription Active" state used for lead eligibility (rule 3).
 *
 * A subscription is Active ONLY when ALL of the following hold:
 *   1. Provider Approved (account ACTIVE and verified)
 *   2. Provider Available (online and accepting bookings)
 *   3. Remaining Leads > 0
 *   4. Last Subscription Payment Successful (PAID)
 *   5. Provider not under Cooldown
 *
 * `context` is `{ provider, performance }`. Fields that are not provided are
 * skipped so partial callers stay lenient; the lead-matching path always
 * supplies the full context.
 */
export function subscriptionIsActive(subscription, context = {}) {
  if (!subscription) return false;
  const { provider = {}, performance = null } = context;
  const cooldownUntil = performance?.cooldownUntil ? new Date(performance.cooldownUntil) : null;
  return Boolean(
    subscription.status !== 'FAILED' &&
      subscription.status !== 'CANCELLED' &&
      subscription.paymentStatus === 'PAID' &&
      Number(subscription.remainingLeads) > 0 &&
      (provider.accountStatus == null || provider.accountStatus === 'ACTIVE') &&
      (provider.isVerified == null || provider.isVerified === true) &&
      (provider.isOnline == null || provider.isOnline !== false) &&
      (provider.acceptingBookings == null || provider.acceptingBookings !== false) &&
      (!cooldownUntil || cooldownUntil <= new Date())
  );
}

export async function getCurrentSubscription(providerId, client = prisma) {
  await ensureProviderSubscription(providerId, client);
  return client.providerSubscription.findUnique({
    where: { providerId },
    include: { plan: true }
  });
}

/**
 * Purchase (or upgrade to) the given subscription level.
 *
 * Payment flow (rule 9): select next subscription level → apply provider-level
 * discount → generate order → payment success → create transaction → generate
 * invoice → activate subscription → credit leads → subscription active → notify.
 *
 * The subscription row mirrors the transaction so it always carries the full
 * object: level, lead count, remaining leads, purchase date, price, discount,
 * final amount, payment status/method/gateway, transaction id, invoice number
 * and lifecycle status (ACTIVE/INACTIVE/FAILED/CANCELLED).
 *
 * Discounts never apply to the free lead. Provider Level and Subscription
 * Level stay fully independent — purchasing never resets the provider level.
 */
export async function purchaseSubscription(providerId, planLevel, { paymentMethod = 'ONLINE', paymentGateway = null, transactionId = null, client = prisma } = {}) {
  const plan = await loadPurchasablePlan(client, planLevel);

  const provider = await client.provider.findUnique({
    where: { id: providerId },
    select: { id: true, providerLevel: true, sector: true, userId: true }
  });
  if (!provider) {
    const err = new Error('Provider not found.');
    err.code = 'PROVIDER_NOT_FOUND';
    throw err;
  }

  const { price, discountPercent, discountAmount, finalAmount } = await computePricing(client, provider, plan);
  const purchasedAt = new Date();
  const invoiceNumber = generateInvoiceNumber();

  return withClientTransaction(client, async (tx) => {
    const subscription = await ensureProviderSubscription(providerId, tx);

    const transaction = await tx.subscriptionTransaction.create({
      data: {
        providerId,
        subscriptionId: subscription.id,
        planId: plan.id,
        levelPurchased: plan.level,
        planName: plan.name,
        price,
        discountPercent,
        discountAmount,
        finalAmount,
        leadCount: plan.leadCount,
        paymentStatus: 'PAID',
        paymentMethod: paymentMethod || null,
        paymentGateway: paymentGateway || null,
        transactionId: transactionId || null,
        invoiceNumber,
        purchasedAt
      }
    });

    const { subscription: updated, upgradedSector } = await activateSubscriptionInTx(tx, {
      provider,
      providerId,
      plan,
      transaction,
      price,
      discountPercent,
      discountAmount,
      finalAmount,
      purchasedAt,
      invoiceNumber
    });

    return {
      transaction,
      subscription: updated,
      upgradedSector,
      discountPercent,
      discountAmount,
      finalAmount
    };
  });
}

/**
 * Consume ONE lead after a booking is COMPLETED (rule 4). Reduces remaining
 * leads and raises completed-jobs-in-current-subscription. Marks the
 * subscription INACTIVE the moment remaining leads reach zero.
 *
 * Returns a summary the caller uses for notifications:
 *   { remainingLeads, justExpired, lowLeads }
 */
export async function consumeLeadOnCompletion(providerId, client = prisma) {
  return withClientTransaction(client, async (tx) => {
    const subscription = await ensureProviderSubscription(providerId, tx);
    const nextRemaining = Math.max(0, Number(subscription.remainingLeads) - 1);
    const nextCompleted = Number(subscription.completedJobsCurrentSubscription) + 1;
    const justExpired = nextRemaining === 0 && subscription.status !== 'INACTIVE';

    const updated = await tx.providerSubscription.update({
      where: { id: subscription.id },
      data: {
        remainingLeads: nextRemaining,
        completedJobsCurrentSubscription: nextCompleted,
        status: nextRemaining > 0 ? 'ACTIVE' : 'INACTIVE'
      }
    });

    return {
      subscription: updated,
      remainingLeads: nextRemaining,
      justExpired,
      lowLeads: nextRemaining > 0 && nextRemaining <= 1
    };
  });
}

export async function getSubscriptionHistory(providerId, client = prisma) {
  return client.subscriptionTransaction.findMany({
    where: { providerId },
    orderBy: { purchasedAt: 'desc' }
  });
}

/** Plans available to the provider, annotated with the discount they would get. */
export async function getAvailablePlans(providerId, client = prisma) {
  const [plans, provider] = await Promise.all([
    getActivePlans(client),
    client.provider.findUnique({
      where: { id: providerId },
      select: { providerLevel: true }
    })
  ]);

  const discountPercent = await getLevelDiscount(provider?.providerLevel ?? 'BRONZE', client);

  return plans.map((plan) => {
    const price = Number(plan.price) || 0;
    const discountAmount = plan.isFree ? 0 : Number(((price * discountPercent) / 100).toFixed(2));
    return {
      ...plan,
      discountPercent: plan.isFree ? 0 : discountPercent,
      discountAmount,
      finalPrice: Number((price - discountAmount).toFixed(2))
    };
  });
}

export async function getSubscriptionTransactionById(id, client = prisma) {
  return client.subscriptionTransaction.findUnique({
    where: { id },
    include: { provider: { include: { user: { select: { id: true, name: true, email: true } } } }, plan: true }
  });
}
