import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'pf_reading_scale';
const SCALES = [0.9, 1, 1.12, 1.25, 1.4];
const DEFAULT_INDEX = 1;

function readStoredIndex() {
  try {
    const stored = parseFloat(localStorage.getItem(STORAGE_KEY));
    const idx = SCALES.indexOf(stored);
    return idx >= 0 ? idx : DEFAULT_INDEX;
  } catch {
    return DEFAULT_INDEX;
  }
}

export default function ReadingSizeControl() {
  const [index, setIndex] = useState(readStoredIndex);

  useEffect(() => {
    const scale = SCALES[index];
    document.documentElement.style.setProperty('--reading-scale', String(scale));
    try {
      localStorage.setItem(STORAGE_KEY, String(scale));
    } catch {
      // Storage unavailable (private mode etc.): setting still applies for this session.
    }
  }, [index]);

  return (
    <div className="reading-size" role="group" aria-label="글자 크기">
      <button
        type="button"
        className="reading-size-btn reading-size-small"
        onClick={() => setIndex((i) => Math.max(0, i - 1))}
        disabled={index === 0}
        aria-label="글자 작게"
      >
        가
      </button>
      <button
        type="button"
        className="reading-size-btn reading-size-large"
        onClick={() => setIndex((i) => Math.min(SCALES.length - 1, i + 1))}
        disabled={index === SCALES.length - 1}
        aria-label="글자 크게"
      >
        가
      </button>
    </div>
  );
}
