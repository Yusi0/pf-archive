import React, { useState, useRef } from 'react';
import { parseInline } from '../utils/customMarkdownParser';

/**
 * Superscript Number Helper
 */
export function toSuperscript(num) {
  const sups = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return String(num).split('').map(ch => sups[ch] || ch).join('');
}

/**
 * Inline Footnote Reference Button & Popover Component
 */
export function FootnoteReference({ id, num, text }) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200); // 200ms grace period so user can move mouse onto popover
  };

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
  };

  const parsedTextHtml = parseInline(text);

  return (
    <span
      id={`fn-ref-${id}`}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <sup className="footnote-ref" style={{ marginLeft: '0.15rem' }}>
        <button
          onClick={handleClick}
          type="button"
          aria-label={`각주 ${num}`}
          style={{
            fontSize: '0.85em',
            fontWeight: 700,
            color: 'var(--text-secondary)',
            padding: '0 0.1rem',
            cursor: 'pointer',
            lineHeight: 1
          }}
        >
          {toSuperscript(num)}
        </button>
      </sup>

      {/* Popover Card */}
      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
          className="footnote-popover"
          style={{
            position: 'absolute',
            bottom: '125%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'max-content',
            maxWidth: '280px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            padding: '0.65rem 0.85rem',
            fontSize: '0.84rem',
            color: 'var(--text-primary)',
            lineHeight: 1.5,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            borderRadius: '4px',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {toSuperscript(num)}
            </span>
            <div dangerouslySetInnerHTML={{ __html: parsedTextHtml }} />
          </div>
        </div>
      )}
    </span>
  );
}

/**
 * Bottom Footnote Section Component
 */
export function FootnoteSection({ footnotes }) {
  if (!footnotes || footnotes.length === 0) return null;

  const handleScrollToRef = (e, id) => {
    e.preventDefault();
    const targetEl = document.getElementById(`fn-ref-${id}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <section
      className="markdown-footnotes"
      style={{
        marginTop: '3.5rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--border-subtle)'
      }}
    >
      <h4 style={{
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        marginBottom: '0.85rem',
        letterSpacing: '0.05em'
      }}>
        각주
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
        {footnotes.map(fn => {
          const parsedHtml = parseInline(fn.text);
          return (
            <div key={fn.id} id={`fn-${fn.id}`} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <button
                onClick={(e) => handleScrollToRef(e, fn.id)}
                type="button"
                style={{
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.95em'
                }}
                title="본문 각주 위치로 이동"
              >
                {toSuperscript(fn.num)}
              </button>
              <div
                style={{ color: 'var(--text-secondary)' }}
                dangerouslySetInnerHTML={{ __html: parsedHtml }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
