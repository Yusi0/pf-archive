import React from 'react';

// Minimal 16px stroke icons (currentColor). Decorative by default: callers label the button.
function Icon({ children, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const ArrowLeftIcon = (p) => (
  <Icon {...p}>
    <path d="M13 8H3M7 4L3 8l4 4" />
  </Icon>
);

export const ChevronLeftIcon = (p) => (
  <Icon {...p}>
    <path d="M10 3.5L5.5 8l4.5 4.5" />
  </Icon>
);

export const ImageIcon = (p) => (
  <Icon {...p}>
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <circle cx="5.5" cy="6.5" r="1" />
    <path d="M2.5 12l3.5-3.5 2.5 2.5 2-2 3 3" />
  </Icon>
);

export const ListIcon = (p) => (
  <Icon {...p}>
    <path d="M6 4.5h8M6 8h8M6 11.5h8M2.5 4.5h.01M2.5 8h.01M2.5 11.5h.01" />
  </Icon>
);

export const UndoIcon = (p) => (
  <Icon {...p}>
    <path d="M5.5 4L2.5 7l3 3M2.5 7h7a3.5 3.5 0 010 7H6" />
  </Icon>
);

export const RedoIcon = (p) => (
  <Icon {...p}>
    <path d="M10.5 4l3 3-3 3M13.5 7h-7a3.5 3.5 0 000 7H10" />
  </Icon>
);

export const ChevronDownIcon = (p) => (
  <Icon {...p}>
    <path d="M3.5 6L8 10.5 12.5 6" />
  </Icon>
);

export const ChevronRightIcon = (p) => (
  <Icon {...p}>
    <path d="M6 3.5L10.5 8 6 12.5" />
  </Icon>
);

export const SaveIcon = (p) => (
  <Icon {...p}>
    <path d="M3 3h8l2 2v8H3z" />
    <path d="M5.5 3v3.5h4V3M5.5 13V9.5h5V13" />
  </Icon>
);

export const TrashIcon = (p) => (
  <Icon {...p}>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5M6.75 7v3.5M9.25 7v3.5" />
  </Icon>
);

export const HelpIcon = (p) => (
  <Icon {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M6.3 6.4a1.75 1.75 0 1 1 2.4 1.6c-.5.25-.7.6-.7 1.1M8 11.4v.1" />
  </Icon>
);

export const CalendarIcon = (p) => (
  <Icon {...p}>
    <rect x="2.25" y="3.5" width="11.5" height="10" rx="1.75" />
    <path d="M2.25 6.75h11.5M5.5 2v3M10.5 2v3" />
  </Icon>
);

export const SyncIcon = (p) => (
  <Icon {...p}>
    <path d="M6.5 9.5l3-3M7 4.5l.8-.8a2.4 2.4 0 0 1 3.4 3.4l-.8.8M9 11.5l-.8.8a2.4 2.4 0 0 1-3.4-3.4l.8-.8" />
  </Icon>
);

export const SearchIcon = (p) => (
  <Icon {...p}>
    <circle cx="7" cy="7" r="4.25" />
    <path d="M10.25 10.25L13.5 13.5" />
  </Icon>
);
