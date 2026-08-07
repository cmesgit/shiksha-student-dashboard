// components/MasteryBar.jsx
//
// The mastery progress bar + sentence, reused verbatim across the Skill Dev
// Dashboard rebook card, Explore's pledge strip, and My courses cards
// (design_handoff_skilldev/README.md — "Book another session" / "My courses").
//
// Two variants, per the README's own two treatments of the same concept:
//   "hero"    — dashboard rebook card: track --skill-border, fill --skill.
//   "card"    — My courses card: amber (--skill-soft/--skill-border, fill
//               --skill-ink) while in progress, green (--success-soft/
//               --success-border, fill --success) once mastered.
export default function MasteryBar({
  progress, target, mastered, variant = "card", sentence, height = 7,
}) {
  const pct = target > 0 ? Math.min(100, Math.round((progress / target) * 100)) : 0;
  const track = variant === "hero" ? "var(--skill-border)"
    : mastered ? "var(--success-border)" : "var(--skill-border)";
  const fill = variant === "hero" ? "var(--skill)"
    : mastered ? "var(--success)" : "var(--skill-ink)";
  // Card variant renders standalone on a plain white course card, so it needs
  // its own tinted panel — the hero variant already sits inside one
  // (Dashboard's amber "Book another session" card) and would double up.
  const labelColor = mastered ? "var(--sk-success-deep)" : "var(--sk-accent-text-on-tint)";

  const bar = (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 6, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap",
        color: variant === "card" ? labelColor : "var(--ink-muted)",
      }}>
        <span>{progress}/{target} sessions</span>
      </div>
      <div style={{
        height, borderRadius: "var(--r-pill)", background: track, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: "var(--r-pill)",
          background: fill, transition: "width .3s ease",
        }} />
      </div>
      {sentence && (
        <p style={{
          margin: "7px 0 0", fontSize: 11, fontWeight: 600, lineHeight: 1.45,
          color: variant === "card" ? labelColor : "var(--ink-2)",
          textWrap: "pretty",
        }}>{sentence}</p>
      )}
    </div>
  );

  if (variant !== "card") return bar;

  return (
    <div style={{
      background: mastered ? "var(--success-soft)" : "var(--skill-soft)",
      border: `1px solid ${mastered ? "var(--success-border)" : "var(--skill-border)"}`,
      borderRadius: 12, padding: "11px 12px",
    }}>
      {bar}
    </div>
  );
}
