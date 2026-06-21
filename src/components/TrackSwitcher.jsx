/**
 * TrackSwitcher.jsx — Academy ⟷ Skill-dev switch for the student dashboard.
 *
 * Enrolled tracks are selectable (selecting jumps to that track's first
 * course); a track the student isn't enrolled in is locked and links to the
 * homepage to buy it. Mirrors the teacher dashboard switch.
 */
import { useMemo } from "react";
import { RiLockLine } from "react-icons/ri";
import { useCourse } from "../contexts/CourseContext";
import { courseTrack, enrolledTracks } from "../utils/trackFromCourses";
import { ACADEMY_BROWSE_URL, SKILL_BROWSE_URL } from "../config/urls";
import "../styles/trackSwitcher.css";

const TRACKS = [
  { key: "academy", label: "Academy" },
  { key: "skill",   label: "Skill Dev" },
];
const BROWSE = { academy: ACADEMY_BROWSE_URL, skill: SKILL_BROWSE_URL };

export default function TrackSwitcher() {
  const { courses = [], activeCourse, selectCourse } = useCourse();

  const enrolled = useMemo(() => enrolledTracks(courses), [courses]);
  const current = activeCourse
    ? courseTrack(activeCourse)
    : (enrolled.has("academy") ? "academy" : enrolled.has("skill") ? "skill" : "academy");

  // Nothing enrolled yet → the dashboard is empty; no switch to show.
  if (enrolled.size === 0) return null;

  const firstCourseOf = (track) => courses.find((c) => courseTrack(c) === track);

  const onClick = (t) => {
    if (enrolled.has(t.key)) {
      if (t.key !== current) {
        const c = firstCourseOf(t.key);
        if (c) selectCourse(c.id);
      }
      return;
    }
    window.location.href = BROWSE[t.key]; // locked → buy from the homepage
  };

  return (
    <div className="trackSwitcher" role="tablist" aria-label="Learning track">
      {TRACKS.map((t) => {
        const isEnrolled = enrolled.has(t.key);
        const active = isEnrolled && t.key === current;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={[
              "trackSwitcher__seg",
              active ? "is-active" : "",
              !isEnrolled ? "is-locked" : "",
            ].join(" ").trim()}
            title={isEnrolled ? t.label : `Enroll in ${t.label} on the homepage`}
            onClick={() => onClick(t)}
          >
            {!isEnrolled && <RiLockLine className="trackSwitcher__lock" />}
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
