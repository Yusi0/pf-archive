import React, { useRef } from 'react';
import { undo, redo } from '@codemirror/commands';
import { ImageIcon, ListIcon, UndoIcon, RedoIcon, ChevronDownIcon } from './Icons';

/** Adds `prefix` to the caret's line, or removes it when the line already starts with it. */
function toggleLinePrefix(view, prefix) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const has = line.text.startsWith(prefix);
  view.dispatch({
    changes: has
      ? { from: line.from, to: line.from + prefix.length, insert: '' }
      : { from: line.from, insert: prefix },
  });
}

/** none -> "## " -> "### " -> none (the sizes the posts actually use) */
function cycleHeading(view) {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const match = /^(#{1,6})\s?/.exec(line.text);
  const next = !match ? '## ' : match[1].length === 2 ? '### ' : '';
  view.dispatch({ changes: { from: line.from, to: line.from + (match ? match[0].length : 0), insert: next } });
}

function insertFold(view) {
  const { from, to } = view.state.selection.main;
  const title = '제목';
  const text = `::: ${title}\n\n:::\n`;
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + 4, head: from + 4 + title.length },
    scrollIntoView: true,
  });
}

/**
 * Compact formatting bar for phones: one row, the few things that are painful to type on a touch
 * keyboard. Buttons ignore pointer-down so the editor keeps focus (and the keyboard stays up).
 */
export default function EditorToolbar({ editorRef, onPickImage, disabled }) {
  const fileRef = useRef(null);

  const run = (fn) => () => {
    const view = editorRef.current?.getView();
    if (!view) return;
    fn(view);
    view.focus();
  };

  const keepFocus = (e) => e.preventDefault();

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // picking the same photo twice should still fire
    if (file) onPickImage(file);
  };

  return (
    <div className="editor-format" role="toolbar" aria-label="서식">
      <input ref={fileRef} type="file" accept="image/*" className="editor-format-file" onChange={onFile} tabIndex={-1} />

      <button
        type="button"
        className="fmt-btn"
        aria-label="이미지 추가"
        disabled={disabled}
        onPointerDown={keepFocus}
        onClick={() => fileRef.current?.click()}
      >
        <ImageIcon size={18} />
      </button>
      <span className="fmt-divider" aria-hidden="true" />
      <button type="button" className="fmt-btn fmt-bold" aria-label="굵게" onPointerDown={keepFocus} onClick={() => editorRef.current?.wrap('**', '**', '텍스트')}>
        B
      </button>
      <button type="button" className="fmt-btn fmt-text" aria-label="제목 크기 바꾸기" onPointerDown={keepFocus} onClick={run(cycleHeading)}>
        H
      </button>
      <button type="button" className="fmt-btn" aria-label="목록" onPointerDown={keepFocus} onClick={run((v) => toggleLinePrefix(v, '- '))}>
        <ListIcon size={18} />
      </button>
      <button type="button" className="fmt-btn" aria-label="접기 블록" onPointerDown={keepFocus} onClick={run(insertFold)}>
        <ChevronDownIcon size={18} />
      </button>
      <span className="fmt-divider" aria-hidden="true" />
      <button type="button" className="fmt-btn" aria-label="되돌리기" onPointerDown={keepFocus} onClick={run(undo)}>
        <UndoIcon size={18} />
      </button>
      <button type="button" className="fmt-btn" aria-label="다시 실행" onPointerDown={keepFocus} onClick={run(redo)}>
        <RedoIcon size={18} />
      </button>
    </div>
  );
}
