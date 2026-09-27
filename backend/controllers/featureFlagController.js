import {
  getAllFeatureFlags,
  getPublicFeatureFlags,
  setFeatureFlag
} from '../services/featureFlagsService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { publicCache } from '../utils/httpCache.js';

export const FeatureFlagController = {
  /** Public flags for unauthenticated clients (announcement banner). */
  getPublic: async (req, res) => {
    try {
      const flags = await getPublicFeatureFlags();
      // Identical for every visitor and already served from a 30s in-memory cache,
      // so let the browser and any CDN in front of the API answer repeat views
      // without an origin round trip. Without this the flag read went out on the wire
      // on every single page load.
      publicCache(res, { maxAge: 30, sMaxAge: 60, staleWhileRevalidate: 600 });
      return sendApiSuccess(res, 200, { flags });
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
