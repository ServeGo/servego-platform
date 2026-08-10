import { test } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';

const { verifyPaymentSignature, verifyWebhookSignature, isGatewayConfigured, getGatewayConfig } = await import('../services/paymentGatewayService.js');

test('payment gateway: configured state is exposed', () => {
  assert.strictEqual(isGatewayConfigured(), true);
  const config = getGatewayConfig();
  assert.strictEqual(config.gateway, 'razorpay');
  assert.strictEqual(config.enabled, true);
  assert.strictEqual(config.keyId, 'rzp_test_key');
});

test('payment gateway: verifies a valid checkout signature', () => {
  const orderId = 'order_test_1';
  const paymentId = 'pay_test_1';
  const signature = crypto.createHmac('sha256', 'test_secret').update(`${orderId}|${paymentId}`).digest('hex');
  assert.strictEqual(verifyPaymentSignature({ orderId, paymentId, signature }), true);
});

test('payment gateway: rejects a tampered checkout signature', () => {
  assert.throws(
    () => verifyPaymentSignature({ orderId: 'order_test_1', paymentId: 'pay_test_1', signature: 'deadbeef' }),
    (err) => err.code === 'INVALID_SIGNATURE'
  );
  assert.throws(
    () => verifyPaymentSignature({ orderId: 'order_test_1', paymentId: 'pay_test_1', signature: '' }),
    (err) => err.code === 'INVALID_SIGNATURE'
  );
});

test('payment gateway: verifies a webhook signature against the raw body', () => {
  const raw = Buffer.from('{"event":"payment.captured","payload":{}}');
  const signature = crypto.createHmac('sha256', 'test_webhook_secret').update(raw.toString()).digest('hex');
  assert.strictEqual(verifyWebhookSignature(raw, signature), true);
  assert.throws(
    () => verifyWebhookSignature(raw, 'bad-signature'),
    (err) => err.code === 'INVALID_SIGNATURE'
  );
});
