import {
  getFeeStatus,
  createPlatformFeeOrder,
  confirmPlatformFeePayment,
  markPlatformFeePaymentFailed,
  markPlatformFeePaymentRefunded,
  getFeePaymentHistory,
  listPlatformFeeAccounts,
  notifyFeePaid
} from '../services/platformFeeService.js';
import { verifyWebhookSignature } from '../services/paymentGatewayService.js';
import { notifyAdminPaymentFailed } from '../services/notificationService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

function resolveFeeRole(user) {
  return user.role === 'provider' ? 'PROVIDER' : 'CUSTOMER';
}

function errorResponse(res, err, fallback) {
  const code = err.code && err.code !== 'INTERNAL_ERROR' ? err.code : 'INTERNAL_ERROR';
  return sendApiError(res, code === 'INTERNAL_ERROR' ? 500 : 400, code,
    code === 'INTERNAL_ERROR' ? fallback : err.message,
    process.env.NODE_ENV !== 'production' && code === 'INTERNAL_ERROR' ? err.message : undefined);
}

export const PlatformFeeController = {
  /** Current platform-fee status for the signed-in user (provider or customer). */
  status: async (req, res) => {
    try {
      const status = await getFeeStatus(req.user.id, resolveFeeRole(req.user));
      return sendApiSuccess(res, 200, status);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load platform fee status.');
    }
  },

  /** Payment history for the signed-in user. */
  history: async (req, res) => {
    try {
      const history = await getFeePaymentHistory(req.user.id);
      return sendApiSuccess(res, 200, history);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load platform fee history.');
    }
  },

  /** Phase 1 — create a Razorpay order for the monthly platform fee. */
  order: async (req, res) => {
    try {
      const order = await createPlatformFeeOrder(req.user.id, resolveFeeRole(req.user));
      return sendApiSuccess(res, 201, order);
    } catch (err) {
      return errorResponse(res, err, 'Failed to create platform fee order.');
    }
  },

  /** Phase 2 — verify the completed Razorpay checkout and advance the billing window. */
  verify: async (req, res) => {
    try {
      const { transactionId, orderId, paymentId, signature } = req.body;
      const result = await confirmPlatformFeePayment({ transactionId, orderId, paymentId, signature });

      if (!result.alreadyPaid) {
        const io = req.app.get('socketio');
        await notifyFeePaid(io, req.user.id, resolveFeeRole(req.user), result.transaction, result.account);
      }

      return sendApiSuccess(res, 200, result);
    } catch (err) {
      return errorResponse(res, err, 'Failed to confirm platform fee payment.');
    }
  },

  /**
   * Razorpay webhook for platform-fee payments. The client-side verify endpoint
   * is the primary activation path; this reconciles asynchronous gateway events.
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
        const result = await confirmPlatformFeePayment({ orderId, paymentId, verified: true });
        if (result && !result.alreadyPaid) {
          const io = req.app.get('socketio');
          await notifyFeePaid(io, result.account.userId, result.account.role, result.transaction, result.account);
        }
      } else if (event === 'payment.failed' && orderId) {
        await markPlatformFeePaymentFailed({ orderId, errorDetail: entity.error_description || 'Payment failed.' });
        const io = req.app.get('socketio');
        await notifyAdminPaymentFailed(io, { orderId, paymentId });
      } else if (event === 'refund.processed' && orderId) {
        await markPlatformFeePaymentRefunded({ orderId, refundId: entity.id || null });
      }

      return res.json({ received: true });
    } catch (err) {
      console.error('[PlatformFeeController.webhook] Error:', err.message);
      return res.json({ received: true, error: err.message });
    }
  },

  /** Admin — list all platform-fee accounts with filters and pagination. */
  adminList: async (req, res) => {
    try {
      const { status, role, page, limit } = req.query;
      const result = await listPlatformFeeAccounts({ status, role, page, limit });
      return sendApiSuccess(res, 200, result);
    } catch (err) {
      return errorResponse(res, err, 'Failed to load platform fee accounts.');
    }
  }
};
