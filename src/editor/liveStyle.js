import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import { COLOR_PALETTE, DEFAULT_HIGHLIGHT_BG } from '../utils/customColorPalette';
import { PF_TAGS } from '../utils/customMarkdownParser';
import { scanInline, scanLinePrefix } from './inlineSyntax';

// Live Preview, inline layer. Nothing here edits the document: markers are hidden with
// replace decorations and formatting is applied with mark decorations, so undo/redo and
// the saved text are untouched. Lines the selection touches fall back to dimmed source.

const dim = Decoration.mark({ class: 'cm-syn' });
const hide = Decoration.replace({});
const lineDecos = {};
const lineClass = (cls) => (lineDecos[cls] ||= Decoration.line({ class: cls }));
const marks = {};
const markClass = (cls, style) => {
  const key = cls + '|' + (style || '');
  return (marks[key] ||= Decoration.mark({ class: cls, attributes: style ? { style } : undefined }));
};

class TagChip extends WidgetType {
  constructor(tag) {
    super();
    this.tag = tag;
  }
  eq(other) {
    return other.tag === this.tag;
  }
  toDOM() {
    const info = PF_TAGS[this.tag] || PF_TAGS[this.tag.toLowerCase()];
    const el = document.createElement('span');
    el.className = `pf-chip pf-chip-${info.type}`;
    el.title = info.label;
    el.textContent = info.symbol;
    return el;
  }
}

class FootnoteChip extends WidgetType {
  constructor(num, note) {
    super();
    this.num = num;
    this.note = note;
  }
  eq(other) {
    return other.num === this.num && other.note === this.note;
  }
  toDOM() {
    const el = document.createElement('sup');
    el.className = 'cm-fn-chip';
    el.title = this.note;
    el.textContent = this.num || '·';
    return el;
  }
}

const INLINE_CLASS = {
  bold: 'cm-b',
  italic: 'cm-i',
  bolditalic: 'cm-b cm-i',
  under: 'cm-u',
  strike: 'cm-s',
  code: 'cm-code',
  link: 'cm-link',
};

function activeLines(state) {
  const set = new Set();
  for (const range of state.selection.ranges) {
    const a = state.doc.lineAt(range.from).number;
    const b = state.doc.lineAt(range.to).number;
    for (let n = a; n <= b; n++) set.add(n);
  }
  return set;
}

function build(view) {
  const { state } = view;
  const { doc } = state;
  const active = activeLines(state);
  const out = [];
  let lastLine = 0;

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = doc.lineAt(pos);
      pos = line.to + 1;
      if (line.number <= lastLine) continue;
      lastLine = line.number;

      const text = line.text;
      const prefix = scanLinePrefix(text);
      const raw = active.has(line.number);
      const at = (n) => line.from + n;
      const hideOrDim = (a, b) => {
        if (b > a) out.push((raw ? dim : hide).range(at(a), at(b)));
      };

      if (prefix?.kind === 'heading') {
        out.push(lineClass(`cm-h cm-h${prefix.level}`).range(line.from));
        hideOrDim(...prefix.marker);
      } else if (prefix?.kind === 'quote') {
        out.push(lineClass('cm-quote').range(line.from));
        hideOrDim(...prefix.marker);
      } else if (prefix?.kind === 'fence') {
        out.push(lineClass('cm-fence').range(line.from));
        if (prefix.marker[1] > prefix.marker[0]) out.push(dim.range(at(prefix.marker[0]), at(prefix.marker[1])));
      } else if (prefix?.kind === 'hr') {
        out.push(lineClass('cm-hr').range(line.from));
      } else if (prefix?.kind === 'list') {
        out.push(dim.range(at(prefix.marker[0]), at(prefix.marker[1])));
      } else if (prefix?.kind === 'table') {
        for (let i = 0; i < text.length; i++) if (text[i] === '|') out.push(dim.range(at(i), at(i + 1)));
      }

      for (const span of scanInline(text)) {
        if (raw) {
          out.push(dim.range(at(span.open[0]), at(span.open[1])));
          if (span.close) out.push(dim.range(at(span.close[0]), at(span.close[1])));
          continue;
        }

        if (span.kind === 'tag') {
          out.push(Decoration.replace({ widget: new TagChip(span.tag) }).range(at(span.from), at(span.to)));
          continue;
        }
        if (span.kind === 'fn') {
          out.push(Decoration.replace({ widget: new FootnoteChip(span.num, span.note) }).range(at(span.from), at(span.to)));
          continue;
        }
        if (span.kind === 'image') continue; // block layer owns images

        let cls = INLINE_CLASS[span.kind];
        let style;
        if (span.kind === 'color') {
          cls = 'cm-color';
          style = `color:${COLOR_PALETTE[span.color].hex}`;
        } else if (span.kind === 'hl') {
          cls = 'cm-hl';
          style = `background-color:${span.color ? COLOR_PALETTE[span.color].bg : DEFAULT_HIGHLIGHT_BG}`;
        }
        out.push(hide.range(at(span.open[0]), at(span.open[1])));
        if (span.close) out.push(hide.range(at(span.close[0]), at(span.close[1])));
        if (span.open[1] < (span.close ? span.close[0] : span.to)) {
          out.push(markClass(cls, style).range(at(span.open[1]), at(span.close ? span.close[0] : span.to)));
        }
      }
    }
  }
  return Decoration.set(out, true);
}

export const liveStyle = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = build(view);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) this.decorations = build(update.view);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);
