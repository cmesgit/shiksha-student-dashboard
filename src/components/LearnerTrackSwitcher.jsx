// src/components/LearnerTrackSwitcher.jsx
// ──────────────────────────────────────────────────────────────────────────
// Academy ⟷ Skill Dev toggle for the LEARNER (student) header.
//
// Why this exists: the header previously mounted the *teacher* TrackSwitcher,
// which reads teacherInfo and renders nothing for a pure learner — so a
// learner had no way to switch tracks and was stuck on whatever track
// CourseContext happened to derive. This is the learner-facing toggle.
//
// Behaviour:
//   • Both pills are always switchable — a learner can open either track.
//     Enrollment gates the *content* inside a track (the Academy dashboard
//     shows a "no course" prompt, the Skill side shows its browse pages),
//     not the toggle itself.
//   • Clicking a track calls setTrack(key) on CourseContext (persisted to
//     localStorage) and navigates to "/", because the Dashboard branches on
//     activeTrack and renders the correct home for each track. Returning to
//     "/" also avoids leaving a deep route from the other track mounted.
//   • The highlighted pill follows activeTrack from CourseContext.
//
// Styling: uses the base .trackSwitcher class (teal active pill) — no context
// modifier, to match the learner palette.
// ──────────────────────────────────────────────────────────────────────────

import { useNavigate } from "react-router-dom";
import { useCourse } from "../contexts/CourseContext";
import { RiGraduationCapFill, RiSparkling2Fill } from "react-icons/ri";
import "../styles/trackSwitcher.css";

const TRACKS = [
  { key: "academy", label: "Academy",   Icon: RiGraduationCapFill },
  { key: "skill",   label: "Skill Dev", Icon: RiSparkling2Fill    },
];

export default function LearnerTrackSwitcher() {
  const navigate = useNavigate();
  const { activeTrack, setTrack } = useCourse();

  const handleClick = (key) => {
    if (key === activeTrack) return;
    setTrack(key);
    // Dashboard renders the correct home per track; always return there so a
    // deep route belonging to the other track isn't left mounted underneath.
    navigate("/");
  };

  return (
    <div className="trackSwitcher" role="tablist" aria-label="Learning track">
      {TRACKS.map(({ key, label, Icon }) => {
        const active = key === activeTrack;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            className={["trackSwitcher__seg", active ? "is-active" : ""].join(" ").trim()}
            title={label}
            /* The label <span> is display:none below 600px (trackSwitcher.css),
               which also removes it from the accessibility tree — so name the
               button explicitly rather than relying on the title attribute. */
            aria-label={label}
            onClick={() => handleClick(key)}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
