import { test } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';

process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = 'test_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';

const { verifyPaymentSignature, verifyWebhookSignature, isGatewayConfigured, getGatewayConfig } = await import('../services/paymentGatewayService.js');
const { computeCustomerCharge, computeProviderCharge } = await import('../services/platformChargeService.js');

test('platform charge: percentage mode charges customer and provider separately', () => {
  const cfg = { type: 'PERCENTAGE', customerPercent: 5, providerPercent: 10, customerFlat: 0, providerFlat: 0 };
  const customer = computeCustomerCharge(1000, cfg);
  const provider = computeProviderCharge(1000, cfg);
  assert.deepStrictEqual(customer, { type: 'PERCENTAGE', rate: 5, charge: 50, total: 1050 });
  assert.deepStrictEqual(provider, { type: 'PERCENTAGE', rate: 10, charge: 100, payout: 900 });
});

test('platform charge: flat mode charges fixed amounts', () => {
  const cfg = { type: 'FLAT', customerPercent: 0, providerPercent: 0, customerFlat: 25, providerFlat: 40 };
  const customer = computeCustomerCharge(1000, cfg);
  const provider = computeProviderCharge(1000, cfg);
  assert.strictEqual(customer.charge, 25);
  assert.strictEqual(customer.total, 1025);
  assert.strictEqual(provider.charge, 40);
  assert.strictEqual(provider.payout, 960);
});

test('platform charge: zero amount yields zero charges', () => {
  const cfg = { type: 'PERCENTAGE', customerPercent: 5, providerPercent: 10, customerFlat: 0, providerFlat: 0 };
  assert.strictEqual(computeCustomerCharge(0, cfg).charge, 0);
  assert.strictEqual(computeProviderCharge(0, cfg).charge, 0);
  assert.strictEqual(computeProviderCharge(0, cfg).payout, 0);
});

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
