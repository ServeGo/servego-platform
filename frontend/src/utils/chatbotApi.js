/**
 * Thin client for the ServeGo24 Knowledge Assistant (`POST /chat/ask`).
 *
 * Kept out of DataContext on purpose: the assistant is a public, stateless Q&A call with
 * no cache to coordinate, and the widget manages its own message list.
 *
 * `apiClient` unwraps the `{ success, data }` envelope, so a resolved `res.data` is
 * already the payload.
 */
import { api as apiClient } from './apiClient';

/** Starter prompts shown on an empty conversation. Each one is answerable from the
 *  Knowledge Center, so none of them can come back as "I don't have that information". */
export const SUGGESTED_QUESTIONS = [
  'What is ServeGo24?',
  'How do I book a service?',
  'How do you find a provider for me?',
  'How does payment work?'
];

/**
 * Ask the Knowledge Assistant a question.
 * @returns {Promise<{ok: true, answer: string} | {ok: false, code?: string, error: string}>}
 */
export async function askKnowledgeAssistant(question) {
  const res = await apiClient.post('/chat/ask', { question });

  if (res.ok && typeof res.data?.answer === 'string' && res.data.answer.trim()) {
    return { ok: true, answer: res.data.answer };
  }

  return {
    ok: false,
    code: res.data?.code,
    error:
      res.data?.message ||
      res.data?.error ||
      'The assistant could not answer that right now. Please try again.'
  };
}

export default { askKnowledgeAssistant, SUGGESTED_QUESTIONS };
