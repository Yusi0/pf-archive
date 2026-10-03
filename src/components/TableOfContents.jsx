import React, { useState, useEffect } from 'react';
import { generateHeadingSlug } from '../utils/customMarkdownParser';

export default function TableOfContents({ content }) {
  const [activeId, setActiveId] = useState('');

  if (!content) return null;

  const headingLines = content.split('\n').filter((line) => {
    return /^#{1,4}\s+/.test(line.trim());
  });

  if (headingLines.length === 0) return null;

  const slugCounts = new Map();
  const headings = headingLines.map((line) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (!match) return null;

    const level = match[1].length;
    const rawText = match[2].trim();
    const id = generateHeadingSlug(rawText, slugCounts);

    // Clean display text for TOC list
    const cleanDisplay = rawText
      .replace(/\[[rgbyp]#([^\]]+)\]/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/[\[\]]/g, '')
      .trim();

    return { level, text: cleanDisplay, id };
  }).filter(Boolean);

  // Track active heading on scroll
  useEffect(() => {
    const handleScroll = () => {
      const headingElements = headings
        .map(h => document.getElementById(h.id))
        .filter(Boolean);

      if (headingElements.length === 0) return;

      const scrollPos = window.scrollY + 140;
      let currentActive = headingElements[0].id;

      for (let i = 0; i < headingElements.length; i++) {
        const el = headingElements[i];
        if (el.offsetTop <= scrollPos) {
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
  }, [content]);

  const handleLinkClick = (e, id) => {
    const target = document.getElementById(id);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    }
  };

  return (
    <nav className="sidebar-toc" aria-label="Table of Contents">
      <div className="sidebar-toc-title">
        INDEX
      </div>

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
                onClick={(e) => handleLinkClick(e, heading.id)}
                title={heading.text}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
