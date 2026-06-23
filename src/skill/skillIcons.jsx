// skill/skillIcons.jsx
// Inline-SVG icon set used by the Skill Dev views. Mirrors the `Icon` object
// from the prototype's tokens.jsx so the ported views read the same
// (`<Icon.vid size={15} />`). Uses currentColor, so colour comes from CSS.

const S = (size, fill, body) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{body}</svg>
);

export const Icon = {
  vid:   ({ size = 16 }) => S(size, false, <><path d="m23 7-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></>),
  cal:   ({ size = 16 }) => S(size, false, <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  clock: ({ size = 16 }) => S(size, false, <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  star:  ({ size = 14 }) => S(size, true,  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />),
  msg:   ({ size = 16 }) => S(size, false, <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />),
  spark: ({ size = 16 }) => S(size, false, <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />),
  check: ({ size = 14 }) => S(size, false, <path d="M20 6 9 17l-5-5" />),
  award: ({ size = 16 }) => S(size, false, <><circle cx="12" cy="8" r="6" /><path d="M8.21 13.89 7 22l5-3 5 3-1.21-8.12" /></>),
  arrow: ({ size = 16 }) => S(size, false, <path d="M5 12h14M13 5l7 7-7 7" />),
  cap:   ({ size = 16 }) => S(size, false, <><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>),
  doc:   ({ size = 16 }) => S(size, false, <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></>),
  search:({ size = 16 }) => S(size, false, <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
};
