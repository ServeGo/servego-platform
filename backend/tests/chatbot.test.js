import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, NOT_IN_KNOWLEDGE_CENTER, NO_KNOWLEDGE_ANSWER, askKnowledgeAssistant } from '../services/chatService.js';
import { getKnowledgeCenter, invalidateKnowledgeCenter } from '../services/knowledgeService.js';

// The chatbot's core promise: every answer comes from the Knowledge Center, and anything
// outside it becomes an honest "I don't have that" instead of a plausible invention.

test('the sentinel is always converted to the fallback', () => {
  for (const raw of [
    NOT_IN_KNOWLEDGE_CENTER,
    `  ${NOT_IN_KNOWLEDGE_CENTER}  `,
    `\`${NOT_IN_KNOWLEDGE_CENTER}\``,
    `"${NOT_IN_KNOWLEDGE_CENTER}"`,
    not_knowledge_center_upper()
  ]) {
    const { answer, grounded } = normalizeAnswer(raw);
    assert.equal(grounded, false, `must not be grounded: ${raw}`);
    assert.equal(answer, NO_KNOWLEDGE_ANSWER);
  }
});

function not_knowledge_center_upper() {
  return 'not_in_knowledge_center';
}

test('an empty or blank model reply is treated as no answer', () => {
  for (const raw of ['', '   ', null, undefined]) {
    const { answer, grounded } = normalizeAnswer(raw);
    assert.equal(grounded, false);
    assert.equal(answer, NO_KNOWLEDGE_ANSWER);
  }
});

test('the model cannot claim it performed an action', () => {
  const invented = [
    "I've booked your AC repair for tomorrow.",
    'Your booking SG24-0001 is now confirmed.',
    'I have cancelled that booking for you.',
    'Let me check your booking status.',
    "Here's your booking details.",
    'As an AI, I can help you book this service.'
  ];
  for (const raw of invented) {
    const { grounded } = normalizeAnswer(raw);
    assert.equal(grounded, false, `must be downgraded to fallback: ${raw}`);
  }
});

test('a self-admitted "I do not know" is downgraded even without the sentinel', () => {
  const hedged = [
    "I don't have information about ServeGo24 operating hours.",
    'I am not sure about the cancellation fee.',
    'This is not mentioned in the knowledge center.',
    'No information is available on that.'
  ];
  for (const raw of hedged) {
    const { grounded } = normalizeAnswer(raw);
    assert.equal(grounded, false, `must be downgraded to fallback: ${raw}`);
  }
});

test('a grounded answer is passed through and keeps the bold the renderer needs', () => {
  const { answer, grounded } = normalizeAnswer(
    'ServeGo24 is a home services marketplace that connects customers with providers.'
  );
  assert.equal(grounded, true);
  assert.equal(answer, 'ServeGo24 is a home services marketplace that connects customers with providers.');

  // `**bold**` is what makes a reply scannable in a narrow bubble, so it must survive.
  const bold = normalizeAnswer('Confirming a quotation charges **no fee** at all.');
  assert.equal(bold.grounded, true);
  assert.equal(bold.answer, 'Confirming a quotation charges **no fee** at all.');

  // An unpaired `**` would swallow the rest of the bubble, so it is dropped.
  const unpaired = normalizeAnswer('There is **no service fee.');
  assert.equal(unpaired.grounded, true);
  assert.equal(unpaired.answer, 'There is no service fee.');
});

test('tables, headings and code fences never reach the chat bubble as raw syntax', () => {
  const raw = [
    'A booking moves through these statuses:',
    '',
    '| Status | Meaning |',
    '| --- | --- |',
    '| PENDING | Looking for a provider |',
    '',
    '```',
    'PENDING -> CONFIRMED',
    '```',
    '',
    'It completes when you confirm the quotation.'
  ].join('\n');
  const { answer, grounded } = normalizeAnswer(raw);
  assert.equal(grounded, true);
  assert.equal(answer, 'A booking moves through these statuses:\n\nIt completes when you confirm the quotation.');

  // A reply that is nothing but rendering artefacts has no answer left to show.
  const artefactsOnly = normalizeAnswer('## Heading\n\n```\ncode\n```');
  assert.equal(artefactsOnly.grounded, false);
});

test('a policy answer that says "there is no ..." is NOT downgraded', () => {
  // Guards the guard. "There is no service fee" is a real, answerable Knowledge Center
  // statement — an earlier blanket "there is/are no" rule threw these away and made the
  // assistant claim ignorance about its own published policy.
  const legitimate = [
    'There is no service fee when you confirm a quotation.',
    'There is no maximum withdrawal amount by default.',
    'No online payment is taken for a booking.',
    'There is no charge if you cancel before a quotation was sent.',
    'Providers are not ranked, so distance does not matter.'
  ];
  for (const raw of legitimate) {
    const { grounded } = normalizeAnswer(raw);
    assert.equal(grounded, true, `must stay grounded: ${raw}`);
  }
});

test('the Knowledge Center loads, is cached, and stays within a sane context budget', async () => {
  invalidateKnowledgeCenter();
  const first = await getKnowledgeCenter();
  assert.ok(first.sources.length >= 8, 'expected the eight knowledge sections');
  assert.ok(first.sections.length > 20, 'expected the content split into addressable sections');
  assert.ok(first.charCount > 5000, 'expected real content');
  assert.ok(first.charCount < 200000, 'must fit the model context window');

  // Second call must be served from cache (same object identity).
  const second = await getKnowledgeCenter();
  assert.equal(second, first, 'expected the TTL cache to serve the repeat read');
});

test('the Knowledge Center covers every published section', async () => {
  const kc = await getKnowledgeCenter();
  const index = kc.sections
    .map((s) => `${s.section} ${s.heading}`)
    .join(' | ')
    .toLowerCase();
  for (const expected of [
    'what is servego24',
    'can i choose',
    'how does a provider get chosen',
    'commission',
    'cancellation',
    'become a servego24 provider'
  ]) {
    assert.ok(index.includes(expected), `Knowledge Center is missing: ${expected}`);
  }
});

test('every chunk keeps the published section it belongs to', async () => {
  const kc = await getKnowledgeCenter();
  for (const s of kc.sections) {
    assert.ok(s.section && s.heading, `chunk is missing its labels: ${JSON.stringify(s)}`);
  }
  // The eight published sections must survive parsing as the grouping the model sees.
  const sections = new Set(kc.sections.map((s) => s.section));
  assert.ok(sections.size >= 8, `expected 8 published sections, got ${sections.size}`);
});

test('a generic statement about a booking is NOT downgraded', () => {
  // Guards the guard: legitimate Knowledge Center answers mention bookings and IDs
  // generically, and must not be thrown away.
  const legitimate = [
    'Once the customer confirms the quotation, the booking is completed.',
    'You receive a booking number like SG24-0001 once the booking is created.',
    'Your booking stays Pending until a provider accepts.'
  ];
  for (const raw of legitimate) {
    const { grounded } = normalizeAnswer(raw);
    assert.equal(grounded, true, `must stay grounded: ${raw}`);
  }
});

test('an empty question is rejected with a stable code', async () => {
  await assert.rejects(
    () => askKnowledgeAssistant({ question: '   ', knowledgeCenter: { text: 'x' } }),
    (err) => err.code === 'CHAT_QUESTION_REQUIRED' && err.statusCode === 400
  );
});

test('a missing Knowledge Center fails loudly rather than answering nothing', async () => {
  await assert.rejects(
    () => askKnowledgeAssistant({ question: 'What is ServeGo24?', knowledgeCenter: null }),
    (err) => err.code === 'CHAT_KNOWLEDGE_UNAVAILABLE' && err.statusCode === 503
  );
});
