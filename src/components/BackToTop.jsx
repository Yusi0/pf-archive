import React, { useState, useEffect } from 'react';

const EDGE_MARGIN_PX = 480;
// Beyond this distance a smooth scroll would take too long on long posts: jump instead.
const SMOOTH_MAX_DISTANCE_PX = 6000;

function scrollToY(top) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const far = Math.abs(top - window.scrollY) > SMOOTH_MAX_DISTANCE_PX;
  window.scrollTo({ top, behavior: reduceMotion || far ? 'auto' : 'smooth' });
}

function Arrow({ down }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={down ? 'M3 6l5 5 5-5' : 'M3 10l5-5 5 5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Fixed bottom-right stack: "to top" (hidden near the top) above "to bottom" (hidden near the bottom). */
export default function BackToTop() {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  useEffect(() => {
    const update = () => {
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      setShowTop(window.scrollY > EDGE_MARGIN_PX);
      setShowBottom(maxY - window.scrollY > EDGE_MARGIN_PX);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // Content (images, collapsible headings) changes the page height without scrolling
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, []);

  const scrollToBottom = () =>
    scrollToY(document.documentElement.scrollHeight - window.innerHeight);

  return (
    <div className="scroll-fab-stack">
      <button
        type="button"
        className={`back-to-top${showTop ? ' is-visible' : ''}`}
        onClick={() => scrollToY(0)}
        aria-label="맨 위로"
        tabIndex={showTop ? 0 : -1}
      >
        <Arrow />
      </button>
      <button
        type="button"
        className={`back-to-top${showBottom ? ' is-visible' : ''}`}
        onClick={scrollToBottom}
        aria-label="맨 아래로"
        tabIndex={showBottom ? 0 : -1}
      >
        <Arrow down />
      </button>
    </div>
  );
}
