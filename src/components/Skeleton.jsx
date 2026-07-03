// src/components/Skeleton.jsx
// Lightweight shimmer placeholder. Use while data loads so the Academy never
// shows raw "Loading…" text. Variants map to .ac-skel--* in academyCommon.css.
import "../styles/academyCommon.css";

export default function Skeleton({ variant = "line", width, height, style }) {
  return (
    <span
      className={`ac-skel ac-skel--${variant}`}
      style={{ display: "block", ...(width ? { width } : {}), ...(height ? { height } : {}), ...style }}
      aria-hidden="true"
    />
  );
}
