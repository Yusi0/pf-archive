import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchContentPosts, saveContentPost, deleteContentPost, uploadImage } from '../utils/contentApi';
import { stringifyFrontmatter } from '../utils/frontmatter';
import MarkdownRenderer from '../components/MarkdownRenderer';

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

      // Default sample with updated # delimiter custom syntax
      const defaultDate = new Date().toISOString().split('T')[0];
      setFilename(`update-${defaultDate}.md`);
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
      const slugTitle = title
        .toLowerCase()
        .replace(/[^\w\s가-힣-]/g, '')
        .replace(/\s+/g, '-');
      targetFilename = `${date}-${slugTitle || 'entry'}.md`;
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

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* Super Clean Centered Top Header Bar */}
      <header style={{
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <div style={{
          maxWidth: '1300px',
          margin: '0 auto',
          padding: '0.9rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.88rem'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}
          >
            ← Home
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {editId && (
              <button onClick={handleDelete} style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Delete
              </button>
            )}

            <button
              onClick={() => setShowHelpModal(true)}
              title="마크다운 문법 가이드"
              type="button"
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: '1px solid var(--border-subtle)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                backgroundColor: 'transparent',
                cursor: 'pointer'
              }}
            >
              ?
            </button>

            {isUploading && (
              <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>
                이미지 업로드 중...
              </span>
            )}

            <button
              onClick={handleSave}
              style={{
                color: isSaved ? 'var(--text-muted)' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}
            >
              Save (Ctrl+S)
            </button>
          </div>
        </div>
      </header>

      {/* Centered Split View Layout */}
      <div style={{
        maxWidth: '1300px',
        width: '100%',
        margin: '0 auto',
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 0
      }}>
        {/* Left: Editor Pane */}
        <div style={{
          borderRight: '1px solid var(--border-subtle)',
          padding: '1.75rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          overflowY: 'auto'
        }}>
          {/* Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setIsSaved(false); }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                width: '130px'
              }}
            />

            <input
              type="text"
              placeholder="문서 제목을 입력하세요..."
              value={title}
              onChange={(e) => { setTitle(e.target.value); setIsSaved(false); }}
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%'
              }}
            />

            <input
              type="text"
              placeholder="짧은 요약 (선택)..."
              value={summary}
              onChange={(e) => { setSummary(e.target.value); setIsSaved(false); }}
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => { setContent(e.target.value); setIsSaved(false); }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Markdown 문서 내용을 작성하세요..."
            style={{
              flex: 1,
              width: '100%',
              minHeight: '460px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.94rem',
              lineHeight: 1.85,
              color: 'var(--text-primary)',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none'
            }}
          />
        </div>

        {/* Right: Live Preview Pane */}
        <div style={{
          padding: '1.75rem 1.5rem',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-primary)'
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginBottom: '1rem'
          }}>
            PREVIEW
          </div>

          <article>
            <header className="article-header">
              <h1 className="article-title">{title || '제목 없음'}</h1>
              <div className="article-meta-bar">
                <span>{date}</span>
              </div>
            </header>

            <MarkdownRenderer content={content} />
          </article>
        </div>
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
