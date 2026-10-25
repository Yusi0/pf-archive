import React from 'react';
import { createRoot } from 'react-dom/client';
import { StateField } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import MarkdownRenderer from '../components/MarkdownRenderer';

// Live Preview, block layer. Tables, graphs, callouts, media and code fences (lists and folds stay source) are drawn by the
// site's own <MarkdownRenderer> so they look exactly like the published page. A block turns
// back into source as soon as the selection touches it.

const WIDGET_OPEN = /^:::\s*(graph|compare)\b/i;
const CLOSE = /^:::\s*$/;
const MEDIA_LINE = /^\s*(\[\[.+\]\]|!\[[^\]]*\]\([^)]*\))\s*$/;

/** Finds top-level block ranges as { from, to, kind, text, lines } (line-aligned offsets). */
export function findBlocks(doc) {
  const blocks = [];
  const total = doc.lines;
  const push = (kind, startNo, endNo) => {
    const from = doc.line(startNo).from;
    const to = doc.line(endNo).to;
    blocks.push({ kind, from, to, lines: endNo - startNo + 1, text: doc.sliceString(from, to) });
  };

  let n = 1;
  while (n <= total) {
    const trimmed = doc.line(n).text.trim();

    if (trimmed.startsWith('```')) {
      let end = n + 1;
      while (end <= total && !doc.line(end).text.trim().startsWith('```')) end++;
      if (end <= total) {
        push('code', n, end);
        n = end + 1;
        continue;
      }
    } else if (WIDGET_OPEN.test(trimmed)) {
      let end = n + 1;
      while (end <= total && !CLOSE.test(doc.line(end).text.trim())) end++;
      if (end <= total) {
        push(WIDGET_OPEN.exec(trimmed)[1].toLowerCase(), n, end);
        n = end + 1;
        continue;
      }
    } else if (/^>\s*\[![A-Za-z]+\]/.test(trimmed)) {
      let end = n;
      while (end + 1 <= total && doc.line(end + 1).text.trim().startsWith('>')) end++;
      push('callout', n, end);
      n = end + 1;
      continue;
    } else if (trimmed.startsWith('|')) {
      let end = n;
      while (end + 1 <= total && doc.line(end + 1).text.trim().startsWith('|')) end++;
      if (end > n) {
        push('table', n, end);
        n = end + 1;
        continue;
      }
    } else if (MEDIA_LINE.test(trimmed)) {
      push('media', n, n);
      n++;
      continue;
    }
    n++;
  }
  return blocks;
}

const cache = new WeakMap();
/** findBlocks memoised per document (the doc object is immutable). */
export function blocksFor(doc) {
  let blocks = cache.get(doc);
  if (!blocks) cache.set(doc, (blocks = findBlocks(doc)));
  return blocks;
}

const ESTIMATE = { callout: 90, table: 34, graph: 330, compare: 520, media: 320, code: 28 };

class BlockWidget extends WidgetType {
  constructor(block) {
    super();
    this.kind = block.kind;
    this.text = block.text;
    this.lines = block.lines;
  }

  eq(other) {
    return other.kind === this.kind && other.text === this.text;
  }

  get estimatedHeight() {
    return this.kind === 'table' || this.kind === 'code' ? this.lines * ESTIMATE[this.kind] : ESTIMATE[this.kind];
  }

  toDOM(view) {
    const dom = document.createElement('div');
    dom.className = `cm-block cm-block-${this.kind}`;
    const root = createRoot(dom);
    root.render(<MarkdownRenderer content={this.text} />);

    // The renderer fills in asynchronously (graphs, images): tell CodeMirror when the height changes.
    const observer = new ResizeObserver(() => view.requestMeasure());
    observer.observe(dom);
    dom.__cleanup = () => {
      observer.disconnect();
      setTimeout(() => root.unmount(), 0); // never unmount from inside a CodeMirror update
    };
    return dom;
  }

  destroy(dom) {
    dom.__cleanup?.();
  }

  // Let the rendered block handle its own toggles (fold summaries, links); any other click
  // reaches CodeMirror, moves the caret into the block and swaps it back to source.
  ignoreEvent(event) {
    if (event.type === 'mousedown' || event.type === 'click') {
      return !!event.target.closest?.('summary, a, .list-tree-toggle, button');
    }
    return true;
  }
}

function touches(state, block) {
  return state.selection.ranges.some((r) => r.from <= block.to && r.to >= block.from);
}

function decorate(state, blocks) {
  const ranges = [];
  for (const block of blocks) {
    if (touches(state, block)) continue;
    ranges.push(Decoration.replace({ widget: new BlockWidget(block), block: true }).range(block.from, block.to));
  }
  return Decoration.set(ranges);
}

const blockField = StateField.define({
  create(state) {
    const blocks = blocksFor(state.doc);
    return { blocks, deco: decorate(state, blocks) };
  },
  update(value, tr) {
    if (!tr.docChanged && !tr.selection) return value;
    const blocks = tr.docChanged ? blocksFor(tr.state.doc) : value.blocks;
    return { blocks, deco: decorate(tr.state, blocks) };
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.deco),
});

export const blockWidgets = blockField;
