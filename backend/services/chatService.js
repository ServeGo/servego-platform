/**
 * ServeGo24 Knowledge Assistant (V1 — Information Mode).
 *
 * The model is a renderer, not a source of truth. Every answer must be derivable from the
 * Knowledge Center assembled by `knowledgeService`; anything it cannot find there comes
 * back as the `NOT_IN_KNOWLEDGE_CENTER` sentinel and is converted into an honest "I don't
 * have that information" reply by the caller.
 *
 * Deliberately NOT implemented in V1: function calling / tool use. The assistant cannot
 * create bookings, read wallets or look up a live booking, so it can never imply that it
 * did. Tool declarations are added in a later version, alongside the same grounding rules.
 */

// A rolling `-latest` alias, not a pinned version: the numbered 2.5 ids are no longer
// served on v1beta, and an alias keeps working when Google rotates the version out.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

/** Fail fast so a slow model never eats the global 60s request timeout. */
const MODEL_TIMEOUT_MS = parseInt(process.env.CHAT_MODEL_TIMEOUT_MS || '15000', 10);

/** The exact string the model must return when the Knowledge Center cannot answer. */
export const NOT_IN_KNOWLEDGE_CENTER = 'NOT_IN_KNOWLEDGE_CENTER';

/** What the customer actually reads when the answer is not in the Knowledge Center. */
export const NO_KNOWLEDGE_ANSWER =
  "That isn't in my knowledge base, so I don't want to guess.\n\n" +
  '- Raise a support ticket from your dashboard and the ServeGo24 team will help you directly.';

const SYSTEM_INSTRUCTION = `You are the ServeGo24 Knowledge Assistant. You answer questions about the ServeGo24 home services platform for customers and providers.

ABSOLUTE RULES — violating any of these is a failure:
1. Answer ONLY from the SERVEGO24 KNOWLEDGE CENTER provided in the user message. It is the only source of truth you have.
2. Never use your own training knowledge, general assumptions, or common sense about similar apps. If it is not in the Knowledge Center, it is not true for ServeGo24.
3. If the Knowledge Center does not contain the answer — even partially, even if you are confident it "must" be true — reply with exactly this and nothing else: ${NOT_IN_KNOWLEDGE_CENTER}
4. Never invent or estimate specific values: prices, fees, commission percentages, operating hours, phone numbers, email addresses, URLs, timings, limits, or policies. If a number is not in the Knowledge Center, you do not know it.
5. You cannot perform any action. You cannot create a booking, look up a booking, check a wallet, cancel anything, or contact support. If the user asks you to do something, tell them what they should do in the app instead. Never claim to have done it.
6. You have no access to any user's account or live data. Never state a specific user's booking status, wallet balance, provider name or location.

STYLE — your reply is rendered inside a small chat bubble, so structure it for that:
- Lead with the answer. First line is a direct one-sentence answer to exactly what was asked.
  Never restate the question and never open with "Great question", "Sure" or "Here's".
- Then add detail as a list, one point per line, each on its own line starting with "- ".
  Use a list whenever there is more than one thing to say.
- Bold with **double asterisks** the one or two things that matter: amounts, fees,
  percentages, limits, statuses and the action the user should take. Nothing else.
- Use "1. 2. 3." only for an ordered process the user must follow in sequence.
- Maximum 6 list items and about 110 words in total. Shorter is better.
- No tables, no headings, no code blocks, no horizontal rules, no images, no raw URLs.
- No paragraphs longer than two lines. Never write a paragraph-style wall of text.
- Use the exact terminology from the Knowledge Center (for example "quotation", "lead",
  "provider", "booking", "No-Provider request").
- State amounts with the rupee symbol exactly as written in the Knowledge Center.
- If the answer genuinely spans two Knowledge Center sections, combine them into one reply.
- End on the actionable step, not on a sign-off. Do not offer to help further.`;

function chatError(code, message, statusCode) {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

/**
 * Post-generation guard. The sentinel is the primary mechanism, but a model can still
 * drift, so any answer that claims an action it cannot perform, or that admits ignorance
 * in its own words, is downgraded to the fallback rather than shown as fact.
 */
const IMPOSSIBLE_CLAIM_PATTERNS = [
  /\bi(?:'ve| have)\s+(?:just\s+)?(?:booked|created|cancelled|scheduled|updated|processed|withdrawn|contacted)\b/i,
  /\blet me (?:check|look up|pull up|fetch)\b/i,
  /\bhere(?:'s| is) your booking\b/i,
  /\bas an ai\b/i,
  /\bbased on my (?:general|own) knowledge\b/i,
  /\baccording to (?:general|common) knowledge\b/i,
  /\bi (?:can|could) (?:help you )?book\b/i,
  /\bi(?:'m| am) (?:checking|looking)\b/i
];

/**
 * A grounded answer talks about bookings generically ("once the customer confirms the
 * quotation, the booking is completed"). An invented one is always about a *specific*
 * record, because the model echoed back an ID the user supplied. So an answer is only
 * downgraded when a ServeGo24 record ID appears together with a status assertion.
 */
const RECORD_ID_PATTERN = /\b(?:SG24|CID|PID)-\s?\d+\b/i;
const STATUS_ASSERTION_PATTERN =
  /\b(?:is|was|has been|are|were)\s+(?:now\s+|already\s+|currently\s+)?(?:confirmed|cancelled|completed|scheduled|accepted|declined|processed|paid|booked|in progress|on the way|arrived)\b/i;

const SELF_ADMITTED_UNCERTAINTY = [
  /i (?:don'?t|do not) (?:have|know)/i,
  /i(?:'m| am) not (?:sure|aware|certain)/i,
  /not (?:mentioned|specified|stated|listed|documented|available|found|covered) in (?:the |my |this )?(?:knowledge|provided|documentation|guide)/i,
  /no information (?:is |about|on|regarding)/i,
  /(?:i (?:can'?t|cannot|unable to)|not able to) (?:find|confirm|determine|tell|verify|provide)/i,
  /i don'?t (?:want to|should) guess/i,
  /not sure (?:about|if|whether)/i,
  /isn'?t (?:something|anything) (?:i|we) (?:can|know)/i
];

/**
 * Rendering artefacts the model was told to avoid, stripped anyway so a stray one can never
 * reach the chat bubble as raw syntax. `**bold**` is deliberately KEPT — the frontend renders
 * it as a real <strong>, and it is what makes a list scannable in a narrow bubble.
 */
function stripRenderingArtefacts(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s{0,3}#{1,6}\s+.*$/gm, '')
    // A markdown table renders as unreadable pipe soup in a chat bubble — drop the rows.
    .replace(/^\s*\|.*$/gm, '')
    .replace(/^\s*(?:[-*_]\s*){3,}$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Turn a raw model reply into a customer-safe answer.
 * Returns `{ answer, grounded }` — `grounded: false` means the fallback was used.
 */
export function normalizeAnswer(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return { answer: NO_KNOWLEDGE_ANSWER, grounded: false };

  // The sentinel may arrive alone, quoted, or with trailing punctuation.
  const stripped = text.replace(/[`"'\s*]+/g, '');
  if (stripped.toUpperCase().includes(NOT_IN_KNOWLEDGE_CENTER)) {
    return { answer: NO_KNOWLEDGE_ANSWER, grounded: false };
  }

  // The model must never leak the Knowledge Center's own scaffolding.
  const cleaned = stripRenderingArtefacts(
    text
      .replace(new RegExp(NOT_IN_KNOWLEDGE_CENTER, 'gi'), '')
      .replace(/^#+\s*SERVEGO24 KNOWLEDGE CENTER.*$/gim, '')
      .replace(/^#+\s*END OF KNOWLEDGE CENTER.*$/gim, '')
  );

  if (!cleaned) return { answer: NO_KNOWLEDGE_ANSWER, grounded: false };

  // A stray unclosed `**` would swallow the rest of the bubble in the renderer.
  const hasUnpairedBold = (cleaned.match(/\*\*/g) || []).length % 2 !== 0;
  const rendered = hasUnpairedBold ? cleaned.replace(/\*\*/g, '') : cleaned;

  if (IMPOSSIBLE_CLAIM_PATTERNS.some((re) => re.test(rendered))) {
    return { answer: NO_KNOWLEDGE_ANSWER, grounded: false };
  }

  if (RECORD_ID_PATTERN.test(rendered) && STATUS_ASSERTION_PATTERN.test(rendered)) {
    return { answer: NO_KNOWLEDGE_ANSWER, grounded: false };
  }

  if (SELF_ADMITTED_UNCERTAINTY.some((re) => re.test(rendered))) {
    return { answer: NO_KNOWLEDGE_ANSWER, grounded: false };
  }

  return { answer: rendered, grounded: true };
}

/** Call Gemini and return the assistant reply. */
async function callGemini({ question, knowledgeText }) {
  if (!GEMINI_API_KEY) {
    throw chatError(
      'CHAT_NOT_CONFIGURED',
      'The Knowledge Assistant is not configured on this server.',
      503
    );
  }

  const url =
    `${GEMINI_BASE_URL}/models/${encodeURIComponent(GEMINI_MODEL)}` +
    `:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const generationConfig = {
    // Deterministic: a grounded assistant should never be creative.
    temperature: 0,
    topP: 1,
    topK: 1,
    maxOutputTokens: 500
  };
  // Gemini 2.5+ thinks by default, which adds seconds of latency for no benefit on a
  // grounded lookup. Flash-Lite ids and legacy 1.x models reject the field outright and
  // Pro models require a non-zero budget, so all three are excluded by name.
  if (!/gemini-(?:1\.[0-9]+|.*flash-lite|pro)/.test(GEMINI_MODEL)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              `SERVEGO24 KNOWLEDGE CENTER (the only source of truth):\n\n` +
              `${knowledgeText}\n\n` +
              `END OF KNOWLEDGE CENTER\n\n` +
              `Question: ${question}`
          }
        ]
      }
    ],
    generationConfig
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS)
    });
  } catch (err) {
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    throw chatError(
      timedOut ? 'CHAT_MODEL_TIMEOUT' : 'CHAT_MODEL_UNREACHABLE',
      timedOut
        ? 'The Knowledge Assistant took too long to respond. Please try again.'
        : 'Could not reach the Knowledge Assistant. Please try again.',
      503
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // The upstream error body can contain the API key in the URL echo — log the status
    // only, and never forward Google's message to the client.
    const upstreamStatus = payload?.error?.status || response.status;
    console.error(`[chatService] Gemini call failed (status ${upstreamStatus}, model ${GEMINI_MODEL})`);
    throw chatError(
      'CHAT_MODEL_ERROR',
      'The Knowledge Assistant is temporarily unavailable. Please try again.',
      503
    );
  }

  const candidate = payload?.candidates?.[0];

  // Safety block or an empty candidate are both "no usable answer" — fall back rather
  // than surfacing a blank bubble.
  if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') {
    throw chatError(
      'CHAT_MODEL_BLOCKED',
      'The Knowledge Assistant could not answer that question. Please raise a support ticket.',
      422
    );
  }

  const parts = candidate?.content?.parts;
  const rawText = Array.isArray(parts)
    ? parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('')
    : '';

  return rawText;
}

/**
 * Answer a question from the Knowledge Center.
 * @returns {Promise<{answer: string, grounded: boolean}>}
 */
export async function askKnowledgeAssistant({ question, knowledgeCenter }) {
  const cleanQuestion = String(question || '').trim();
  if (!cleanQuestion) {
    throw chatError('CHAT_QUESTION_REQUIRED', 'Please type a question.', 400);
  }
  if (!knowledgeCenter?.text) {
    throw chatError('CHAT_KNOWLEDGE_UNAVAILABLE', 'Knowledge Center is unavailable.', 503);
  }

  const rawText = await callGemini({
    question: cleanQuestion,
    knowledgeText: knowledgeCenter.text
  });

  return normalizeAnswer(rawText);
}
