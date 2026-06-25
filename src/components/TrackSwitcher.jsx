// src/components/TrackSwitcher.jsx  (teacher dashboard — full implementation)
// ──────────────────────────────────────────────────────────────────────────
// Academy ⟷ Skill Dev toggle for the teacher header.
//
// Behaviour (matches the asymmetric Faculty/Guest rule):
//  • Pure FACULTY → ONE dashboard. The switcher does NOT render at all —
//    faculty accounts cannot add the Skill Dev track, so there is nothing
//    to switch to. (This is the key fix: previously faculty saw a locked
//    "Skill Dev" pill that invited them to apply, which the rule forbids.)
//  • Pure GUEST   → on Skill Dev; the Academy pill shows as an "add Faculty"
//    affordance (guest experts MAY become faculty). Clicking it deep-links
//    to the add-track signup.
//  • TYPE_BOTH    → can switch freely between the two routes.
//
// Active route decides the highlighted pill:
//   /teacher/expert* → Skill Dev active
//   anything else    → Academy active
// ──────────────────────────────────────────────────────────────────────────

import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { RiGraduationCapFill, RiSparkling2Fill, RiAddLine } from "react-icons/ri";
import { signupAddTrackUrl } from "../config/urls";
import "../styles/trackSwitcher.css";

const TRACKS = [
  { key: "academy", label: "Academy",   Icon: RiGraduationCapFill, route: "/teacher/dashboard" },
  { key: "skill",   label: "Skill Dev", Icon: RiSparkling2Fill,    route: "/teacher/expert"    },
];

export default function TrackSwitcher() {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const { teacherInfo } = useAuth();

  const isGuest   = teacherInfo?.type === "GUEST";
  const isBoth    = teacherInfo?.type === "BOTH";
  const isFaculty = !isGuest && !isBoth;

  // Pure faculty → single dashboard, no switcher. Render nothing.
  if (isFaculty) return null;

  const current = pathname.startsWith("/teacher/expert") ? "skill" : "academy";

  // BOTH can enter either dashboard. GUEST can enter Skill; Academy is an
  // "apply" affordance (allowed — guest may become faculty).
  const canAccess = (key) => (isBoth ? true : key === "skill");

  const handleClick = (track) => {
    if (!canAccess(track.key)) {
      // GUEST clicking Academy → start the add-Faculty application.
      window.location.href = signupAddTrackUrl("academy");
      return;
    }
    if (track.key === current) return;
    navigate(track.route);
  };

  return (
    <div className="trackSwitcher ctx-teacher" role="tablist" aria-label="Teaching track">
      {TRACKS.map(({ key, label, Icon, route }) => {
        const accessible = canAccess(key);
        const active     = key === current;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            className={[
              "trackSwitcher__seg",
              active      ? "is-active" : "",
              !accessible ? "is-apply"  : "",
            ].join(" ").trim()}
            title={accessible ? label : "Apply to also teach as Faculty"}
            onClick={() => handleClick({ key, route })}
          >
            {!accessible ? <RiAddLine className="trackSwitcher__add" /> : <Icon size={13} />}
            <span>{accessible ? label : "Add Faculty"}</span>
          </button>
        );
      })}
    </div>
  );
}
