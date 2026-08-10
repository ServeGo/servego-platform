import test from 'node:test';
import assert from 'node:assert/strict';
import { ANNOUNCEMENT_TTL_MS, FEATURE_FLAGS, validateFeatureFlagValue } from '../services/featureFlagsService.js';

test('feature flag registry contains exactly the intended flags', () => {
  assert.deepEqual(Object.keys(FEATURE_FLAGS).sort(), [
    'newFeatureAudience',
    'newFeatureEnabled',
    'newFeatureText',
    'newFeatureValidUntil',
    'referralBonusAmount'
  ]);
});

test('announcement headline expires 24 hours after activation', () => {
  assert.equal(ANNOUNCEMENT_TTL_MS, 24 * 60 * 60 * 1000);
  assert.equal(ANNOUNCEMENT_TTL_MS, 86400000);
});

test('every flag has a declared value type and default', () => {
  for (const [key, def] of Object.entries(FEATURE_FLAGS)) {
    assert.ok(['boolean', 'number', 'string'].includes(def.valueType), `${key} valueType`);
    assert.ok(def.default !== undefined, `${key} default`);
  }
});

test('number flags coerce and validate their bounds', () => {
  assert.equal(validateFeatureFlagValue('referralBonusAmount', '500'), 500);
  assert.equal(validateFeatureFlagValue('referralBonusAmount', 0), 0);
  assert.throws(() => validateFeatureFlagValue('referralBonusAmount', -5), /at least/);
  assert.throws(() => validateFeatureFlagValue('referralBonusAmount', 999999), /at most/);
  assert.throws(() => validateFeatureFlagValue('referralBonusAmount', 'abc'), /expects a number/);
});

test('boolean flags coerce truthy/falsy inputs', () => {
  assert.equal(validateFeatureFlagValue('newFeatureEnabled', true), true);
  assert.equal(validateFeatureFlagValue('newFeatureEnabled', 'true'), true);
  assert.equal(validateFeatureFlagValue('newFeatureEnabled', 1), true);
  assert.equal(validateFeatureFlagValue('newFeatureEnabled', false), false);
  assert.equal(validateFeatureFlagValue('newFeatureEnabled', '0'), false);
});

test('string flags validate against their allowed values', () => {
  assert.equal(validateFeatureFlagValue('newFeatureAudience', 'customer'), 'customer');
  assert.equal(validateFeatureFlagValue('newFeatureAudience', 'provider'), 'provider');
  assert.throws(() => validateFeatureFlagValue('newFeatureAudience', 'everyone'), /one of/);
  assert.equal(validateFeatureFlagValue('newFeatureText', 'New: chat with your pro'), 'New: chat with your pro');
});

test('unknown flags are rejected', () => {
  assert.throws(() => validateFeatureFlagValue('customerAnnouncementEnabled', true), /Unknown feature flag/);
});
