import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, ViewPlugin } from '@codemirror/view';
import { scanInline, scanLinePrefix } from './inlineSyntax';

const dim = Decoration.mark({ class: 'cm-syn' });
const lineDecos = {};
const lineClass = (cls) => (lineDecos[cls] ||= Decoration.line({ class: cls }));

/** Source mode: every character stays visible, markers are dimmed and headings are emphasised. */
function buildSource(view) {
  const builder = new RangeSetBuilder();
  const { doc } = view.state;
  let lastLine = 0;

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = doc.lineAt(pos);
      pos = line.to + 1;
      if (line.number <= lastLine) continue;
      lastLine = line.number;

      const text = line.text;
      const ranges = [];
      const prefix = scanLinePrefix(text);

      if (prefix?.kind === 'heading') builder.add(line.from, line.from, lineClass(`cm-h cm-h${prefix.level}`));
      else if (prefix?.kind === 'fence') builder.add(line.from, line.from, lineClass('cm-fence'));

      if (prefix?.marker) ranges.push(prefix.marker);
      for (const span of scanInline(text)) {
        ranges.push(span.open);
        if (span.close) ranges.push(span.close);
      }
      if (prefix?.kind === 'table') {
        for (let i = 0; i < text.length; i++) if (text[i] === '|') ranges.push([i, i + 1]);
      }

      // RangeSetBuilder needs ascending order: sort, then trim overlaps.
      ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      let last = 0;
      for (const [a, b] of ranges) {
        const start = Math.max(a, last);
        if (b > start) {
          builder.add(line.from + start, line.from + b, dim);
          last = b;
        }
      }
    }
  }
  return builder.finish();
}

export const sourceStyle = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = buildSource(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) this.decorations = buildSource(update.view);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
