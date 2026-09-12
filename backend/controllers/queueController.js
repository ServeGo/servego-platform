import { sendApiError, sendApiSuccess } from '../utils/response.js';
import { getQueueStats, requeueDeadJobs } from '../services/queue/queueService.js';
import { queueMetrics } from '../services/queue/queueMetrics.js';

export const QueueController = {
  /** Admin — live view of the job queue (pending/processing/dead counts). */
  getStats: async (req, res) => {
    try {
      const stats = await getQueueStats();
      return sendApiSuccess(res, 200, stats);
    } catch (err) {
      console.error('[QueueController.getStats] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch queue stats',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  },

  /** Admin — move every DEAD job back to PENDING for another attempt. */
  requeueDead: async (req, res) => {
    try {
      const count = await requeueDeadJobs();
      return sendApiSuccess(res, 200, { requeued: count });
    } catch (err) {
      console.error('[QueueController.requeueDead] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to requeue dead jobs',
        process.env.NODE_ENV !== 'production' ? err.message : undefined);
    }
  },

  /** Admin — reset the in-memory worker metrics window. */
  resetStats: async (req, res) => {
    queueMetrics.reset();
    return sendApiSuccess(res, 200, { ok: true });
  }
};
