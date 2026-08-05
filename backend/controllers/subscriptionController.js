import prisma from '../prisma/client.js';
import {
  getCurrentSubscription,
  purchaseSubscription,
  getSubscriptionHistory,
  getAvailablePlans,
  getSubscriptionTransactionById,
  subscriptionIsActive,
  createSubscriptionOrder,
  confirmSubscriptionPayment,
  markSubscriptionPaymentFailed,
  markSubscriptionRefunded
} from '../services/subscriptionService.js';
import { isGatewayConfigured, getGatewayConfig, verifyWebhookSignature } from '../services/paymentGatewayService.js';
import {
  notifySubscriptionPurchased,
  notifyPaymentSuccessful,
  notifyInvoiceGenerated,
  notifyAdminPaymentFailed,
  notifyAdminSubscriptionPurchased
} from '../services/notificationService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

async function resolveProviderId(req) {
  const provider = await prisma.provider.findUnique({
    where: { userId: req.user.id },
    select: { id: true }
  });
  return provider?.id || null;
}

function errorResponse(res, err, fallback) {
  const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
  return sendApiError(res, code === 'INTERNAL_ERROR' ? 500 : 400, code,
    code === 'INTERNAL_ERROR' ? fallback : err.message,
    process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
}

async function notifySuccessfulPayment(io, providerUserId, result) {
  const notifyPayload = {
    subscription: result.subscription,
    transaction: result.transaction,
    upgradedSector: result.upgradedSector,
    discountPercent: result.discountPercent,
    discountAmount: result.discountAmount,
    finalAmount: result.finalAmount
  };

  await notifyPaymentSuccessful(io, providerUserId, { ...notifyPayload, finalAmount: result.finalAmount, transactionId: result.transaction.transactionId });
  await notifyInvoiceGenerated(io, providerUserId, { ...notifyPayload, invoiceNumber: result.transaction.invoiceNumber, finalAmount: result.finalAmount });
  await notifySubscriptionPurchased(io, providerUserId, notifyPayload);
  await notifyAdminSubscriptionPurchased(io, { providerId: result.transaction.providerId, planLevel: result.transaction.levelPurchased, finalAmount: result.finalAmount });
}

export const SubscriptionController = {
  /** Plans the provider can purchase, annotated with their level discount. */
  getPlans: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');
      const plans = await getAvailablePlans(providerId);
      return sendApiSuccess(res, 200, plans);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load subscription plans.');
    }
  },

  /** Current subscription state (level, remaining leads, sector, plan). */
  getCurrent: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');
      const subscription = await getCurrentSubscription(providerId);
      return sendApiSuccess(res, 200, subscription);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load subscription.');
    }
  },

  /** Public gateway info the frontend needs to render the checkout. */
  gatewayConfig: async (_req, res) => {
    return sendApiSuccess(res, 200, getGatewayConfig());
  },

  /**
   * Purchase / upgrade to a subscription level.
   *
   * Online payment (default): creates a Razorpay order and returns the checkout
   * details. The subscription is activated only after `verify` confirms the
   * gateway signature (or the webhook captures the payment).
   *
   * Cash/manual payment: activates immediately (admin offline payment).
   */
  purchase: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');

      const { planLevel, paymentMethod, transactionId } = req.body;
      if (planLevel == null) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'planLevel is required.');
      }

      const method = String(paymentMethod || 'ONLINE').toUpperCase();
      const wantsOnline = !['CASH', 'MANUAL', 'OFFLINE'].includes(method);

      if (wantsOnline) {
        if (!isGatewayConfigured()) {
          return sendApiError(res, 503, 'PAYMENT_GATEWAY_UNAVAILABLE',
            'Online payment is not configured yet. Please select Cash or contact support.');
        }
        const order = await createSubscriptionOrder(providerId, planLevel);
        return sendApiSuccess(res, 201, order);
      }

      const result = await purchaseSubscription(providerId, planLevel, {
        paymentMethod: method,
        paymentGateway: 'cash',
        transactionId: transactionId || null
      });

      const io = req.app.get('socketio');
      await notifySuccessfulPayment(io, req.user.id, result);

      return sendApiSuccess(res, 201, result);
    } catch (err) {
      return errorResponse(res, err, 'Failed to purchase subscription.');
    }
  },

  /**
   * Confirm a completed Razorpay checkout. Verifies the signature and, in one
   * transaction, marks the payment PAID and activates the subscription.
   */
  verify: async (req, res) => {
    try {
      const { transactionId, orderId, paymentId, signature } = req.body;
      const result = await confirmSubscriptionPayment({ transactionId, orderId, paymentId, signature });

      if (!result.alreadyPaid) {
        const io = req.app.get('socketio');
        await notifySuccessfulPayment(io, req.user.id, result);
      }

      return sendApiSuccess(res, 200, result);
    } catch (err) {
      return errorResponse(res, err, 'Failed to confirm payment.');
    }
  },

  /**
   * Razorpay webhook. The body is verified against X-Razorpay-Signature using
   * the raw payload; the client-side verify endpoint is the primary activation
   * path and this endpoint reconciles asynchronous gateway events.
   */
  webhook: async (req, res) => {
    const signature = req.headers['x-razorpay-signature'] || '';
    try {
      verifyWebhookSignature(req.body, signature);
    } catch (err) {
      return sendApiError(res, 400, 'INVALID_SIGNATURE', 'Webhook signature verification failed.');
    }

    let payload = null;
    try {
      payload = JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString() : req.body);
    } catch {
      return sendApiError(res, 400, 'INVALID_PAYLOAD', 'Invalid webhook payload.');
    }

    const event = payload.event;
    const entity = payload.payload?.payment?.entity || payload.payload?.refund?.entity || {};
    const orderId = entity.order_id || entity.orderId || null;
    const paymentId = entity.id || entity.payment_id || null;

    try {
      if (event === 'payment.captured' && orderId) {
        const result = await confirmSubscriptionPayment({ orderId, paymentId, verified: true });
        if (result && !result.alreadyPaid) {
          const provider = await prisma.provider.findUnique({
            where: { id: result.transaction.providerId },
            select: { userId: true }
          });
          if (provider?.userId) {
            const io = req.app.get('socketio');
            await notifySuccessfulPayment(io, provider.userId, result);
          }
        }
      } else if (event === 'payment.failed' && orderId) {
        await markSubscriptionPaymentFailed({ orderId, errorDetail: entity.error_description || 'Payment failed.' });
        const io = req.app.get('socketio');
        await notifyAdminPaymentFailed(io, { orderId, paymentId });
      } else if (event === 'refund.processed' && orderId) {
        await markSubscriptionRefunded({ orderId, refundId: entity.id || null });
      }

      // Always ACK so Razorpay stops retrying; real errors are logged.
      return res.json({ received: true });
    } catch (err) {
      console.error('[SubscriptionController.webhook] Error:', err.message);
      return res.json({ received: true, error: err.message });
    }
  },

  /** Provider's purchase history (invoices). */
  history: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');
      const history = await getSubscriptionHistory(providerId);
      return sendApiSuccess(res, 200, history);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load subscription history.');
    }
  },

  /** A single subscription transaction (provider + admin). */
  getTransaction: async (req, res) => {
    try {
      const transaction = await getSubscriptionTransactionById(req.params.id);
      if (!transaction) return sendApiError(res, 404, 'NOT_FOUND', 'Transaction not found.');
      if (req.user.role === 'provider' && transaction.providerId !== req.user.providerId) {
        const provider = await prisma.provider.findUnique({ where: { userId: req.user.id }, select: { id: true } });
        if (!provider || transaction.providerId !== provider.id) {
          return sendApiError(res, 403, 'FORBIDDEN', 'You can only view your own transactions.');
        }
      }
      return sendApiSuccess(res, 200, transaction);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load transaction.');
    }
  },

  /** Remaining booking leads + computed active state for the provider. */
  remaining: async (req, res) => {
    try {
      const providerId = await resolveProviderId(req);
      if (!providerId) return sendApiError(res, 404, 'NOT_FOUND', 'Provider profile not found.');

      const [subscription, provider, performance] = await Promise.all([
        getCurrentSubscription(providerId),
        prisma.provider.findUnique({
          where: { id: providerId },
          select: { accountStatus: true, isVerified: true, isOnline: true, acceptingBookings: true }
        }),
        prisma.providerPerformance.findUnique({ where: { providerId } })
      ]);

      return sendApiSuccess(res, 200, {
        remainingLeads: subscription?.remainingLeads ?? 0,
        leadCount: subscription?.leadCount ?? 0,
        level: subscription?.level ?? 0,
        status: subscription?.status ?? 'INACTIVE',
        paymentStatus: subscription?.paymentStatus ?? 'PENDING',
        active: subscriptionIsActive(subscription, { provider, performance })
      });
    } catch (err) {
      return errorResponse(res, err, 'Failed to load remaining leads.');
    }
  }
};
