/**
 * Feature flags — a small set of admin-controlled runtime toggles stored in the
 * AdminConfig table (JSONB), read through the 30s-cached getConfig path, so
 * changes apply within ~30s without a redeploy.
 *
 * Flags:
 *   - referralBonusAmount: the referral payout amount, applied to every user.
 *   - newFeatureEnabled / newFeatureAudience / newFeatureText / newFeatureValidUntil:
 *     the "what's new" announcement headline, shown to either customers or
 *     providers (one audience at a time). The headline auto-expires 24 hours
 *     after it is activated (or last edited while active).
 */

import { getConfig, setConfig } from './adminConfigService.js';
import prisma from '../prisma/client.js';

/** Announcement headline lifetime: 24 hours from activation. */
export const ANNOUNCEMENT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * @typedef {{
 *   key: string,
 *   label: string,
 *   description: string,
 *   category: string,
 *   valueType: 'boolean'|'number'|'string',
 *   default: boolean|number|string,
 *   public: boolean,
 *   min?: number,
 *   max?: number,
 *   allowed?: string[]
 * }} FlagDefinition
 */

/** @type {Record<string, FlagDefinition>} */
export const FEATURE_FLAGS = {
  referralBonusAmount: {
    key: 'referralBonusAmount',
    label: 'Referral Bonus Amount (₹)',
    description: 'Bonus credited to a new user when they apply a referral code. Applies to every referral.',
    category: 'Growth',
    valueType: 'number',
    default: 250,
    min: 0,
    max: 10000,
    public: false
  },
  newFeatureEnabled: {
    key: 'newFeatureEnabled',
    label: 'New Feature Announcement',
    description: 'Shows a "what\u2019s new" headline to users. Choose the audience and write the message below.',
    category: 'Marketing',
    valueType: 'boolean',
    default: false,
    public: true
  },
  newFeatureAudience: {
    key: 'newFeatureAudience',
    label: 'Announcement Audience',
    description: 'Who sees the announcement: customers or providers.',
    category: 'Marketing',
    valueType: 'string',
    allowed: ['customer', 'provider'],
    default: 'customer',
    public: true
  },
  newFeatureText: {
    key: 'newFeatureText',
    label: 'Announcement Message',
    description: 'The message shown in the announcement banner.',
    category: 'Marketing',
    valueType: 'string',
    default: '',
    public: true
  },
  newFeatureValidUntil: {
    key: 'newFeatureValidUntil',
    label: 'Announcement Valid Until',
    description: 'Internal: the headline auto-expires 24h after activation/editing. Managed by the service, not shown in the admin UI.',
    category: 'Marketing',
    valueType: 'string',
    default: '',
    public: true
  }
};

/** Read a flag's raw stored value (numbers/strings). */
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

/** Flags safe to expose to unauthenticated clients (announcement banner, etc.). */
export async function getPublicFeatureFlags() {
  const publicKeys = Object.values(FEATURE_FLAGS).filter((f) => f.public).map((f) => f.key);
  const rows = await prisma.adminConfig.findMany({ where: { key: { in: publicKeys } } });
  const valueMap = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const result = {};
  for (const key of publicKeys) {
    const def = FEATURE_FLAGS[key];
    result[key] = valueMap[key] ?? def.default;
  }
  // The announcement headline auto-expires 24h after activation — report it as
  // disabled once the window has passed so clients stop showing the banner.
  const enabled = result.newFeatureEnabled === true;
  const validUntil = new Date(String(result.newFeatureValidUntil || '')).getTime() || 0;
  result.newFeatureEnabled = enabled && validUntil > Date.now();
  return result;
}

/** Coerce and validate an incoming value against a flag's declared type/bounds. */
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
    if (def.min !== undefined && n < def.min) {
      const err = new Error(`Feature flag "${key}" must be at least ${def.min}.`);
      err.code = 'INVALID_FLAG_VALUE';
      throw err;
    }
    if (def.max !== undefined && n > def.max) {
      const err = new Error(`Feature flag "${key}" must be at most ${def.max}.`);
      err.code = 'INVALID_FLAG_VALUE';
      throw err;
    }
    return n;
  }
  const s = String(value);
  if (Array.isArray(def.allowed) && !def.allowed.includes(s)) {
    const err = new Error(`Feature flag "${key}" must be one of: ${def.allowed.join(', ')}.`);
    err.code = 'INVALID_FLAG_VALUE';
    throw err;
  }
  return s;
}

/** Persist a flag value (type-validated) and return the refreshed definition. */
export async function setFeatureFlag(key, value, updatedBy = null) {
  const normalized = validateFeatureFlagValue(key, value);
  const row = await setConfig(key, normalized, updatedBy);
  const def = FEATURE_FLAGS[key];
  const result = {
    ...def,
    value: row.value,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt
  };

  // Announcement headline lifecycle: activating it (or editing the audience or
  // message while it is active) restarts the 24h window; disabling it expires
  // it immediately.
  const active = await getFeatureFlagValue('newFeatureEnabled');
  if (key === 'newFeatureEnabled' || ((key === 'newFeatureAudience' || key === 'newFeatureText') && active)) {
    if (key === 'newFeatureEnabled' ? normalized : active) {
      const validUntil = new Date(Date.now() + ANNOUNCEMENT_TTL_MS).toISOString();
      await setConfig('newFeatureValidUntil', validUntil, updatedBy);
    } else {
      await setConfig('newFeatureValidUntil', '', updatedBy);
    }
  }

  return result;
}
