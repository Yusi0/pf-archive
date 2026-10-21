// Line-level scanners for the site's custom Markdown dialect. Pure functions: they only report
// where the syntax markers are, so the editor can dim, hide or style them without re-parsing the post.

const COLOR = '[roygbipROYGBIP]';

/** Mask ranges with spaces so later passes cannot match inside them (length preserved). */
function mask(text, from, to) {
  return text.slice(0, from) + ' '.repeat(to - from) + text.slice(to);
}

/**
 * Finds inline spans in a single line.
 * Each span: { kind, from, to, open: [a, b], close: [a, b] | null, color?, num?, tag? }
 * `open`/`close` are the marker ranges around the formatted content (offsets within `text`).
 */
export function scanInline(text) {
  const spans = [];
  let work = text;

  const run = (re, build, maskWhole) => {
    re.lastIndex = 0;
    let m;
    const found = [];
    while ((m = re.exec(work)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const span = build(m);
      if (span) found.push(span);
    }
    for (const span of found) {
      spans.push(span);
      if (maskWhole) work = mask(work, span.from, span.to);
    }
  };

  // Inline code and footnotes are opaque: nothing else is recognised inside them.
  run(
    /`([^`]+)`/g,
    (m) => ({
      kind: 'code',
      from: m.index,
      to: m.index + m[0].length,
      open: [m.index, m.index + 1],
      close: [m.index + m[0].length - 1, m.index + m[0].length],
    }),
    true,
  );

  run(
    /\{\^(\d+)?:\s*([^}]*)\}/g,
    (m) => ({
      kind: 'fn',
      from: m.index,
      to: m.index + m[0].length,
      num: m[1] || null,
      note: m[2],
      open: [m.index, m.index + m[0].length - m[2].length - 1],
      close: [m.index + m[0].length - 1, m.index + m[0].length],
    }),
    true,
  );

  // Images and links: [text](url)
  run(
    /(!?)\[([^\]]*)\]\(([^)]*)\)/g,
    (m) => {
      const bang = m[1].length;
      const textStart = m.index + bang + 1;
      const textEnd = textStart + m[2].length;
      return {
        kind: bang ? 'image' : 'link',
        from: m.index,
        to: m.index + m[0].length,
        open: [m.index, textStart],
        close: [textEnd, m.index + m[0].length],
        url: m[3],
      };
    },
    false,
  );

  // Colored text: [r#text]
  run(
    new RegExp(`\\[(${COLOR})#([^\\]]*)\\]`, 'g'),
    (m) => ({
      kind: 'color',
      from: m.index,
      to: m.index + m[0].length,
      color: m[1].toLowerCase(),
      open: [m.index, m.index + 3],
      close: [m.index + m[0].length - 1, m.index + m[0].length],
    }),
    false,
  );

  // Highlights: ==r#text== and ==text==
  run(
    new RegExp(`==(?:(${COLOR})#)?([^=]+?)==`, 'g'),
    (m) => {
      const markLen = 2 + (m[1] ? 2 : 0);
      return {
        kind: 'hl',
        from: m.index,
        to: m.index + m[0].length,
        color: m[1] ? m[1].toLowerCase() : null,
        open: [m.index, m.index + markLen],
        close: [m.index + m[0].length - 2, m.index + m[0].length],
      };
    },
    false,
  );

  const pair = (kind, re, len) =>
    run(
      re,
      (m) => ({
        kind,
        from: m.index,
        to: m.index + m[0].length,
        open: [m.index, m.index + len],
        close: [m.index + m[0].length - len, m.index + m[0].length],
      }),
      false,
    );

  pair('bolditalic', /\*\*\*(?!\s)(.+?)\*\*\*/g, 3);
  pair('bold', /\*\*(?!\s)(.+?)\*\*/g, 2);
  pair('italic', /(?<![*\w])\*(?![*\s])(.+?)(?<![*\s])\*(?![*\w])/g, 1);
  pair('under', /__(?!\s)(.+?)__/g, 2);
  pair('strike', /~~(?!\s)(.+?)~~/g, 2);

  // List/tag chips: [+] [-] [=] [A] [i]
  run(
    /\[([+\-=aAiI])\](?!\()/g,
    (m) => ({
      kind: 'tag',
      from: m.index,
      to: m.index + m[0].length,
      tag: m[1],
      open: [m.index, m.index + 3],
      close: null,
    }),
    false,
  );

  return spans.sort((a, b) => a.from - b.from || b.to - a.to);
}

/** Block-ish markers that belong to the line start. Returns null when the line has none. */
export function scanLinePrefix(text) {
  let m = text.match(/^(#{1,6})(\s+)/);
  if (m) return { kind: 'heading', level: m[1].length, marker: [0, m[0].length] };
  m = text.match(/^(\s*)(>)\s?/);
  if (m) return { kind: 'quote', marker: [m[1].length, m[0].length] };
  m = text.match(/^(\s*)([-*+]|\d+\.)(\s+)/);
  if (m) {
    return {
      kind: 'list',
      ordered: /\d/.test(m[2]),
      marker: [m[1].length, m[1].length + m[2].length],
      depth: (m[1].match(/\t/g) || []).length,
    };
  }
  if (/^\s*:::/.test(text)) return { kind: 'fence', marker: [text.indexOf(':::'), text.length] };
  if (/^\s*([-*_]){3,}\s*$/.test(text)) return { kind: 'hr', marker: [0, text.length] };
  if (/^\s*\|/.test(text)) return { kind: 'table' };
  return null;
}
