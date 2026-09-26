import React from 'react';

const BULLET = /^\s*[-*•]\s+/;
const ORDERED = /^\s*(\d+)[.)]\s+/;

/** Render `**bold**` as a real <strong>. No HTML injection: the text is split into React
 *  nodes, never passed through dangerouslySetInnerHTML. */
function inline(text, key) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) =>
      part.length > 4 && part.startsWith('**') && part.endsWith('**') ? (
        <strong key={`${key}-${i}`} className="font-extrabold">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <React.Fragment key={`${key}-${i}`}>{part}</React.Fragment>
      )
    );
}

function List({ items, ordered }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={ordered ? 'space-y-1.5' : 'space-y-1'}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span
            aria-hidden="true"
            className={`shrink-0 pt-px text-slate-400 ${ordered ? 'w-4 text-right font-extrabold' : 'w-2 text-center'}`}
          >
            {ordered ? `${i + 1}.` : '•'}
          </span>
          <span className="min-w-0 flex-1">{inline(item, `${ordered ? 'o' : 'b'}${i}`)}</span>
        </li>
      ))}
    </Tag>
  );
}

/**
 * Renders an assistant reply as a chat message rather than a wall of text: a lead line,
 * then bulleted or numbered detail. The backend normalises the reply to this shape and
 * strips any table/heading/fence the model may still have produced, so this only has to
 * understand bullets, ordered steps and bold.
 */
export default function ChatMessageBody({ text }) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return null;

  const nodes = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const key = `p${nodes.length}`;
    nodes.push(<p key={key}>{inline(paragraph.join(' '), key)}</p>);
    paragraph = [];
  };

  let i = 0;
  while (i < lines.length) {
    const ordered = ORDERED.test(lines[i]);
    if (ordered || BULLET.test(lines[i])) {
      flushParagraph();
      const items = [];
      while (i < lines.length && (ordered ? ORDERED : BULLET).test(lines[i])) {
        items.push(lines[i].replace(ordered ? ORDERED : BULLET, ''));
        i += 1;
      }
      nodes.push(<List key={`l${nodes.length}`} items={items} ordered={ordered} />);
      continue;
    }
    paragraph.push(lines[i]);
    i += 1;
  }
  flushParagraph();

  return <div className="space-y-2">{nodes}</div>;
}
