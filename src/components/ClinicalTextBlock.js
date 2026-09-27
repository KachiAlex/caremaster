import React from 'react';

const HEADER_RE = /^([A-Z][A-Za-z0-9 \/&()'_-]{1,60}):\s*$/;
const LABEL_VALUE_RE = /^([A-Z][A-Za-z0-9 \/&()'_-]{1,40}):\s+(.+)$/;
const BULLET_RE = /^[-•*–▪◦]\s+(.+)$/;
const NUMBERED_RE = /^(\d+)[.)]\s+(.+)$/;

// Renders plain-text clinical content (notes, instructions, legacy report
// blobs) with real structure: "Header:" lines become headings, "- item" /
// "1. item" lines become lists, "Label: value" lines become label rows, and
// remaining lines become paragraphs. Input is rendered as text only — no HTML.
const ClinicalTextBlock = ({ text, className = 'text-sm text-gray-700' }) => {
  if (!text) return null;

  const lines = String(text).split(/\r?\n/);
  const blocks = [];
  let list = null;

  const flushList = () => {
    if (list && list.items.length > 0) blocks.push(list);
    list = null;
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) { flushList(); return; }

    const bullet = BULLET_RE.exec(line);
    const numbered = NUMBERED_RE.exec(line);
    if (bullet || numbered) {
      if (!list) list = { type: 'list', items: [] };
      list.items.push(bullet ? bullet[1] : numbered[2]);
      return;
    }

    flushList();

    if (HEADER_RE.test(line)) {
      blocks.push({ type: 'header', text: line });
    } else {
      const lv = LABEL_VALUE_RE.exec(line);
      if (lv) {
        blocks.push({ type: 'kv', label: lv[1], value: lv[2] });
      } else {
        blocks.push({ type: 'p', text: line });
      }
    }
  });
  flushList();

  return (
    <div className={`space-y-1.5 ${className}`}>
      {blocks.map((block, i) => {
        if (block.type === 'header') {
          return (
            <p key={i} className="font-semibold text-gray-900 pt-2 first:pt-0">
              {block.text.replace(/:$/, '')}
            </p>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="list-disc ml-5 space-y-1">
              {block.items.map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          );
        }
        if (block.type === 'kv') {
          return (
            <p key={i}>
              <span className="font-medium text-gray-900">{block.label}:</span> {block.value}
            </p>
          );
        }
        return <p key={i} className="whitespace-pre-wrap">{block.text}</p>;
      })}
    </div>
  );
};

export default ClinicalTextBlock;
