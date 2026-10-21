import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Annotation, Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as placeholderExt } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentLess, insertTab } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { editorTheme } from './theme';
import { sourceStyle } from './sourceStyle';
import { liveStyle } from './liveStyle';

const modeExtension = (mode) => (mode === 'live' ? liveStyle : sourceStyle);

const External = Annotation.define();

/** Wraps the selection (or a placeholder) and selects the wrapped text so typing replaces it. */
function wrapSelection(view, prefix, suffix, fallback) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to) || fallback;
  view.dispatch({
    changes: { from, to, insert: prefix + selected + suffix },
    selection: { anchor: from + prefix.length, head: from + prefix.length + selected.length },
    scrollIntoView: true,
  });
  view.focus();
  return true;
}

/**
 * CodeMirror 6 host. The document lives in the editor; `externalDoc` only pushes external replacements
 * (loading a post), `onChange` reports user edits as a string.
 */
const CodeEditor = forwardRef(function CodeEditor(
  { externalDoc, onChange, onSave, onImagePaste, onCaretLine, mode, placeholder },
  ref,
) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const modeCompartment = useRef(new Compartment());
  const cbRef = useRef({});
  cbRef.current = { onChange, onSave, onImagePaste, onCaretLine };

  useImperativeHandle(ref, () => ({
    focus: () => viewRef.current?.focus(),
    getView: () => viewRef.current,
    wrap: (prefix, suffix, fallback) => viewRef.current && wrapSelection(viewRef.current, prefix, suffix, fallback),
    insertAtSelection: (text) => {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length } });
    },
    /** Replaces the first occurrence of `find` (used to swap upload placeholders). */
    replaceFirst: (find, replacement) => {
      const view = viewRef.current;
      if (!view) return;
      const at = view.state.doc.toString().indexOf(find);
      if (at < 0) return;
      view.dispatch({ changes: { from: at, to: at + find.length, insert: replacement } });
    },
    caretLine: () => {
      const view = viewRef.current;
      return view ? view.state.doc.lineAt(view.state.selection.main.head).number - 1 : 0;
    },
  }));

  // Mount once; later prop changes reach the view through refs, annotations and the mode compartment.
  useEffect(() => {
    const keys = [
      { key: 'Mod-s', preventDefault: true, run: () => (cbRef.current.onSave?.(), true) },
      { key: 'Mod-b', preventDefault: true, run: (v) => wrapSelection(v, '**', '**', '텍스트') },
      { key: 'Mod-i', preventDefault: true, run: (v) => wrapSelection(v, '*', '*', '텍스트') },
      { key: 'Mod-k', preventDefault: true, run: (v) => wrapSelection(v, '[', '](https://)', '링크 텍스트') },
      // Tab: a literal tab at a bare caret, indent for a selection; Shift+Tab outdents.
      { key: 'Tab', run: insertTab, shift: indentLess },
    ];

    const state = EditorState.create({
      doc: externalDoc?.text || '',
      extensions: [
        history(),
        keymap.of([...keys, ...historyKeymap, ...defaultKeymap]),
        indentUnit.of('\t'),
        EditorState.tabSize.of(4),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' }),
        placeholder ? placeholderExt(placeholder) : [],
        editorTheme,
        modeCompartment.current.of(modeExtension(mode)),
        EditorView.domEventHandlers({
          paste(event) {
            const items = event.clipboardData?.items;
            if (!items) return false;
            for (const item of items) {
              if (item.type && item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file && cbRef.current.onImagePaste) {
                  event.preventDefault();
                  cbRef.current.onImagePaste(file);
                  return true;
                }
              }
            }
            return false;
          },
        }),
        EditorView.updateListener.of((update) => {
          const external = update.transactions.some((tr) => tr.annotation(External));
          if (update.docChanged && !external) cbRef.current.onChange?.(update.state.doc.toString());
          if (update.selectionSet || update.docChanged) {
            cbRef.current.onCaretLine?.(update.state.doc.lineAt(update.state.selection.main.head).number - 1);
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External document replacement (a post finished loading): `externalDoc` is { text } and a new
  // object means "replace". Not a user edit, so it never raises the dirty flag.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !externalDoc) return;
    const current = view.state.doc.toString();
    if (externalDoc.text !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: externalDoc.text },
        annotations: [External.of(true)],
        selection: { anchor: 0 },
      });
    }
    view.scrollDOM.scrollTop = 0;
  }, [externalDoc]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: modeCompartment.current.reconfigure(modeExtension(mode)) });
  }, [mode]);

  return <div className="editor-cm" ref={hostRef} />;
});

export default CodeEditor;
