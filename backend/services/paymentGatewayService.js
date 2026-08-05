import crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

let razorpayInstance = null;

function getRazorpay() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return null;
  if (!razorpayInstance) {
    // Lazy import so a server without the SDK installed still boots.
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
  }
  return razorpayInstance;
}

/**
 * A payment gateway is "configured" when its credentials are present in the
 * environment. Until then the platform keeps the manual/cash purchase path.
 */
export function isGatewayConfigured() {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

/** Public gateway info the frontend needs to render the checkout. */
export function getGatewayConfig() {
  return {
    enabled: isGatewayConfigured(),
    gateway: 'razorpay',
    keyId: isGatewayConfigured() ? RAZORPAY_KEY_ID : null,
    currency: 'INR',
    name: 'Razorpay'
  };
}

function serviceError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function rupeesToPaise(amountInr) {
  const paise = Math.round((Number(amountInr) || 0) * 100);
  if (!Number.isFinite(paise) || paise <= 0) {
    throw serviceError('INVALID_AMOUNT', 'A valid positive amount is required.');
  }
  return paise;
}

/**
 * Create a Razorpay order for the given amount (INR). The receipt must be
 * short (Razorpay limits it to 40 chars) and idempotent per attempt.
 */
export async function createGatewayOrder({ amountInr, receipt, notes = {}, method }) {
  const rp = getRazorpay();
  if (!rp) throw serviceError('PAYMENT_GATEWAY_UNAVAILABLE', 'No payment gateway is configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');

  try {
    const order = await rp.orders.create({
      amount: rupeesToPaise(amountInr),
      currency: 'INR',
      receipt: String(receipt || '').slice(0, 40),
      notes,
      payment_capture: 1
    });
    return {
      id: order.id,
      amount: Number(order.amount), // paise
      amountInr: Number(order.amount) / 100,
      currency: order.currency,
      status: order.status,
      method
    };
  } catch (err) {
    console.error('[paymentGatewayService] Order creation failed:', err?.error || err.message);
    throw serviceError('PAYMENT_ORDER_FAILED', 'Failed to create the payment order. Please try again later.');
  }
}

/**
 * Verify the signature Razorpay returns after a successful checkout.
 * `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` must all be
 * present; the HMAC-SHA256 of `order_id|payment_id` must match the signature
 * computed with the key secret.
 */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) {
    throw serviceError('INVALID_SIGNATURE', 'Missing payment signature details.');
  }
  if (!RAZORPAY_KEY_SECRET) {
    throw serviceError('PAYMENT_GATEWAY_UNAVAILABLE', 'No payment gateway is configured.');
  }
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  if (expected !== String(signature)) {
    throw serviceError('INVALID_SIGNATURE', 'Payment signature verification failed.');
  }
  return true;
}

/**
 * Verify the webhook signature from Razorpay. The payload must be the raw body
 * string (Buffer) — any JSON re-serialization breaks the signature.
 */
export function verifyWebhookSignature(rawBody, signature) {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    throw serviceError('PAYMENT_GATEWAY_UNAVAILABLE', 'No webhook secret is configured.');
  }
  const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString() : String(rawBody || '');
  const expected = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(bodyString)
    .digest('hex');
  if (expected !== String(signature || '')) {
    throw serviceError('INVALID_SIGNATURE', 'Webhook signature verification failed.');
  }
  return true;
}

/** Fetch a payment from the gateway (used to reconcile uncertain states). */
export async function getGatewayPayment(paymentId) {
  const rp = getRazorpay();
  if (!rp || !paymentId) return null;
  try {
    const payment = await rp.payments.fetch(paymentId);
    return payment;
  } catch (err) {
    console.error('[paymentGatewayService] Payment fetch failed:', err?.error || err.message);
    return null;
  }
}

/** Issue a full refund for a captured payment. */
export async function createGatewayRefund({ paymentId, amountInr, notes = {} }) {
  const rp = getRazorpay();
  if (!rp) throw serviceError('PAYMENT_GATEWAY_UNAVAILABLE', 'No payment gateway is configured.');
  try {
    const refund = await rp.payments.refund(paymentId, {
      amount: rupeesToPaise(amountInr),
      notes
    });
    return refund;
  } catch (err) {
    console.error('[paymentGatewayService] Refund failed:', err?.error || err.message);
    throw serviceError('PAYMENT_REFUND_FAILED', 'Failed to issue the refund. Please retry later.');
  }
}
