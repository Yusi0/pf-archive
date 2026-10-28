import { Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import { COLOR_PALETTE, DEFAULT_HIGHLIGHT_BG } from '../utils/customColorPalette';
import { PF_TAGS } from '../utils/customMarkdownParser';
import { scanInline, scanLinePrefix } from './inlineSyntax';
import { blocksFor } from './blockWidgets';

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

class BulletDot extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-bullet';
    el.textContent = '•';
    return el;
  }
}

class Rule extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-rule';
    return el;
  }
}

class Arrow extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const el = document.createElement('span');
    el.textContent = '→';
    return el;
  }
}

const arrow = Decoration.replace({ widget: new Arrow() });

const bullet = Decoration.replace({ widget: new BulletDot() });
const rule = Decoration.replace({ widget: new Rule() });

const FOLD_OPEN = /^(\s*):::\s*(?!(?:graph|compare|gallery)\b)(\S.*)$/i;
const FOLD_CLOSE = /^\s*:::\s*$/;

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
  const blocks = blocksFor(doc);
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
      // Lines inside a table/graph/code/media block (shown raw because the caret is in it) get Source styling only.
      const inBlock = blocks.some((b) => line.from >= b.from && line.to <= b.to);
      const raw = active.has(line.number) || inBlock;
      const at = (n) => line.from + n;
      const hideOrDim = (a, b) => {
        if (b > a) out.push((raw ? dim : hide).range(at(a), at(b)));
      };

      if (prefix?.kind === 'heading') {
        out.push(lineClass(`cm-h cm-h${prefix.level}`).range(line.from));
        hideOrDim(...prefix.marker);
      } else if (prefix?.kind === 'subtext') {
        out.push(lineClass('cm-subtext').range(line.from));
        hideOrDim(...prefix.marker);
      } else if (prefix?.kind === 'quote') {
        out.push(lineClass('cm-quote').range(line.from));
        hideOrDim(...prefix.marker);
      } else if (prefix?.kind === 'fence') {
        const open = text.match(FOLD_OPEN);
        if (!raw && open) {
          // Fold title: a quiet label; the content below is always shown expanded in Live mode.
          out.push(lineClass('cm-fold-title').range(line.from));
          out.push(hide.range(at(open[1].length), at(text.length - open[2].length)));
        } else if (!raw && FOLD_CLOSE.test(text)) {
          out.push(lineClass('cm-fold-end').range(line.from));
          out.push(hide.range(at(prefix.marker[0]), at(text.length)));
        } else {
          out.push(lineClass('cm-fence').range(line.from));
          if (prefix.marker[1] > prefix.marker[0]) out.push(dim.range(at(prefix.marker[0]), at(prefix.marker[1])));
        }
      } else if (prefix?.kind === 'hr') {
        if (raw) out.push(dim.range(line.from, line.to));
        else out.push(rule.range(line.from, line.to));
      } else if (prefix?.kind === 'list') {
        const [a, b] = prefix.marker;
        if (!raw && !prefix.ordered) out.push(bullet.range(at(a), at(b)));
        else out.push(dim.range(at(a), at(b)));
      } else if (prefix?.kind === 'table') {
        for (let i = 0; i < text.length; i++) if (text[i] === '|') out.push(dim.range(at(i), at(i + 1)));
      }

      const spans = scanInline(text);

      // `->` shows as an arrow, like the published page (not inside code spans, link targets or URLs)
      if (!raw && text.includes('->')) {
        const protectedRanges = [...text.matchAll(/`[^`]*`|\]\([^)]*\)|https?:\/\/\S+/g)].map((m) => [m.index, m.index + m[0].length]);
        for (const m of text.matchAll(/->/g)) {
          if (!protectedRanges.some(([a, b]) => m.index >= a && m.index < b)) out.push(arrow.range(at(m.index), at(m.index + 2)));
        }
      }

      for (const span of spans) {
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
