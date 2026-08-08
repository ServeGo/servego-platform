import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../prisma/client.js';
import {
  FEATURE_FLAGS,
  isFeatureEnabled,
  getFeatureFlagValue,
  getAllFeatureFlags,
  getPublicFeatureFlags,
  validateFeatureFlagValue,
  setFeatureFlag
} from '../services/featureFlagsService.js';
import { setConfig } from '../services/adminConfigService.js';
import { maintenanceMode } from '../middleware/maintenance.js';
import { ReferralsController } from '../controllers/referralsController.js';

const dbReady = await (async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
})();

const dbTest = dbReady ? test : test.skip;

const purge = async () => {
  if (!dbReady) return;
  await prisma.adminConfig.deleteMany({
    where: { key: { in: ['premiumCategoriesEnabled', 'discountEnabled', 'referralEnabled', 'maintenanceMode', 'newFeatureEnabled', 'referralBonusAmount', 'featureFlags-test-flag'] } }
  });
};
test.before(purge);
test.after(purge);

test('registry exposes the five admin feature flags', () => {
  for (const key of ['premiumCategoriesEnabled', 'discountEnabled', 'referralEnabled', 'maintenanceMode', 'newFeatureEnabled']) {
    assert.ok(FEATURE_FLAGS[key], `missing flag ${key}`);
    assert.equal(FEATURE_FLAGS[key].valueType, 'boolean');
  }
  assert.equal(FEATURE_FLAGS.maintenanceMode.public, true);
  assert.equal(FEATURE_FLAGS.newFeatureEnabled.public, true);
});

test('validateFeatureFlagValue coerces booleans and rejects bad numbers', () => {
  assert.equal(validateFeatureFlagValue('maintenanceMode', 'true'), true);
  assert.equal(validateFeatureFlagValue('maintenanceMode', 0), false);
  assert.equal(validateFeatureFlagValue('maintenanceMode', true), true);
  assert.throws(() => validateFeatureFlagValue('nope', true), /Unknown feature flag/);
});

dbTest('setFeatureFlag persists and isFeatureEnabled reads it back', async () => {
  await setFeatureFlag('premiumCategoriesEnabled', false, 'test-admin');
  assert.equal(await isFeatureEnabled('premiumCategoriesEnabled'), false);
  await setFeatureFlag('premiumCategoriesEnabled', true, 'test-admin');
  assert.equal(await isFeatureEnabled('premiumCategoriesEnabled'), true);
});

dbTest('non-boolean flag values validate against their declared type', async () => {
  await setFeatureFlag('referralBonusAmount', 500, 'test-admin');
  assert.equal(await getFeatureFlagValue('referralBonusAmount'), 500);
  await assert.rejects(() => setFeatureFlag('referralBonusAmount', 'abc'), /expects a number/);
});

dbTest('getPublicFeatureFlags only returns public flags', async () => {
  const flags = await getPublicFeatureFlags();
  assert.ok(flags.maintenanceMode === false);
  assert.ok(flags.newFeatureEnabled === false);
  assert.equal('referralEnabled' in flags, false);
});

dbTest('getAllFeatureFlags merges stored values with defaults and audit trail', async () => {
  await setConfig('referralBonusAmount', 300, 'test-admin');
  const flags = await getAllFeatureFlags();
  const referralBonus = flags.find((f) => f.key === 'referralBonusAmount');
  assert.equal(referralBonus.value, 300);
  assert.equal(referralBonus.updatedBy, 'test-admin');
});

dbTest('maintenance middleware 503s public paths but lets admin/login through', async () => {
  await setConfig('maintenanceMode', true, 'test-admin');
  let status = null;
  const res = { status(code) { status = code; return this; }, json() { return this; } };
  const next = () => { status = 'NEXT'; };
  await maintenanceMode({ path: '/services' }, res, next);
  assert.equal(status, 503);

  await maintenanceMode({ path: '/admin/dashboard' }, res, next);
  assert.equal(status, 'NEXT');

  await maintenanceMode({ path: '/auth/login' }, res, next);
  assert.equal(status, 'NEXT');

  await setConfig('maintenanceMode', false, 'test-admin');
  await maintenanceMode({ path: '/services' }, res, next);
  assert.equal(status, 'NEXT');
});

dbTest('referral controller 403s when the referral flag is off', async () => {
  let status = null;
  let body = null;
  const res = { status(code) { status = code; return this; }, json(payload) { body = payload; return this; } };
  await setConfig('referralEnabled', false, 'test-admin');
  await ReferralsController.applyReferral({ body: { code: 'X' }, user: { id: 'nobody' } }, res);
  assert.equal(status, 403);
  assert.equal(body.code, 'REFERRALS_DISABLED');
  await setConfig('referralEnabled', true, 'test-admin');
});
