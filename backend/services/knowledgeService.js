/**
 * ServeGo24 Knowledge Center — the single source of truth the chatbot is allowed to
 * answer from.
 *
 * The Knowledge Center is a directory of plain Markdown files (`data/knowledge/*.md`),
 * ordered by their numeric filename prefix. They are deliberately NOT derived from the
 * repo docs at runtime: the chatbot must only ever state things ServeGo24 has chosen to
 * publish, so the content is curated separately and edited without a code change.
 *
 * Read-heavy and near-immutable, so the assembled document is cached in memory for
 * KNOWLEDGE_TTL_MS (rule 14). `invalidateKnowledgeCenter()` is the invalidation hook —
 * call it from any future admin "edit knowledge" write path so changes apply without
 * waiting for the TTL.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTtlCache, createSingleFlight } from '../utils/ttlCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Curated knowledge files, read in filename order. */
export const KNOWLEDGE_DIR = path.join(__dirname, '..', 'data', 'knowledge');

/** Near-immutable content: a long TTL is safe, and a redeploy is not required. */
export const KNOWLEDGE_TTL_MS = 10 * 60 * 1000;

/** Hard cap so a runaway knowledge file can never blow the model's context window. */
const MAX_KNOWLEDGE_CHARS = 200_000;

const cache = createTtlCache(KNOWLEDGE_TTL_MS);
// Collapses a cold burst into one disk read (same reason the catalog cache needs it).
const singleFlight = createSingleFlight();

function knowledgeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Split one file into titled chunks.
 *
 * The H1 is the published section (e.g. "Cancellation & Support") and the H2/H3s are the
 * questions inside it. Both are kept on the chunk: a chunk labelled only "What happens if
 * I cancel a booking?" loses the section it belongs to, and the assistant answers better
 * when it can see the grouping the Knowledge Center is organised into.
 */
function splitIntoChunks(markdown, fileLabel) {
  const lines = markdown.split(/\r?\n/);
  const chunks = [];
  let section = fileLabel;
  let heading = null;
  let buffer = [];

  const flush = () => {
    const body = buffer.join('\n').trim();
    buffer = [];
    if (!body) return;
    chunks.push({
      section,
      heading: heading || section,
      body
    });
  };

  for (const line of lines) {
    const match = /^(#{1,3})\s+(.*)$/.exec(line);
    if (match) {
      flush();
      const level = match[1].length;
      const text = match[2].trim();
      if (level === 1) {
        section = text;
        heading = null;
      } else {
        heading = text;
      }
      continue;
    }
    buffer.push(line);
  }
  flush();

  return chunks;
}

/** Read + assemble the Knowledge Center from disk. */
async function readKnowledgeCenter() {
  let fileNames;
  try {
    fileNames = await fs.readdir(KNOWLEDGE_DIR);
  } catch (err) {
    const code = err.code === 'ENOENT' ? 'CHAT_KNOWLEDGE_MISSING' : 'CHAT_KNOWLEDGE_UNAVAILABLE';
    const msg = err.code === 'ENOENT'
      ? `Knowledge Center directory not found at ${KNOWLEDGE_DIR}. Ensure backend/data/knowledge is deployed.`
      : `Knowledge Center directory is not readable: ${err.message}`;
    throw knowledgeError(code, msg);
  }

  const mdFiles = fileNames.filter((n) => n.endsWith('.md')).sort();
  if (mdFiles.length === 0) {
    // An empty Knowledge Center would make every question return the fallback while
    // still returning HTTP 200 — a silent, total failure. Fail loudly instead.
    throw knowledgeError('CHAT_KNOWLEDGE_UNAVAILABLE', 'Knowledge Center has no content files.');
  }

  const sections = [];
  for (const fileName of mdFiles) {
    const raw = await fs.readFile(path.join(KNOWLEDGE_DIR, fileName), 'utf8');
    if (!raw.trim()) continue;
    for (const chunk of splitIntoChunks(raw, fileName)) {
      sections.push({ ...chunk, source: fileName });
    }
  }

  if (sections.length === 0) {
    throw knowledgeError('CHAT_KNOWLEDGE_UNAVAILABLE', 'Knowledge Center parsed to zero sections.');
  }

  // Render each chunk under its published section so the assistant can see the grouping
  // (`### Cancellation & Support` / `#### What happens if I cancel a booking?`).
  let text = sections
    .map((s) =>
      s.heading === s.section
        ? `### ${s.section}\n\n${s.body}`
        : `### ${s.section}\n#### ${s.heading}\n\n${s.body}`
    )
    .join('\n\n');

  if (text.length > MAX_KNOWLEDGE_CHARS) {
    text = text.slice(0, MAX_KNOWLEDGE_CHARS);
  }

  return {
    text,
    sections,
    sources: mdFiles,
    charCount: text.length
  };
}

/**
 * The assembled Knowledge Center, cached for KNOWLEDGE_TTL_MS.
 * Returns `{ text, sections, sources, charCount }`.
 */
export async function getKnowledgeCenter() {
  const cached = cache.get('knowledge-center');
  if (cached) return cached;

  const fresh = await singleFlight.run('knowledge-center', readKnowledgeCenter);
  cache.set('knowledge-center', fresh);
  return fresh;
}

/** Invalidation hook — call from any write path that changes the knowledge files. */
export function invalidateKnowledgeCenter() {
  cache.invalidate('knowledge-center');
}
