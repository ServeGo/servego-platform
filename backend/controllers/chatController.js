import { askKnowledgeAssistant } from '../services/chatService.js';
import { getKnowledgeCenter } from '../services/knowledgeService.js';
import { sendApiError, sendApiSuccess } from '../utils/response.js';

export const ChatController = {
  /**
   * POST /chat/ask — Knowledge Assistant (V1, information mode).
   *
   * Public by design: the assistant only reads the published Knowledge Center and has no
   * access to any user's data, so there is nothing to protect behind a JWT. The rate
   * limiter on the route is the abuse budget.
   */
  ask: async (req, res) => {
    try {
      const knowledgeCenter = await getKnowledgeCenter();
      const { answer, grounded } = await askKnowledgeAssistant({
        question: req.body?.question,
        knowledgeCenter
      });

      // `grounded` is intentionally NOT returned to the client. It is an internal signal
      // for metrics/eval, not something the UI should branch on.
      return sendApiSuccess(res, 200, { answer });
    } catch (err) {
      // Service errors carry a stable CHAT_* code and a user-safe message.
      if (err.code) {
        return sendApiError(res, err.statusCode || 500, err.code, err.message);
      }
      console.error('[chatController] ask failed:', err);
      return sendApiError(
        res,
        500,
        'INTERNAL_ERROR',
        'Something went wrong while answering your question. Please try again.'
      );
    }
  }
};
