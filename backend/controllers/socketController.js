import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { socketMetrics } from '../services/socketMetrics.js';

export const SocketController = {
  /** Admin — live realtime traffic: events/sec, connections, messages, DB & Maps calls. */
  getStats: async (req, res) => {
    try {
      const stats = socketMetrics.snapshot();
      return sendApiSuccess(res, 200, stats);
    } catch (err) {
      console.error('[SocketController.getStats] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch socket stats',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  },

  /** Admin/test — reset the in-memory traffic counters. */
  resetStats: async (req, res) => {
    try {
      socketMetrics.reset();
      return sendApiSuccess(res, 200, { reset: true });
    } catch (err) {
      console.error('[SocketController.resetStats] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to reset socket stats',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  }
};