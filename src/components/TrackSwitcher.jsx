/**
 * TrackSwitcher.jsx — Academy ⟷ Skill-dev slider for the student dashboard.
 * Styled to match the Auth Flow prototype (rd-switch): the active side is teal
 * on Academy and orange on Skill Dev. The track the student isn't enrolled in
 * is locked and links to the homepage to buy it.
 */
import { useMemo } from "react";
import { RiGraduationCapFill, RiSparkling2Fill, RiLockLine } from "react-icons/ri";
import { useCourse } from "../contexts/CourseContext";
import { courseTrack, enrolledTracks } from "../utils/trackFromCourses";
import { ACADEMY_BROWSE_URL, SKILL_BROWSE_URL } from "../config/urls";
import "../styles/trackSwitcher.css";

const TRACKS = [
  { key: "academy", label: "Academy",   Icon: RiGraduationCapFill },
  { key: "skill",   label: "Skill Dev", Icon: RiSparkling2Fill },
];
const BROWSE = { academy: ACADEMY_BROWSE_URL, skill: SKILL_BROWSE_URL };

export default function TrackSwitcher() {
  const { courses = [], activeCourse, selectCourse } = useCourse();

  const enrolled = useMemo(() => enrolledTracks(courses), [courses]);
  const current = activeCourse
    ? courseTrack(activeCourse)
    : (enrolled.has("academy") ? "academy" : enrolled.has("skill") ? "skill" : "academy");

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
    window.location.href = BROWSE[t.key]; // locked → buy on the homepage
  };

  // Orange accent when the student is on the skill side; teal otherwise.
  const ctx = current === "skill" ? "ctx-skill" : "";

  return (
    <div className={`trackSwitcher ${ctx}`} role="tablist" aria-label="Learning track" title="Switch dashboard">
      {TRACKS.map(({ key, label, Icon }) => {
        const isEnrolled = enrolled.has(key);
        const active = isEnrolled && key === current;
        return (
          <button
            key={key} type="button" role="tab" aria-selected={active}
            className={["trackSwitcher__seg", active ? "is-active" : "", !isEnrolled ? "is-locked" : ""].join(" ").trim()}
            title={isEnrolled ? label : `Enroll in ${label} on the homepage`}
            onClick={() => onClick({ key })}
          >
            {!isEnrolled ? <RiLockLine className="trackSwitcher__lock" /> : <Icon size={13} />}
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
