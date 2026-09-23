import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const Play = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none">
    <path d="M7 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z" />
  </svg>
);
export const Pause = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1.2" />
    <rect x="14" y="4" width="4" height="16" rx="1.2" />
  </svg>
);
export const Next = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none">
    <path d="M5 5.5v13a1 1 0 0 0 1.55.84L16 13.5v5a1 1 0 0 0 2 0v-13a1 1 0 0 0-2 0v5L6.55 4.66A1 1 0 0 0 5 5.5z" />
  </svg>
);
export const Prev = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none">
    <path d="M19 5.5v13a1 1 0 0 1-1.55.84L8 13.5v5a1 1 0 0 1-2 0v-13a1 1 0 0 1 2 0v5l9.45-5.84A1 1 0 0 1 19 5.5z" />
  </svg>
);
export const Shuffle = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="m15 15 6 6" />
    <path d="m4 4 5 5" />
  </svg>
);
export const Repeat = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);
export const RepeatOne = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    <path d="M11 10h1v4" />
  </svg>
);
export const Volume = ({ size, level = 1, ...p }: P & { level?: number }) => (
  <svg {...base(size)} {...p}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
    {level > 0 && <path d="M15.5 8.5a5 5 0 0 1 0 7" />}
    {level > 0.5 && <path d="M18.5 5.5a9 9 0 0 1 0 13" />}
  </svg>
);
export const Mute = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none" />
    <path d="m22 9-6 6" />
    <path d="m16 9 6 6" />
  </svg>
);
export const Heart = ({ size, filled = false, ...p }: P & { filled?: boolean }) => (
  <svg {...base(size)} {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.8 3 5.5 6.4 5.1c2-.2 3.7.8 5.6 3 1.9-2.2 3.6-3.2 5.6-3 3.4.4 5.2 3.7 3.9 6.7C19.5 16.4 12 21 12 21z" />
  </svg>
);
export const Search = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const Home = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m3 11 9-8 9 8" />
    <path d="M5 10v10h5v-6h4v6h5V10" />
  </svg>
);
export const Compass = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" stroke="none" />
  </svg>
);
export const Library = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 4v16" />
    <path d="M9 4v16" />
    <path d="m13.5 5 5.5 14" />
  </svg>
);
export const Sparkle = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none">
    <path d="M12 2c.6 4.6 2.4 7.4 8 8-5.6.6-7.4 3.4-8 10-.6-6.6-2.4-9.4-8-10 5.6-.6 7.4-3.4 8-8z" />
  </svg>
);
export const Queue = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 6h11" />
    <path d="M4 12h11" />
    <path d="M4 18h7" />
    <path d="M18 14v-8l3 2" />
  </svg>
);
export const Lyrics = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 5h16" />
    <path d="M4 10h10" />
    <path d="M4 15h16" />
    <path d="M4 20h8" />
  </svg>
);
export const ChevronDown = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const ChevronLeft = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);
export const ChevronRight = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const Close = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m6 6 12 12" />
    <path d="m18 6-12 12" />
  </svg>
);
export const Plus = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);
export const More = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none">
    <circle cx="5" cy="12" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="19" cy="12" r="1.8" />
  </svg>
);
export const Expand = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="m21 3-7 7" />
    <path d="m3 21 7-7" />
  </svg>
);
export const Trash = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M9 7V4h6v3" />
  </svg>
);
export const Clock = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const Settings = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
export const Check = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);
export const Wave = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 12h2l2-6 3 12 3-9 2 5 2-2h4" />
  </svg>
);
export const Note = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p} fill="currentColor" stroke="none">
    <path d="M9 3v11.55A4 4 0 1 0 11 18V7h6V3H9z" />
  </svg>
);
