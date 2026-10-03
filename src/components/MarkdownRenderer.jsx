import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { parseFullCustomMarkdown, toSuperscript } from '../utils/customMarkdownParser';
import WeaponDamageGraph from './WeaponDamageGraph';

export default function MarkdownRenderer({ content }) {
  const safeContent = content || '';
  const { fullHtml = '', footnotes = [], graphs = [] } = parseFullCustomMarkdown(safeContent);

  const [popover, setPopover] = useState(null); // { id, number, content, x, y }
  const [graphPortals, setGraphPortals] = useState([]);
  const containerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const getPopoverCoords = (triggerEl) => {
    if (!triggerEl || !containerRef.current) return { x: 0, y: 0 };
    const containerRect = containerRef.current.getBoundingClientRect();
    const triggerRect = triggerEl.getBoundingClientRect();

    return {
      x: triggerRect.left - containerRect.left + triggerRect.width / 2,
      y: triggerRect.top - containerRect.top - 6
    };
  };

  // Toggle single heading section (H1 - H6)
  const toggleHeading = (headingEl, forceState = null) => {
    if (!headingEl || !headingEl.tagName) return;
    const match = headingEl.tagName.match(/^H([1-6])$/i);
    if (!match) return;
    const level = parseInt(match[1], 10);

    const isCurrentlyCollapsed = headingEl.classList.contains('is-collapsed-heading');
    const shouldCollapse = forceState !== null ? forceState : !isCurrentlyCollapsed;

    if (shouldCollapse === isCurrentlyCollapsed) return;

    if (shouldCollapse) {
      headingEl.classList.add('is-collapsed-heading');
    } else {
      headingEl.classList.remove('is-collapsed-heading');
    }

    let next = headingEl.nextElementSibling;
    let skipLevel = null;

    while (next) {
      const nextMatch = next.tagName ? next.tagName.match(/^H([1-6])$/i) : null;
      if (nextMatch) {
        const nextLevel = parseInt(nextMatch[1], 10);
        if (nextLevel <= level) {
          // Reached a sibling or higher-level heading
          break;
        }
      }

      if (shouldCollapse) {
        // Collapsing: hide elements
        next.style.display = 'none';
      } else {
        // Expanding: restore elements, respecting sub-collapsed headings
        if (nextMatch) {
          const subLevel = parseInt(nextMatch[1], 10);
          if (skipLevel !== null && subLevel <= skipLevel) {
            skipLevel = null;
          }
          if (skipLevel === null) {
            next.style.display = '';
            if (next.classList.contains('is-collapsed-heading')) {
              skipLevel = subLevel;
            }
          }
        } else {
          if (skipLevel === null) {
            next.style.display = '';
          }
        }
      }

      next = next.nextElementSibling;
    }
  };

  // Expand parent sections when clicking internal anchor links (e.g. Table of Contents)
  useEffect(() => {
    const handleHashClick = (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;
      const hash = anchor.getAttribute('href');
      if (!hash || hash === '#') return;
      const targetId = decodeURIComponent(hash.slice(1));
      const targetEl = document.getElementById(targetId);
      if (targetEl && containerRef.current && containerRef.current.contains(targetEl)) {
        let prev = targetEl.previousElementSibling;
        const targetMatch = targetEl.tagName.match(/^H([1-6])$/i);
        let targetLevel = targetMatch ? parseInt(targetMatch[1], 10) : 7;

        while (prev) {
          const match = prev.tagName && prev.tagName.match(/^H([1-6])$/i);
          if (match) {
            const prevLevel = parseInt(match[1], 10);
            if (prevLevel < targetLevel) {
              if (prev.classList.contains('is-collapsed-heading')) {
                toggleHeading(prev, false);
              }
              targetLevel = prevLevel;
            }
          }
          prev = prev.previousElementSibling;
        }

        if (targetEl.classList.contains('is-collapsed-heading')) {
          toggleHeading(targetEl, false);
        }

        setTimeout(() => {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      }
    };

    document.addEventListener('click', handleHashClick);
    return () => {
      document.removeEventListener('click', handleHashClick);
    };
  }, []);

  // Click & Hover Event Delegation
  const handleContainerClick = (e) => {
    // 1. Hierarchical List Tree Toggle (상위/하위 리스트 아이콘 클릭 접기/펼치기)
    const treeToggle = e.target.closest('.list-tree-toggle');
    if (treeToggle) {
      e.preventDefault();
      e.stopPropagation();
      const listItem = treeToggle.closest('.list-tree-item');
      if (listItem) {
        const childWrap = listItem.querySelector(':scope > .list-children-wrap');
        if (childWrap) {
          const isCollapsed = childWrap.classList.toggle('is-collapsed');
          treeToggle.classList.toggle('is-collapsed', isCollapsed);
          treeToggle.setAttribute('aria-expanded', String(!isCollapsed));
          treeToggle.textContent = isCollapsed ? '▸' : '▾';
        }
      }
      return;
    }

    // 2. Heading click to toggle section (H1 - H6)
    const headingEl = e.target.closest('h1, h2, h3, h4, h5, h6');
    if (headingEl && containerRef.current && containerRef.current.contains(headingEl)) {
      if (e.target.closest('a')) return; // Allow normal link navigation
      e.preventDefault();
      toggleHeading(headingEl);
      return;
    }

    // 4. Footnote popover trigger
    const trigger = e.target.closest('.fn-trigger-btn');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();

      const id = trigger.getAttribute('data-fn-id');
      const targetFn = footnotes.find(fn => String(fn.id) === String(id));

      if (targetFn) {
        if (popover && String(popover.id) === String(id)) {
          setPopover(null);
        } else {
          const coords = getPopoverCoords(trigger);
          setPopover({
            id: targetFn.id,
            number: targetFn.number || `[${targetFn.num}]`,
            content: targetFn.content || targetFn.rawText,
            x: coords.x,
            y: coords.y
          });
        }
      }
    } else if (e.target.closest('.fn-popover-box')) {
      e.stopPropagation();
    } else {
      setPopover(null);
    }
  };

  const handleMouseMove = (e) => {
    const trigger = e.target.closest('.fn-trigger-btn');
    const popoverBox = e.target.closest('.fn-popover-box');

    if (trigger) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      const id = trigger.getAttribute('data-fn-id');
      const targetFn = footnotes.find(fn => String(fn.id) === String(id));

      if (targetFn && (!popover || String(popover.id) !== String(id))) {
        const coords = getPopoverCoords(trigger);
        setPopover({
          id: targetFn.id,
          number: targetFn.number || `[${targetFn.num}]`,
          content: targetFn.content || targetFn.rawText,
          x: coords.x,
          y: coords.y
        });
      }
    } else if (popoverBox) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    } else {
      if (popover && !closeTimerRef.current) {
        closeTimerRef.current = setTimeout(() => {
          setPopover(null);
          closeTimerRef.current = null;
        }, 200);
      }
    }
  };

  const handleMouseLeave = () => {
    if (popover) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        setPopover(null);
        closeTimerRef.current = null;
      }, 200);
    }
  };

  // Scroll to footnote ref from bottom footnotes list
  const handleScrollToRef = (e, id) => {
    e.preventDefault();
    const targetEl = document.getElementById(`fn-ref-${id}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Mount WeaponDamageGraph into .graph-placeholder divs
  // Because placeholders remain genuine DOM children in a single continuous container,
  // heading collapse/expand naturally folds graphs and all following content!
  useEffect(() => {
    if (!containerRef.current || !graphs || graphs.length === 0) {
      setGraphPortals([]);
      return;
    }

    const placeholders = containerRef.current.querySelectorAll('.graph-placeholder');
    const portals = [];

    placeholders.forEach(el => {
      const id = el.getAttribute('data-graph-id');
      const graphData = graphs.find(g => String(g.id) === String(id));
      if (graphData) {
        portals.push({ id, el, graphData });
      }
    });

    setGraphPortals(portals);
  }, [fullHtml, graphs]);

  return (
    <div
      ref={containerRef}
      className="markdown-body"
      style={{ position: 'relative' }}
      onClick={handleContainerClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 1. Continuous DOM container with all article HTML */}
      <div dangerouslySetInnerHTML={{ __html: fullHtml }} />

      {/* 2. Portal Weapon Damage Graphs into DOM placeholders */}
      {graphPortals.map(p =>
        ReactDOM.createPortal(
          <WeaponDamageGraph graphData={p.graphData} />,
          p.el,
          `portal-graph-${p.id}`
        )
      )}

      {/* Floating Footnote Popover Modal */}
      {popover && (
        <div
          className="fn-popover-box"
          onMouseEnter={() => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }}
          onMouseLeave={() => setPopover(null)}
          style={{
            position: 'absolute',
            top: `${popover.y}px`,
            left: `${popover.x}px`,
            transform: 'translate(-50%, -100%)',
            maxWidth: '320px',
            width: 'max-content',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            padding: '0.65rem 0.85rem',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            borderRadius: '4px',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {popover.number}
            </span>
            <div dangerouslySetInnerHTML={{ __html: popover.content }} />
          </div>
        </div>
      )}

      {/* Bottom Footnotes Section */}
      {footnotes && footnotes.length > 0 && (
        <section
          className="markdown-footnotes"
          style={{
            marginTop: '3.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          <h4 style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginBottom: '0.85rem',
            letterSpacing: '0.05em'
          }}>
            각주
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
            {footnotes.map(fn => (
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
                  {fn.number}
                </button>
                <div
                  style={{ color: 'var(--text-secondary)' }}
                  dangerouslySetInnerHTML={{ __html: fn.content }}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
