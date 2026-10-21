import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchContentPosts, saveContentPost, deleteContentPost, uploadImage } from '../utils/contentApi';
import { stringifyFrontmatter } from '../utils/frontmatter';
import MarkdownRenderer from '../components/MarkdownRenderer';
import FontSizeControl from '../components/FontSizeControl';
import { extractHeadings } from '../components/TableOfContents';
import { ArrowLeftIcon, SaveIcon, TrashIcon, HelpIcon, SyncIcon } from '../components/Icons';
import '../styles/editor.css';

export default function EditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const [filename, setFilename] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [isSaved, setIsSaved] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef(null);

  useEffect(() => {
    async function loadPost() {
      const posts = await fetchContentPosts();
      if (editId) {
        const target = posts.find(p => p.id === editId || p.slug === editId || p.filename === editId);
        if (target) {
          setFilename(target.filename || `${target.slug}.md`);
          setTitle(target.title || '');
          setDate(target.date || new Date().toISOString().split('T')[0]);
          setSummary(target.summary || '');
          setContent(target.content || '');
          setIsSaved(true);
          return;
        }
      }

      // Default sample with clean date + sequence filename
      const defaultDate = new Date().toISOString().split('T')[0];
      setFilename(`${defaultDate}-01.md`);
      setTitle('[PF Revamp] 테스트 서버 업데이트 기록');
      setDate(defaultDate);
      setSummary('');
      setContent(`
# [r#PF Revamp] 반동 물리 및 모션 개편

PF Revamp의 새로운 모션 시스템 테스트가 진행되었습니다.{^1: 9월 25일 [r#roadmap] 메시지 기준입니다.}

::: Original Message
New procedural recoil and movement inertia system is currently under testing.
:::

## 총기 스탯 비교

| bg:y#Weapon | [r#Damage] |
|---|---|
| *M16A3* | ==y#34== |

[[https://www.youtube.com/watch?v=dQw4w9WgXcQ]]
`.trim());
      setIsSaved(true);
    }

    loadPost();
  }, [editId]);

  const handleSave = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    const frontmatterData = {
      title: `"${title.replace(/"/g, '\\"')}"`,
      date: `"${date}"`,
    };
    if (summary) frontmatterData.summary = `"${summary.replace(/"/g, '\\"')}"`;

    const rawMarkdownText = stringifyFrontmatter(frontmatterData, content);

    let targetFilename = filename;
    if (!targetFilename || targetFilename.startsWith('update-')) {
      try {
        const existingPosts = await fetchContentPosts();
        const sameDatePosts = existingPosts.filter(p => p.filename && p.filename.startsWith(date));
        let seq = 1;
        while (sameDatePosts.some(p => p.filename === `${date}-${String(seq).padStart(2, '0')}.md`)) {
          seq++;
        }
        targetFilename = `${date}-${String(seq).padStart(2, '0')}.md`;
      } catch {
        targetFilename = `${date}-01.md`;
      }
    }

    try {
      await saveContentPost(targetFilename, rawMarkdownText);
      setFilename(targetFilename);
      setIsSaved(true);
    } catch (err) {
      alert(`저장 오류: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!filename) return;
    if (window.confirm(`content/${filename} 파일을 정말로 삭제하시겠습니까?`)) {
      try {
        await deleteContentPost(filename);
        navigate('/');
      } catch (err) {
        alert(`삭제 오류: ${err.message}`);
      }
    }
  };

  const handleKeyDown = (e) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Tab key: Insert tab or indent/unindent selected lines
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (start === end) {
        // Single cursor: insert tab
        const success = document.execCommand && document.execCommand('insertText', false, '\t');
        if (!success) {
          textarea.setRangeText('\t', start, end, 'end');
        }
        setContent(textarea.value);
        setIsSaved(false);
      } else {
        // Multi-line selection: indent or unindent
        const val = textarea.value;
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        let lineEnd = val.indexOf('\n', end);
        if (lineEnd === -1) lineEnd = val.length;

        const targetBlock = val.substring(lineStart, lineEnd);
        const lines = targetBlock.split('\n');

        let modifiedLines;
        if (e.shiftKey) {
          // Shift + Tab: unindent (remove leading \t or 1-4 spaces)
          modifiedLines = lines.map(line => {
            if (line.startsWith('\t')) return line.substring(1);
            if (line.startsWith('    ')) return line.substring(4);
            if (line.startsWith('  ')) return line.substring(2);
            if (line.startsWith(' ')) return line.substring(1);
            return line;
          });
        } else {
          // Tab: indent (add leading \t)
          modifiedLines = lines.map(line => '\t' + line);
        }

        const replacement = modifiedLines.join('\n');
        textarea.setSelectionRange(lineStart, lineEnd);
        const success = document.execCommand && document.execCommand('insertText', false, replacement);
        if (!success) {
          textarea.setRangeText(replacement, lineStart, lineEnd, 'select');
        } else {
          textarea.setSelectionRange(lineStart, lineStart + replacement.length);
        }
        setContent(textarea.value);
        setIsSaved(false);
      }
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

    if (!ctrlKey) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      const wrapped = `**${selectedText || '텍스트'}**`;
      setContent(content.substring(0, start) + wrapped + content.substring(end));
      setIsSaved(false);
    } else if (e.key === 'i' || e.key === 'I') {
      e.preventDefault();
      const wrapped = `*${selectedText || '텍스트'}*`;
      setContent(content.substring(0, start) + wrapped + content.substring(end));
      setIsSaved(false);
    } else if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      const wrapped = `[${selectedText || '링크 텍스트'}](https://)`;
      setContent(content.substring(0, start) + wrapped + content.substring(end));
      setIsSaved(false);
    }
  };

  const handlePaste = async (e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    let imageFile = null;

    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
          imageFile = items[i].getAsFile();
          break;
        }
      }
    }

    if (!imageFile) {
      return; // 일반 텍스트 붙여넣기 동작 유지
    }

    e.preventDefault();

    const textarea = textareaRef.current;
    const start = textarea ? textarea.selectionStart : content.length;
    const end = textarea ? textarea.selectionEnd : content.length;

    const placeholder = `![이미지 업로드 중...]()\n`;
    const newContent = content.substring(0, start) + placeholder + content.substring(end);
    setContent(newContent);
    setIsUploading(true);

    try {
      const { url, filename: uploadedFilename } = await uploadImage(imageFile);
      const markdownImage = `![${uploadedFilename}](${url})\n`;
      setContent(prev => prev.replace(placeholder, markdownImage));
      setIsSaved(false);
    } catch (err) {
      alert(`이미지 업로드 실패: ${err.message}`);
      setContent(prev => prev.replace(placeholder, ''));
    } finally {
      setIsUploading(false);
    }
  };

  const insertSyntax = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent(prev => prev + '\n' + prefix + suffix);
      setIsSaved(false);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = prefix + (selectedText || '') + suffix;

    setContent(content.substring(0, start) + replacement + content.substring(end));
    setIsSaved(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const [showHelpModal, setShowHelpModal] = useState(false);

  // Narrow screens show one pane at a time
  const [tab, setTab] = useState('edit');

  // Follow the caret: scroll the preview to the heading the caret is under
  const [syncOn, setSyncOn] = useState(() => {
    try {
      return localStorage.getItem('pf_editor_sync') !== '0';
    } catch {
      return true;
    }
  });
  const previewRef = useRef(null);
  const syncTimerRef = useRef(null);
  const lastSyncedRef = useRef(null);
  const headings = useMemo(() => extractHeadings(content), [content]);

  useEffect(() => () => clearTimeout(syncTimerRef.current), []);

  const toggleSync = () => {
    const next = !syncOn;
    setSyncOn(next);
    lastSyncedRef.current = null;
    try {
      localStorage.setItem('pf_editor_sync', next ? '1' : '0');
    } catch {
      // Storage unavailable: the toggle still works for this session.
    }
  };

  const syncPreviewToCaret = () => {
    if (!syncOn) return;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      const textarea = textareaRef.current;
      const pane = previewRef.current;
      if (!textarea || !pane || !pane.offsetParent) return; // preview hidden (narrow edit tab)

      const caretLine = textarea.value.slice(0, textarea.selectionStart).split('\n').length - 1;
      let target = null;
      for (const heading of headings) {
        if (heading.line <= caretLine) target = heading;
        else break;
      }

      const key = target ? target.id : '__top__';
      if (lastSyncedRef.current === key) return; // still in the same section: leave the preview where the reader put it
      lastSyncedRef.current = key;

      // Short hops animate; long jumps (e.g. Ctrl+End in a long post) land instantly instead of crawling.
      const scrollPaneTo = (top) => {
        const next = Math.max(0, top);
        const far = Math.abs(next - pane.scrollTop) > pane.clientHeight * 2;
        pane.scrollTo({ top: next, behavior: far ? 'auto' : 'smooth' });
      };

      if (!target) {
        scrollPaneTo(0);
        return;
      }
      const el = Array.from(pane.querySelectorAll('[id]')).find((node) => node.id === target.id);
      if (!el) return;
      scrollPaneTo(el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - 12);
    }, 150);
  };

  return (
    <div className="editor-app" data-tab={tab}>
      <header className="editor-toolbar">
        <button type="button" className="icon-btn" onClick={() => navigate('/')} aria-label="홈으로" title="홈으로">
          <ArrowLeftIcon />
        </button>

        <div className="editor-status" aria-live="polite">
          <span className="editor-filename">{filename || '새 글'}</span>
          <span className={`editor-dirty${isSaved ? '' : ' is-visible'}`} title="저장되지 않은 변경 사항" aria-hidden={isSaved}>●</span>
          {isUploading && <span className="editor-uploading">이미지 업로드 중…</span>}
        </div>

        <div className="editor-actions">
          <FontSizeControl
            storageKey="pf_editor_scale"
            cssVar="--editor-scale"
            smallerLabel="에디터 글자 작게"
            largerLabel="에디터 글자 크게"
          />
          <span className="editor-divider" aria-hidden="true" />
          <button
            type="button"
            className={`icon-btn${syncOn ? ' is-active' : ''}`}
            onClick={toggleSync}
            aria-pressed={syncOn}
            aria-label="프리뷰 따라가기"
            title="커서가 있는 제목으로 프리뷰 이동"
          >
            <SyncIcon />
          </button>
          <button type="button" className="icon-btn" onClick={() => setShowHelpModal(true)} aria-label="마크다운 문법 가이드" title="마크다운 문법 가이드">
            <HelpIcon />
          </button>
          {editId && (
            <button type="button" className="icon-btn is-danger" onClick={handleDelete} aria-label="삭제" title="삭제">
              <TrashIcon />
            </button>
          )}
          <button
            type="button"
            className={`icon-btn editor-save${isSaved ? '' : ' is-dirty'}`}
            onClick={handleSave}
            aria-label="저장"
            title="저장"
          >
            <SaveIcon />
          </button>
        </div>
      </header>

      {/* Shared meta row: sits above both panes so their bodies start at the same height */}
      <div className="editor-meta">
        <input
          type="date"
          className="meta-date"
          value={date}
          onChange={(e) => { setDate(e.target.value); setIsSaved(false); }}
          aria-label="날짜"
        />
        <input
          type="text"
          className="meta-title"
          placeholder="문서 제목을 입력하세요..."
          value={title}
          onChange={(e) => { setTitle(e.target.value); setIsSaved(false); }}
          aria-label="제목"
        />
        <input
          type="text"
          className="meta-summary"
          placeholder="짧은 요약 (선택)..."
          value={summary}
          onChange={(e) => { setSummary(e.target.value); setIsSaved(false); }}
          aria-label="요약"
        />
      </div>

      <div className="editor-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'edit'} className={`editor-tab${tab === 'edit' ? ' is-active' : ''}`} onClick={() => setTab('edit')}>
          EDIT
        </button>
        <button type="button" role="tab" aria-selected={tab === 'preview'} className={`editor-tab${tab === 'preview' ? ' is-active' : ''}`} onClick={() => setTab('preview')}>
          PREVIEW
        </button>
      </div>

      <div className="editor-split">
        <section className="editor-pane editor-pane-edit" aria-label="편집">
          <div className="editor-pane-head">EDIT</div>
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={content}
            onChange={(e) => { setContent(e.target.value); setIsSaved(false); }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onSelect={syncPreviewToCaret}
            placeholder="Markdown 문서 내용을 작성하세요..."
            spellCheck={false}
          />
        </section>

        <section className="editor-pane editor-pane-preview" aria-label="미리보기">
          <div className="editor-pane-head">PREVIEW</div>
          <div className="editor-preview-scroll" ref={previewRef}>
            <article className="editor-preview-col">
              <header className="article-header">
                <h1 className="article-title">{title || '제목 없음'}</h1>
                <div className="article-meta-bar">
                  <span>{date}</span>
                </div>
              </header>

              <MarkdownRenderer content={content} />
            </article>
          </div>
        </section>
      </div>

      {/* Markdown Help Modal Popover */}
      {showHelpModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setShowHelpModal(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              width: '100%',
              maxWidth: '540px',
              maxHeight: '82vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '6px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Markdown 문법 가이드
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                style={{ color: 'var(--text-muted)', fontSize: '1.1rem', padding: '0 0.4rem', cursor: 'pointer' }}
                title="닫기"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  1. 기본 서식 (Basic Formatting)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  <div><code>*이탤릭*</code></div>
                  <div><code>**볼드**</code></div>
                  <div><code>__밑줄__</code></div>
                  <div><code>***볼드 이탤릭***</code></div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  2. 텍스트 색상 (7-Color Palette)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  코드: <code>r</code>(빨강), <code>o</code>(주황), <code>y</code>(노랑), <code>g</code>(초록), <code>b</code>(파랑), <code>i</code>(인디고), <code>p</code>(보라)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  <code>[r#텍스트]</code>
                  <code>[o#텍스트]</code>
                  <code>[y#텍스트]</code>
                  <code>[g#텍스트]</code>
                  <code>[b#텍스트]</code>
                  <code>[i#텍스트]</code>
                  <code>[p#텍스트]</code>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  3. 형광펜 하이라이트 (Highlights)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  <code>==기본 하이라이트==</code>
                  <code>==r#빨간 하이라이트==</code>
                  <code>==y#노란 하이라이트==</code>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  4. 표 셀 배경색 (Table Cell Background)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  표 안 셀 전체 배경색 설정:
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  <code>| bg:r#빨간 셀 | bg:g#초록 셀 |</code>
                  <br />
                  <code>| [bg:b#파란 셀] | [bg:y#노란 셀] |</code>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  5. 본문 각주 (Inline Footnote)
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  <code>본문 문구입니다.&#123;^1: 각주 설명 내용&#125;</code>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  6. 접기 블록 (Collapsible)
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                  <code>{`::: 제목\n접힌 내부 내용\n:::`}</code>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  7. 미디어 첨부 (Media Embed)
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  <code>[[https://youtube.com/watch?v=...]]</code>
                  <br />
                  <code>[[https://example.com/video.mp4]]</code>
                  <br />
                  <code>[[https://example.com/image.png]]</code>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  8. 무기 데미지 그래프 (:::graph)
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', whiteSpace: 'pre-wrap', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '3px' }}>
                  <code>{`:::graph\n@M16A3\n40 @ 50\n34 @ 100\n20 @ 150\n1.4, 1.1, 1.0\n:::`}</code>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  9. 단축키 (Shortcuts)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div><code>Ctrl + S</code> : 저장</div>
                  <div><code>Ctrl + B</code> : 굵게 (Bold)</div>
                  <div><code>Ctrl + I</code> : 이탤릭</div>
                  <div><code>Ctrl + K</code> : 링크 삽입</div>
                  <div><code>Ctrl + V</code> : 이미지 붙여넣기</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
