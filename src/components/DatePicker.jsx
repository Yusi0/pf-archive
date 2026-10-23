import React, { useEffect, useRef, useState } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n) => String(n).padStart(2, '0');
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Today as YYYY-MM-DD in the viewer's own timezone (toISOString would give the UTC day). */
export function todayLocal() {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
}

/** { y, m (0-based), d } from a YYYY-MM-DD string, or null when it is not one. */
function parseIso(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

/**
 * A calendar popover instead of <input type="date">: the native picker cannot be opened
 * reliably from a styled button on mobile browsers. `value` / `onChange` use YYYY-MM-DD.
 */
export default function DatePicker({ value, onChange, label = '날짜' }) {
  const selected = parseIso(value);
  const today = parseIso(todayLocal());
  const start = selected ?? today;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: start.y, m: start.m });
  const rootRef = useRef(null);

  // Reopen on the month of the current value
  const toggle = () => {
    if (!open) setView({ y: start.y, m: start.m });
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
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

  const shiftMonth = (delta) => {
    setView(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });
  };

  const pick = (iso) => {
    onChange(iso);
    setOpen(false);
  };

  // 6 weeks x 7 days, starting on the Sunday on/before the 1st
  const firstWeekday = new Date(view.y, view.m, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(view.y, view.m, 1 - firstWeekday + i);
    return {
      iso: toIso(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      outside: date.getMonth() !== view.m,
    };
  });
  const selectedIso = selected ? toIso(selected.y, selected.m, selected.d) : '';
  const todayIso = toIso(today.y, today.m, today.d);

  return (
    <div className="meta-date" ref={rootRef}>
      <button
        type="button"
        className="meta-date-btn"
        onClick={toggle}
        aria-label={`${label}: ${value || '선택 안 됨'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarIcon />
        <span className="meta-date-text">{value || '날짜 선택'}</span>
      </button>

      {open && (
        <div className="datepicker" role="dialog" aria-label={`${label} 선택`}>
          <div className="datepicker-head">
            <button type="button" className="datepicker-nav" onClick={() => shiftMonth(-1)} aria-label="이전 달">
              <ChevronLeftIcon />
            </button>
            <span className="datepicker-title">{view.y}년 {view.m + 1}월</span>
            <button type="button" className="datepicker-nav" onClick={() => shiftMonth(1)} aria-label="다음 달">
              <ChevronRightIcon />
            </button>
          </div>

          <div className="datepicker-grid datepicker-weekdays" aria-hidden="true">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>

          <div className="datepicker-grid">
            {cells.map((cell) => (
              <button
                key={cell.iso}
                type="button"
                className={[
                  'datepicker-day',
                  cell.outside ? 'is-outside' : '',
                  cell.iso === todayIso ? 'is-today' : '',
                  cell.iso === selectedIso ? 'is-selected' : '',
                ].filter(Boolean).join(' ')}
                aria-pressed={cell.iso === selectedIso}
                aria-label={cell.iso}
                onClick={() => pick(cell.iso)}
              >
                {cell.day}
              </button>
            ))}
          </div>

          <div className="datepicker-foot">
            <button type="button" className="datepicker-today" onClick={() => pick(todayIso)}>
              오늘
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
