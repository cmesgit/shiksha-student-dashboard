/**
 * TrackSwitcher.jsx — Academy ⟷ Skill-dev slider for the student header.
 * Active side is teal on Academy, orange on Skill Dev (rd-switch styling).
 *
 * Clicking a side flips the dashboard's active track via CourseContext:
 *   • If the student has a course in that track → select it (course-driven).
 *   • If not (dev / no enrollment) → set a manual track override so the
 *     switch still works and you can preview both sides.
 * Always rendered, even with zero enrolled courses.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RiGraduationCapFill, RiSparkling2Fill } from "react-icons/ri";
import { useCourse } from "../contexts/CourseContext";
import { courseTrack, enrolledTracks } from "../utils/trackFromCourses";
import "../styles/trackSwitcher.css";

const TRACKS = [
  { key: "academy", label: "Academy",   Icon: RiGraduationCapFill },
  { key: "skill",   label: "Skill Dev", Icon: RiSparkling2Fill },
];

export default function TrackSwitcher() {
  const { courses = [], activeTrack, selectCourse, setTrack } = useCourse();
  const navigate = useNavigate();

  const enrolled = useMemo(() => enrolledTracks(courses), [courses]);
  const firstCourseOf = (track) => courses.find((c) => courseTrack(c) === track);

  const onClick = (key) => {
    if (key === activeTrack) return;
    const c = firstCourseOf(key);
    if (c) selectCourse(c.id);   // real course → course-driven (clears override)
    else if (setTrack) setTrack(key); // no course → manual override (dev)
    // Switching track only changes context state; the *view* is route-driven.
    // Without navigating, a deep page (e.g. /my-courses/:id) wouldn't follow
    // the switch until a sidebar link was clicked. Go to the dashboard home so
    // the index page re-renders for the newly active track.
    navigate("/");
  };

  const ctx = activeTrack === "skill" ? "ctx-skill" : "";

  return (
    <div className={`trackSwitcher ${ctx}`} role="tablist" aria-label="Learning track" title="Switch dashboard">
      {TRACKS.map(({ key, label, Icon }) => {
        const active = key === activeTrack;
        const isEnrolled = enrolled.has(key);
        return (
          <button
            key={key} type="button" role="tab" aria-selected={active}
            className={["trackSwitcher__seg", active ? "is-active" : ""].join(" ").trim()}
            title={isEnrolled ? label : `${label} (no course enrolled yet)`}
            onClick={() => onClick(key)}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
