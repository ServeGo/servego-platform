import { listAlerts, reviewAlert, reviewAllAlerts } from '../services/alertService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

export const AlertController = {
  /** GET /alerts — the recipient's unreviewed alerts, newest first. */
  getMine: async (req, res) => {
    try {
      const alerts = await listAlerts(req.user.id);
      return sendApiSuccess(res, 200, { alerts, count: alerts.length });
    } catch (err) {
      console.error('[AlertController.getMine] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to load alerts.');
    }
  },

  /** DELETE /alerts/:id — reviewed by the recipient → removed from the backend. */
  review: async (req, res) => {
    try {
      const result = await reviewAlert({
        userId: req.user.id,
        alertId: req.params.id,
        io: req.app.get('socketio')
      });
      if (!result.reviewed) {
        return sendApiError(res, 404, 'ALERT_NOT_FOUND', 'This alert is no longer available.');
      }
      return sendApiSuccess(res, 200, result);
    } catch (err) {
      console.error('[AlertController.review] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to review the alert.');
    }
  },

  /** DELETE /alerts — review (clear) every alert for the user. */
  reviewAll: async (req, res) => {
    try {
      const result = await reviewAllAlerts({ userId: req.user.id, io: req.app.get('socketio') });
      return sendApiSuccess(res, 200, result);
    } catch (err) {
      console.error('[AlertController.reviewAll] Error:', err);
      return sendApiError(res, 500, 'INTERNAL_ERROR', 'Failed to clear alerts.');
    }
  }
};