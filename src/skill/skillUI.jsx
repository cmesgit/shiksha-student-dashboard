// skill/skillUI.jsx
// Small shared bits used across the Skill Dev views.

import { Icon } from "./skillIcons";

const PAL = ["#0a808a", "#9c27b0", "#d97706", "#6b2410", "#b3402e", "#b3402e", "#5b6ee0"];
const initials = (name = "") =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

// Renders the teacher photo when `img` is given, else a coloured initials tile.
export function Avatar({ name = "", img, size = 44, radius, circle = false }) {
  const r = circle ? "50%" : (radius ?? Math.round(size * 0.24));
  if (img) {
    return <img src={img} alt="" style={{ width: size, height: size, borderRadius: r, objectFit: "cover", flexShrink: 0 }} />;
  }
  const bg = PAL[(name.charCodeAt(0) + name.length) % PAL.length];
  return (
    <div style={{ width: size, height: size, borderRadius: r, background: bg, color: "#fff",
      display: "grid", placeItems: "center", fontWeight: 800, fontFamily: "var(--font-head, Montserrat)",
      fontSize: Math.round(size * 0.34), flexShrink: 0 }}>{initials(name)}</div>
  );
}

export function StarRow({ n, size = 11 }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= n ? "#f5a623" : "#dcd3c4", display: "flex" }}><Icon.star size={size} /></span>
      ))}
    </span>
  );
}

export function Rating({ v, reviews }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ color: "#f5a623", display: "flex" }}><Icon.star size={12} /></span>
      <span style={{ fontSize: 12, fontWeight: 800, color: "#1a2c33" }}>{v}</span>
      {reviews != null && <span style={{ fontSize: 11, color: "#999" }}>({reviews})</span>}
    </span>
  );
}

export const inr = (n) => n.toLocaleString("en-IN");
