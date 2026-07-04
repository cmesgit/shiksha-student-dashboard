// src/components/CourseSwitcher.jsx
// ──────────────────────────────────────────────────────────────────────────
// The "Switch class" control from the Academy design — a button in the sidebar
// showing the current course, with a dropdown to switch between the learner's
// enrolled courses. Wired to CourseContext:
//   activeCourse → the current label
//   courses      → the switch list
//   selectCourse(courseId) → switch (also lets the course drive the track)
//
// With a single enrolment it renders as a static course badge (no caret / no
// dropdown); with two or more it becomes the switcher. Renders nothing when the
// learner has no course yet (the empty-state placeholder covers that case).
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useCourse } from "../contexts/CourseContext";

const CapIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

export default function CourseSwitcher({ setMenuOpen }) {
  const { courses, activeCourse, selectCourse } = useCourse();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!activeCourse) return null;

  const list = courses || [];
  const multiple = list.length > 1;

  const pick = (course) => {
    if (course.id !== activeCourse.id) selectCourse(course.id);
    setOpen(false);
    setMenuOpen?.(false);
  };

  return (
    <div className="switch-class" ref={ref}>
      <button
        type="button"
        className={`switch-class-btn${multiple ? "" : " switch-class-btn--static"}`}
        onClick={() => multiple && setOpen((o) => !o)}
        aria-haspopup={multiple ? "listbox" : undefined}
        aria-expanded={multiple ? open : undefined}
        title={activeCourse.title}
      >
        <CapIcon />
        <span className="switch-class-btn__label">{activeCourse.title}</span>
        {multiple && (
          <svg className={`switch-class-btn__caret${open ? " is-open" : ""}`} viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {multiple && (
        <div className={`class-dropdown${open ? " open" : ""}`} role="listbox" aria-label="Switch course">
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={c.id === activeCourse.id}
              className={`class-option${c.id === activeCourse.id ? " active" : ""}`}
              onClick={() => pick(c)}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
