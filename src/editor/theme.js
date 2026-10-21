import { EditorView } from '@codemirror/view';

// Colors come from the site's CSS variables so the editor follows the light/dark theme.
// Layout (column width, padding, heading sizes) lives in editor.css.
export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--text-primary)',
    backgroundColor: 'transparent',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-sans)',
    lineHeight: '1.85',
    overflow: 'auto',
  },
  '.cm-content': { caretColor: 'var(--text-strong)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--text-strong)' },
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'var(--border-strong)',
  },
  '.cm-placeholder': { color: 'var(--text-muted)' },
});
