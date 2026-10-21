import React, { useState, useEffect, useMemo } from 'react';
import { generateHeadingSlug } from '../utils/customMarkdownParser';

function extractHeadings(content) {
  if (!content) return [];

  const slugCounts = new Map();
  return content
    .split('\n')
    .map((line) => line.trim().match(/^(#{1,4})\s+(.*)$/))
    .filter(Boolean)
    .map((match) => {
      const level = match[1].length;
      const rawText = match[2].trim();
      const id = generateHeadingSlug(rawText, slugCounts);

      // Clean display text for TOC list
      const text = rawText
        .replace(/\[[rgbyp]#([^\]]+)\]/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/[\[\]]/g, '')
        .trim();

      return { level, text, id };
    });
}

export default function TableOfContents({ content }) {
  const [activeId, setActiveId] = useState('');
  const [open, setOpen] = useState(false);

  const headings = useMemo(() => extractHeadings(content), [content]);

  // Track active heading on scroll
  useEffect(() => {
    if (headings.length === 0) return undefined;

    const handleScroll = () => {
      const headingElements = headings
        .map((h) => document.getElementById(h.id))
        .filter(Boolean);

      if (headingElements.length === 0) return;

      const scrollPos = window.scrollY + 140;
      let currentActive = headingElements[0].id;

      for (let i = 0; i < headingElements.length; i++) {
        const el = headingElements[i];
        if (el.getBoundingClientRect().top + window.scrollY <= scrollPos) {
          currentActive = el.id;
        } else {
          break;
        }
      }

      setActiveId(currentActive);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  // Mobile dropdown: close on outside click / Escape
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (!e.target.closest('.sidebar-toc')) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (headings.length === 0) return null;

  const current = headings.find((h) => h.id === activeId) || headings[0];

  const handleLinkClick = (id) => {
    setOpen(false);
    const target = document.getElementById(id);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    }
  };

  return (
    <nav className={`sidebar-toc${open ? ' is-open' : ''}`} aria-label="Table of Contents">
      {/* Mobile only: slim bar showing the current section, expands into the list */}
      <button
        type="button"
        className="toc-bar"
        aria-expanded={open}
        aria-controls="toc-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="toc-bar-label">목차</span>
        <span className="toc-bar-current">{current.text}</span>
        <span className="toc-bar-chevron" aria-hidden="true">▾</span>
      </button>

      <div id="toc-panel" className="toc-panel">
        <div className="sidebar-toc-title">INDEX</div>

        <ul className="sidebar-toc-list">
          {headings.map((heading, idx) => {
            const isActive = activeId === heading.id;
            return (
              <li
                key={idx}
                className={`sidebar-toc-item depth-${heading.level} ${isActive ? 'is-active' : ''}`}
              >
                <a
                  href={`#${heading.id}`}
                  onClick={() => handleLinkClick(heading.id)}
                  title={heading.text}
                  aria-current={isActive ? 'location' : undefined}
                >
                  {heading.text}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
