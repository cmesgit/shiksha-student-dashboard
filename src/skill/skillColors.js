// skill/skillColors.js
//
// design_handoff_skilldev/README.md's deterministic avatar palette (6 slots,
// --sk-avatar-1..6 in shared/tokens.css). Split out of skillUI.jsx (a
// component file) purely to satisfy react-refresh/only-export-components —
// <Avatar> and the intro-video thumbnail gradient both need this same hash.
const PAL = [
  "var(--sk-avatar-1)", "var(--sk-avatar-2)", "var(--sk-avatar-3)",
  "var(--sk-avatar-4)", "var(--sk-avatar-5)", "var(--sk-avatar-6)",
];

export const avatarColor = (name = "") =>
  PAL[((name.charCodeAt(0) || 0) + name.length) % PAL.length];
