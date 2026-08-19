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
import { courseTrack } from "../utils/trackFromCourses";

/* The design's selector caret is a double chevron (up + down), 13px,
   stroke-width 2.4 — Academy Dashboard.dc.html line 576. */
const SwitchCaret = () => (
  <svg
    className="acad-side__wellCaret"
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,.6)"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
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

  // This switcher only ever renders inside the Academy sidebar — a Skill Dev
  // enrolment mixed into the list here would be confusing (it lives in a
  // different app surface, SkillDevSidebar, with its own routes) and picking
  // it would silently yank the learner into a track switch disguised as a
  // course switch. Filter to the courses that actually belong on this screen.
  const list = (courses || []).filter((c) => courseTrack(c) === "academy");
  const multiple = list.length > 1;
  // activeCourse can technically be a Skill course while this sidebar is
  // showing (a manual track override can outrun which course is selected) —
  // fall back to the first Academy course for the label in that case rather
  // than displaying a course this switcher's own list doesn't contain.
  const displayCourse =
    list.find((c) => c.id === activeCourse.id) || list[0] || activeCourse;

  // A learner can be enrolled in the SAME class under two boards (Class 10
  // CBSE and Class 10 MBSE), and the titles are then identical — there was
  // no way to tell which was selected, or which one you were switching to.
  // The board already comes down with /courses/my/ (CourseSerializer nests
  // it); it just was never rendered.
  const boardOf = (c) =>
    (typeof c?.board === "string" ? c.board : c?.board?.name) || "";

  const pick = (course) => {
    if (course.id !== activeCourse.id) selectCourse(course.id);
    setOpen(false);
    setMenuOpen?.(false);
  };

  return (
    <div className="acad-side__selector" ref={ref}>
      <button
        type="button"
        className={`acad-side__well${multiple ? " acad-side__well--interactive" : ""}`}
        onClick={() => multiple && setOpen((o) => !o)}
        aria-haspopup={multiple ? "listbox" : undefined}
        aria-expanded={multiple ? open : undefined}
        title={[displayCourse.title, boardOf(displayCourse)].filter(Boolean).join(" · ")}
        data-tour="sidebar.course-switcher"
      >
        <span className="acad-side__wellText">
          <span className="acad-side__wellLabel">Active course</span>
          <span className="acad-side__wellValue">{displayCourse.title}</span>
          {boardOf(displayCourse) && (
            <span className="acad-side__wellBoard">{boardOf(displayCourse)}</span>
          )}
        </span>
        {multiple && <SwitchCaret />}
      </button>

      {multiple && open && (
        <div className="acad-side__menu" role="listbox" aria-label="Switch course">
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={c.id === displayCourse.id}
              className={`acad-side__menuItem${c.id === displayCourse.id ? " is-active" : ""}`}
              onClick={() => pick(c)}
            >
              <span className="acad-side__menuItemTitle">{c.title}</span>
              {boardOf(c) && (
                <span className="acad-side__menuItemBoard">{boardOf(c)}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
