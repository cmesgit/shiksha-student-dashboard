// PLACEMENT: src student/components/Sidebar.jsx
// ACTION:    Replace the entire file.
//
// Changes from previous version:
//   - Added FiMessageCircle to the react-icons/fi import
//   - Added a "MESSAGES" nav item in SD_NAV pointing to /skill-messages
//   - Communication Center closure: added a "Messages" nav item to the
//     Academy sidebar too, pointing to /chat. Previously chat was reachable
//     from Academy only contextually (Teachers list, a course's "Message
//     teacher" button, TeacherDetail) with no persistent nav entry at all —
//     the cross-cutting gap the closure report calls "chat was a feature
//     bolted on, not a section of the product." /skill-messages is left
//     exactly as-is (unchanged) since it also carries the landing page's
//     ?teacherProfileId=&draft= query-string handoff.
//   - Everything else is identical

import { NavLink, useLocation } from "react-router-dom";
import "../styles/sidebar.css";
import "../styles/academySidebar.css";
import { useCourse } from "../contexts/CourseContext";
import { useAuth } from "../contexts/AuthContext";
import CourseSwitcher from "./CourseSwitcher";
import NavIcon from "./NavIcon";
import { ACAD_NAV, activeNavTo } from "../utils/academyNav";

import { BiVideo } from "react-icons/bi";
import { AiOutlineClose } from "react-icons/ai";
import { FiHome, FiSearch, FiLayout, FiMessageCircle, FiStar, FiBookOpen } from "react-icons/fi";
import { HOME_URL } from "../config/urls";

/* ── Skill Dev design tokens ─────────────────────────────────────── */
// design_handoff_skilldev: sidebar/ink is #425f7f, logo tile is the brand
// accent, "Skill Dev" subtitle is accentLight — all already correct in
// shared/tokens.css's [data-track="skill"] block (`.studentLayout` carries
// data-track), so this reads the same tokens instead of re-stating them as
// literals that can silently drift from the CSS (as `bg`/`forest`/`brand`
// had: they were still the pre-redesign dark-orange chrome).
const SD = {
  bg:      "var(--side-bg)",
  bgItem:  "var(--acc)",
  border:  "var(--side-sep)",
  txt:     "var(--side-ink-2)",
  txtOn:   "#fff",
  section: "var(--side-ink-4)",
  brand:   "var(--sk-accent-light)",
  forest:  "var(--acc)",
  MH: '"Montserrat", system-ui, sans-serif',
  MP: '"Poppins", system-ui, sans-serif',
};

/* Skill Dev sidebar nav — flat list matching design_handoff_skilldev's own
   nav exactly (Dashboard, Explore experts, My courses, My sessions,
   Messages, Reviews); no section dividers, unlike the Academy sidebar.
   Booking/profile pages are reached contextually, not from here. */
const SD_NAV = [
  { id: "dash",     label: "Dashboard",       Icon: FiLayout,        to: "/"                    },
  { id: "explore",  label: "Explore experts", Icon: FiSearch,        to: "/skill-dev/explore"   },
  { id: "courses",  label: "My courses",      Icon: FiBookOpen,      to: "/skill-dev/courses"   },
  { id: "sessions", label: "My sessions",     Icon: BiVideo,         to: "/skill-dev/sessions"  },
  { id: "messages", label: "Messages",        Icon: FiMessageCircle, to: "/skill-messages"      },
  { id: "reviews",  label: "Reviews",         Icon: FiStar,          to: "/skill-dev/reviews"   },
];

/* ── Skill Dev sidebar — Skill Dev Student.dc.html dc:28-58 ──────────
   248px, aside padding 20/14. Brand row padding 4/10/18 with a bottom
   rule; nav gap 4 margin-top 16; active pill gets the amber glow shadow;
   user footer (avatar/name/"Learner") sits above the app's own
   Return-to-Homepage link, which the design doesn't show (real nav
   need, not in the single-role mockup). */
function SkillDevSidebar({ setMenuOpen }) {
  const location = useLocation();
  const { user, activeProfile } = useAuth();
  const userName =
    activeProfile?.display_name || user?.name || user?.full_name ||
    user?.username || (user?.email ? user.email.split("@")[0] : "") || "Learner";

  return (
    <aside style={{ width: "100%", height: "100%", background: SD.bg, display: "flex", flexDirection: "column", padding: "20px 14px", fontFamily: SD.MP }}>
      {/* Brand */}
      <div style={{ padding: "4px 10px 18px", borderBottom: `1px solid ${SD.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: SD.forest, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ color: "#fff", fontFamily: SD.MH, fontWeight: 800, fontSize: 15, letterSpacing: "-.2px", lineHeight: 1.15 }}>ShikshaCom</div>
            <div style={{ color: SD.brand, fontSize: 10.5, fontWeight: 600, letterSpacing: ".8px", textTransform: "uppercase", marginTop: 2 }}>Skill Dev</div>
          </div>
        </div>
        <button className="sidebar__closeBtn" onClick={() => setMenuOpen(false)} type="button" aria-label="Close sidebar">
          <AiOutlineClose color="rgba(255,255,255,.5)" />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 16, flex: 1, overflowY: "auto" }}>
        {SD_NAV.map((item) => {
          const active = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <NavLink key={item.id} to={item.to} onClick={() => setMenuOpen(false)} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 11,
                padding: "11px 12px", fontSize: 13, fontWeight: active ? 700 : 600,
                color: active ? SD.txtOn : "rgba(255,255,255,.82)",
                background: active ? SD.bgItem : "transparent",
                boxShadow: active ? "0 4px 12px rgba(255,143,1,.35)" : "none",
                borderRadius: 11, transition: "background .15s ease",
              }}>
                <item.Icon size={14} />
                {item.label}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* User footer — dc:51-57 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 10px 4px", borderTop: `1px solid ${SD.border}` }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: SD.brand, color: "#6b2410", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          {initialsOf(userName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
          <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.6)" }}>Learner</div>
        </div>
      </div>

      {/* Return to Homepage — real nav need, the design's single-role mockup has no equivalent */}
      <div style={{ padding: "10px 10px 0" }}>
        <a href={HOME_URL} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 7, color: "rgba(255,255,255,.42)", fontSize: 11.5, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", fontFamily: SD.MP }}>
          <FiHome size={13} /> Return to Homepage
        </a>
      </div>
    </aside>
  );
}

/* ── Academy sidebar — matches Academy Dashboard.dc.html lines 560–595 ─────
   Teal (--side-bg #0f6b78) chrome, sectioned nav (LEARN / LIVE / PRACTICE /
   CONNECT), the course switcher in the design's selector slot, and a user
   footer. Styling lives in styles/academySidebar.css — the design specifies
   :hover states on the nav items and the selector well, which inline styles
   can't express. Every item routes to a live page. */
const initialsOf = (name) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "S";

function AcademySidebar({ setMenuOpen }) {
  const { user, activeProfile } = useAuth();
  const { activeCourse } = useCourse();
  const location = useLocation();
  // Which single nav item should light up — see activeNavTo's own comment
  // for why this can't be left to each <NavLink>'s own matching (Recordings/
  // Quizzes live under /subjects/... and would light up alongside Subjects).
  const activeTo = activeNavTo(location.pathname);
  const userName =
    activeProfile?.display_name || user?.name || user?.full_name ||
    user?.username || (user?.email ? user.email.split("@")[0] : "") || "Learner";
  const userInitials = initialsOf(userName);
  // The design's footer sub-line is "{role} · {class}" ("Student · Class 10").
  // Fall back to the bare role when there's no enrolment to name.
  const userRole = activeCourse?.title ? `Student · ${activeCourse.title}` : "Student";

  return (
    <aside className="acad-side">
      {/* Brand */}
      <div className="acad-side__brand">
        <div className="acad-side__mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" aria-hidden="true">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="acad-side__wordmark">
          <div className="acad-side__name">ShikshaCom</div>
          <div className="acad-side__eyebrow">Academy</div>
        </div>
        <button onClick={() => setMenuOpen(false)} type="button" aria-label="Close sidebar" className="acad-side__close">
          <AiOutlineClose />
        </button>
      </div>

      {/* Active-course selector (the design's selector slot). Renders the
          switch control when the learner has 2+ enrolments, a static well
          otherwise. */}
      <CourseSwitcher setMenuOpen={setMenuOpen} />

      {/* Nav */}
      <nav className="acad-side__nav">
        {ACAD_NAV.map((item, idx) => {
          if (item.section) {
            return (
              <div key={`s-${idx}`} className="acad-side__section">
                {item.section}
              </div>
            );
          }
          return (
            <NavLink
              key={item.l}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              // Function form deliberately ignores the `isActive` NavLink
              // would otherwise compute per-item — activeTo is the single
              // shared source of truth instead (see activeNavTo).
              className={() => `acad-side__item${item.to === activeTo ? " active" : ""}`}
            >
              <NavIcon name={item.i} size={14} />
              {item.l}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="acad-side__user">
        <div className="acad-side__avatar">{userInitials}</div>
        <div className="acad-side__userText">
          <div className="acad-side__userName">{userName}</div>
          <div className="acad-side__userRole">{userRole}</div>
        </div>
      </div>

      {/* Return to homepage */}
      <div className="acad-side__home">
        <a href={HOME_URL} className="acad-side__homeLink">
          <FiHome size={13} /> Return to Homepage
        </a>
      </div>
    </aside>
  );
}

/* ── Root export ──────────────────────────────────────────────────── */
export default function Sidebar({ setMenuOpen }) {
  const { activeTrack } = useCourse();

  if (activeTrack === "skill") {
    return <SkillDevSidebar setMenuOpen={setMenuOpen} />;
  }
  return <AcademySidebar setMenuOpen={setMenuOpen} />;
}
