import React, { useState, useLayoutEffect } from 'react';

const SCALES = [0.9, 1, 1.12, 1.25, 1.4];
const DEFAULT_INDEX = 1;

/**
 * Two-button font scale stepper that persists its choice.
 * Writes the chosen scale to a CSS variable on <html>; the stylesheet decides what it scales.
 * (The reading scale is also applied pre-paint from index.html.)
 */
export default function FontSizeControl({ storageKey, cssVar, smallerLabel, largerLabel }) {
  const [index, setIndex] = useState(() => {
    try {
      const idx = SCALES.indexOf(parseFloat(localStorage.getItem(storageKey)));
      return idx >= 0 ? idx : DEFAULT_INDEX;
    } catch {
      return DEFAULT_INDEX;
    }
  });

  useLayoutEffect(() => {
    const scale = SCALES[index];
    document.documentElement.style.setProperty(cssVar, String(scale));
    try {
      localStorage.setItem(storageKey, String(scale));
    } catch {
      // Storage unavailable (private mode etc.): the setting still applies for this session.
    }
  }, [index, storageKey, cssVar]);

  return (
    <div className="size-control" role="group" aria-label={`${smallerLabel} / ${largerLabel}`}>
      <button
        type="button"
        className="size-btn size-btn-small"
        onClick={() => setIndex((i) => Math.max(0, i - 1))}
        disabled={index === 0}
        aria-label={smallerLabel}
        title={smallerLabel}
      >
        가
      </button>
      <button
        type="button"
        className="size-btn size-btn-large"
        onClick={() => setIndex((i) => Math.min(SCALES.length - 1, i + 1))}
        disabled={index === SCALES.length - 1}
        aria-label={largerLabel}
        title={largerLabel}
      >
        가
      </button>
    </div>
  );
}
