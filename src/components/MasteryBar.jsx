// components/MasteryBar.jsx
//
// The mastery progress bar, ported per-instance from
// design_handoff_skilldev/Skill Dev Student.dc.html. The 4 call sites each
// specify their own panel size, colour and element order — dashboard rebook
// (dc:120-134, unwrapped hero), Book-a-tutor summary (dc:531-539, radius 12
// pad 12/13, bar-then-note), Expert profile (dc:336-344, radius 18 pad
// 18/20, note-then-bar) and My courses (dc:1195-1201, radius 12 pad 11/12,
// bar-then-note-then-button) — so this takes them as explicit props instead
// of guessing one shared shape.
export default function MasteryBar({
  progress, target, mastered,
  variant = "panel",        // "hero" (no wrapping panel) | "panel" (tinted box)
  radius = 12,
  padding = "12px 13px",
  noteFirst = false,
  countFormat = "slash",     // "slash" → "N/M sessions" (dc:1199) · "of" → "N of M" (dc:1403)
  sentence,
  sentenceSize = 11,
  sentenceWeight = 600,
  sentenceLineHeight = 1.45,
  footer,
  style,
}) {
  const pct = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
  const track = mastered ? "var(--success-border)" : "var(--skill-border)";
  const fill = variant === "hero" ? "var(--skill)" : mastered ? "var(--success)" : "var(--skill-ink)";
  const textColor = mastered ? "var(--sk-success-deep)" : "var(--sk-accent-text-on-tint)";
  const countText = countFormat === "of" ? `${progress} of ${target}` : `${progress}/${target} sessions`;

  const barRow = (
    <div style={{ display: "flex", alignItems: "center", gap: variant === "hero" ? 10 : 9 }}>
      <div style={{ flex: 1, height: variant === "hero" ? 7 : 6, borderRadius: 100, overflow: "hidden", background: track }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 100, background: fill }} />
      </div>
      <span style={{ fontSize: variant === "hero" ? 11 : 10.5, fontWeight: 700, whiteSpace: "nowrap", color: textColor }}>
        {countText}
      </span>
    </div>
  );

  const note = sentence != null && (
    <p style={{
      margin: noteFirst ? 0 : "7px 0 0",
      fontSize: sentenceSize, fontWeight: sentenceWeight, lineHeight: sentenceLineHeight,
      color: textColor,
    }}>{sentence}</p>
  );

  if (variant === "hero") {
    return (
      <div style={style}>
        <div style={{ maxWidth: 420 }}>{barRow}</div>
        {note && <div style={{ marginTop: 7 }}>{note}</div>}
      </div>
    );
  }

  return (
    <div style={{
      background: mastered ? "var(--success-soft)" : "var(--skill-soft)",
      border: `1px solid ${mastered ? "var(--success-border)" : "var(--skill-border)"}`,
      borderRadius: radius, padding, ...style,
    }}>
      {noteFirst && note}
      <div style={{ marginTop: noteFirst ? 12 : 0 }}>{barRow}</div>
      {!noteFirst && note}
      {footer}
    </div>
  );
}
