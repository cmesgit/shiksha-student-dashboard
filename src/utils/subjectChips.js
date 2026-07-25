// Deterministic subject -> colour-slot mapping so the same subject always
// gets the same chip colour everywhere it appears (Assignments list,
// Assignment detail, …), without needing a per-subject config table.
// Slot classes are defined in CSS (e.g. `.asg-chip--0` … `.asg-chip--3`),
// keeping colour values out of inline styles per the app's CSS-file convention.

const SLOT_COUNT = 4;

function hashString(name) {
  const str = name || "";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function subjectChipSlot(name) {
  if (!name) return 0;
  return hashString(name) % SLOT_COUNT;
}

// Canonical {bg, ink} palette — the single source of truth for "same subject
// (or teacher name), same colour everywhere it appears". Anything that needs
// an inline-style colour pair (as opposed to the .asg-chip--N CSS classes
// subjectChipSlot backs) should import subjectChipPalette rather than
// hashing its own copy of this array.
const SUBJECT_PALETTE = [
  { bg: "#e6f4f6", ink: "#13899b" }, // teal
  { bg: "#e8edfb", ink: "#1d4ed8" }, // info / blue
  { bg: "#fef3ec", ink: "#c2701c" }, // warning / amber
  { bg: "#ecf8ee", ink: "#2f9d42" }, // success / green
  { bg: "#f4e6e6", ink: "#7a1c1c" }, // maroon
  { bg: "#f1e9fb", ink: "#7c3aed" }, // violet
];

export function subjectChipPalette(name) {
  return SUBJECT_PALETTE[hashString(name) % SUBJECT_PALETTE.length];
}
