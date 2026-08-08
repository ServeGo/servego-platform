/**
 * Feature flags — admin-controlled runtime toggles stored in the AdminConfig
 * table (JSONB) and read through the 30s-cached getConfig path, so flags take
 * effect without a redeploy. Every flag is registered here (single source of
 * truth for the admin UI), type-validated on write, and consumed by feature
 * gates spread across the services.
 *
 * Maintenance mode is the only flag with global scope (a middleware in
 * server.js); the rest gate specific subsystems (premium category matching,
 * subscription discounts, the referral program, and the newest release).
 */

import { getConfig, setConfig } from './adminConfigService.js';
import prisma from '../prisma/client.js';

/**
 * @typedef {{
 *   key: string,
 *   label: string,
 *   description: string,
 *   valueType: 'boolean'|'number'|'string',
 *   default: boolean|number|string,
 *   public: boolean
 * }} FlagDefinition
 */

/** @type {Record<string, FlagDefinition>} */
export const FEATURE_FLAGS = {
  premiumCategoriesEnabled: {
    key: 'premiumCategoriesEnabled',
    label: 'Premium Categories',
    description: 'When on, categories listed in "premiumCategories" are served only by Premium-sector providers.',
    valueType: 'boolean',
    default: true,
    public: false
  },
  discountEnabled: {
    key: 'discountEnabled',
    label: 'Discounts & Level Pricing',
    description: 'When off, provider level discounts are not applied to subscription purchases (full price).',
    valueType: 'boolean',
    default: true,
    public: false
  },
  referralEnabled: {
    key: 'referralEnabled',
    label: 'Referral Program',
    description: 'When off, applying referral codes is blocked and no referral bonus is awarded.',
    valueType: 'boolean',
    default: true,
    public: false
  },
  referralBonusAmount: {
    key: 'referralBonusAmount',
    label: 'Referral Bonus Amount (₹)',
    description: 'Referral bonus credited to the applicant when a referral code is applied.',
    valueType: 'number',
    default: 250,
    public: false
  },
  maintenanceMode: {
    key: 'maintenanceMode',
    label: 'Maintenance Mode',
    description: 'When on, the public API returns 503 (except admin routes, login and feature flags) so the site can be taken down safely without a deploy.',
    valueType: 'boolean',
    default: false,
    public: true
  },
  newFeatureEnabled: {
    key: 'newFeatureEnabled',
    label: 'New Feature Announcement',
    description: 'When on, the newest release is announced to users (banner on the dashboard).',
    valueType: 'boolean',
    default: false,
    public: true
  }
};

/**
 * Read a feature flag, honoring its registered default when the config key has
 * never been set. Callers inside a transaction pass `client` (the tx).
 */
export async function isFeatureEnabled(key, fallback = true, client = prisma) {
  const def = FEATURE_FLAGS[key];
  const fb = def ? def.default : fallback;
  const value = await getConfig(key, fb, client);
  return value !== false && value !== 'false' && value !== 0 && value !== '0';
}

/** Read a flag's raw stored value (for number/string flags like bonus amounts). */
export async function getFeatureFlagValue(key, client = prisma) {
  const def = FEATURE_FLAGS[key];
  return getConfig(key, def ? def.default : null, client);
}

/** All flag definitions with their current stored values. */
export async function getAllFeatureFlags() {
  const rows = await prisma.adminConfig.findMany({ where: { key: { in: Object.keys(FEATURE_FLAGS) } } });
  const valueMap = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const updatedMap = Object.fromEntries(rows.map((r) => [r.key, { updatedBy: r.updatedBy, updatedAt: r.updatedAt }]));
  return Object.values(FEATURE_FLAGS).map((def) => ({
    ...def,
    value: valueMap[def.key] ?? def.default,
    updatedBy: updatedMap[def.key]?.updatedBy ?? null,
    updatedAt: updatedMap[def.key]?.updatedAt ?? null
  }));
}

/** Flags safe to expose to unauthenticated clients (maintenance banner, etc.). */
export async function getPublicFeatureFlags() {
  const publicKeys = Object.values(FEATURE_FLAGS).filter((f) => f.public).map((f) => f.key);
  const rows = await prisma.adminConfig.findMany({ where: { key: { in: publicKeys } } });
  const valueMap = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const result = {};
  for (const key of publicKeys) {
    const def = FEATURE_FLAGS[key];
    result[key] = valueMap[key] ?? def.default;
  }
  return result;
}

/** Coerce and validate an incoming value against a flag's declared type. */
export function validateFeatureFlagValue(key, value) {
  const def = FEATURE_FLAGS[key];
  if (!def) {
    const err = new Error(`Unknown feature flag "${key}".`);
    err.code = 'UNKNOWN_FLAG';
    throw err;
  }
  if (def.valueType === 'boolean') {
    return value === true || value === 'true' || value === 1 || value === '1';
  }
  if (def.valueType === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      const err = new Error(`Feature flag "${key}" expects a number.`);
      err.code = 'INVALID_FLAG_VALUE';
      throw err;
    }
    return n;
  }
  return String(value);
}

/**
 * Persist a feature flag value (type-validated) and return the refreshed
 * definition. Writes go through setConfig, so the 30s cache is warmed
 * immediately.
 */
export async function setFeatureFlag(key, value, updatedBy = null) {
  const normalized = validateFeatureFlagValue(key, value);
  const row = await setConfig(key, normalized, updatedBy);
  const def = FEATURE_FLAGS[key];
  return {
    ...def,
    value: row.value,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt
  };
}
