// components/SkillModal.jsx
//
// Generic scrim+panel shell for Skill Dev modals (bundle confirm, review
// edit/delete, reschedule proposal, etc.) — design_handoff_skilldev has no
// single reusable modal component of its own in either app, so this is new.
// Uses tokens.css's existing-but-previously-unused `popIn`/`overlayIn`
// keyframes rather than introducing a third animation name.
export default function SkillModal({ open, onClose, title, children, maxWidth = 440 }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(26,44,51,.5)",
        display: "grid", placeItems: "center", zIndex: 1000,
        animation: "overlayIn .2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `min(${maxWidth}px, calc(100vw - 32px))`,
          background: "var(--surface)", borderRadius: "var(--r-2xl)",
          boxShadow: "var(--sh-modal)", padding: 24,
          animation: "popIn .25s ease both",
        }}
      >
        {title && (
          <h3 style={{
            margin: "0 0 16px", fontFamily: "var(--font-display)",
            fontSize: 15, fontWeight: 800, color: "var(--ink)",
          }}>{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
}
