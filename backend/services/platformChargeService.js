import prisma from '../prisma/client.js';
import { getConfig } from './adminConfigService.js';

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

/**
 * Admin-configurable platform charge. A single charge concept applied to ALL
 * users, with SEPARATE rates for customers and providers:
 *   - customer-side charge: added on top of the base amount (customer's bill)
 *   - provider-side charge: deducted from the base amount (platform commission)
 *
 * `type` selects PERCENTAGE (of the base amount) or FLAT (fixed rupees).
 */
export async function getPlatformChargeConfig(client = prisma) {
  const [type, customerPercent, providerPercent, customerFlat, providerFlat, legacyCommission] = await Promise.all([
    getConfig('platformChargeType', 'PERCENTAGE', client),
    getConfig('customerPlatformChargePercent', 5, client),
    getConfig('providerPlatformChargePercent', null, client),
    getConfig('customerPlatformChargeFlat', 0, client),
    getConfig('providerPlatformChargeFlat', 0, client),
    getConfig('commissionPercent', 10, client)
  ]);

  return {
    type: String(type || 'PERCENTAGE').toUpperCase() === 'FLAT' ? 'FLAT' : 'PERCENTAGE',
    customerPercent: Math.max(0, Number(customerPercent) || 0),
    // providerPlatformChargePercent is the canonical key; commissionPercent is
    // kept as a legacy alias so existing deployments keep their rate.
    providerPercent: Math.max(0, Number(providerPercent != null ? providerPercent : legacyCommission) || 0),
    customerFlat: Math.max(0, Number(customerFlat) || 0),
    providerFlat: Math.max(0, Number(providerFlat) || 0)
  };
}

/** Customer-side platform charge for a base amount. */
export function computeCustomerCharge(amount, config) {
  const amt = Math.max(0, Number(amount) || 0);
  const cfg = config || { type: 'PERCENTAGE', customerPercent: 0, customerFlat: 0 };
  const charge = cfg.type === 'FLAT'
    ? Number(cfg.customerFlat) || 0
    : (amt * (Number(cfg.customerPercent) || 0)) / 100;
  const total = amt + charge;
  return {
    type: cfg.type,
    rate: cfg.type === 'FLAT' ? Number(cfg.customerFlat) || 0 : Number(cfg.customerPercent) || 0,
    charge: round2(charge),
    total: round2(total)
  };
}

/** Provider-side platform charge (commission) for a base amount. */
export function computeProviderCharge(amount, config) {
  const amt = Math.max(0, Number(amount) || 0);
  const cfg = config || { type: 'PERCENTAGE', providerPercent: 0, providerFlat: 0 };
  const charge = cfg.type === 'FLAT'
    ? Number(cfg.providerFlat) || 0
    : (amt * (Number(cfg.providerPercent) || 0)) / 100;
  const payout = Math.max(0, amt - charge);
  return {
    type: cfg.type,
    rate: cfg.type === 'FLAT' ? Number(cfg.providerFlat) || 0 : Number(cfg.providerPercent) || 0,
    charge: round2(charge),
    payout: round2(payout)
  };
}
