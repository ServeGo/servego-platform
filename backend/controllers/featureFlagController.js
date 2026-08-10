import {
  getAllFeatureFlags,
  getPublicFeatureFlags,
  setFeatureFlag
} from '../services/featureFlagsService.js';
import { getConfig } from '../services/adminConfigService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

export const FeatureFlagController = {
  /** Public flags for unauthenticated clients (announcement banner) + maintenance mode. */
  getPublic: async (req, res) => {
    try {
      const [flags, maintenanceMode] = await Promise.all([
        getPublicFeatureFlags(),
        getConfig('maintenanceMode', false)
      ]);
      const truthy = (v) => v === true || v === 'true' || v === 1 || v === '1';
      return sendApiSuccess(res, 200, {
        maintenanceMode: truthy(maintenanceMode),
        flags
      });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to read feature flags', err.message);
    }
  },

  /** Admin: every registered flag with its current value + audit trail. */
  getAll: async (req, res) => {
    try {
      const flags = await getAllFeatureFlags();
      return sendApiSuccess(res, 200, { flags });
    } catch (err) {
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to read feature flags', err.message);
    }
  },

  /** Admin: set a single flag (type-validated). */
  update: async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      if (value === undefined) {
        return sendApiError(res, 400, 'MISSING_FIELDS', 'value is required.');
      }
      const flag = await setFeatureFlag(key, value, req.user.id);
      return sendApiSuccess(res, 200, flag);
    } catch (err) {
      if (err.code === 'UNKNOWN_FLAG') {
        return sendApiError(res, 404, 'NOT_FOUND', err.message);
      }
      if (err.code === 'INVALID_FLAG_VALUE') {
        return sendApiError(res, 400, 'INVALID_FLAG_VALUE', err.message);
      }
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to update feature flag', err.message);
    }
  }
};
