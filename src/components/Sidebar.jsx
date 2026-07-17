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
import { useCourse } from "../contexts/CourseContext";
import { useAuth } from "../contexts/AuthContext";
import CourseSwitcher from "./CourseSwitcher";
import NavIcon from "./NavIcon";

import { BiVideo } from "react-icons/bi";
import { AiOutlineClose } from "react-icons/ai";
import { FiHome, FiSearch, FiLayout, FiMessageCircle, FiStar } from "react-icons/fi";
import { HOME_URL } from "../config/urls";

/* ── Skill Dev design tokens ─────────────────────────────────────── */
const SD = {
  bg:      "#431407",
  bgItem:  "#ff8f01",
  border:  "rgba(255,255,255,.08)",
  txt:     "rgba(255,255,255,.62)",
  txtOn:   "#fff",
  section: "rgba(255,255,255,.28)",
  brand:   "#ff8f01",
  forest:  "#6b2410",
  MH: '"Montserrat", system-ui, sans-serif',
  MP: '"Poppins", system-ui, sans-serif',
};

/* Skill Dev sidebar nav */
const SD_NAV = [
  { id: "dash",     label: "Skill Dashboard", Icon: FiLayout,        to: "/"                    },

  { section: "LIVE 1-ON-1" },
  { id: "sessions", label: "My Sessions",     Icon: BiVideo,         to: "/skill-dev/sessions"  },

  { section: "DISCOVER" },
  // Booking now happens inside Explore (pick a tutor → book), so there is no
  // separate "Book a Tutor" nav item.
  { id: "explore",  label: "Explore",         Icon: FiSearch,        to: "/skill-dev/explore"   },
  { id: "reviews",  label: "My Reviews",      Icon: FiStar,          to: "/skill-dev/reviews"   },

  { section: "COMMUNICATE" },
  { id: "messages", label: "Messages",        Icon: FiMessageCircle, to: "/skill-messages"      },
];

/* ── Skill Dev sidebar ───────────────────────────────────────────── */
function SkillDevSidebar({ setMenuOpen }) {
  const location = useLocation();

  return (
    <aside style={{ width: "100%", height: "100%", background: SD.bg, display: "flex", flexDirection: "column", fontFamily: SD.MP }}>
      {/* Brand */}
      <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${SD.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: SD.forest, border: "2px solid rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ color: "#fff", fontFamily: SD.MH, fontWeight: 800, fontSize: 14, letterSpacing: "-.3px", lineHeight: 1.15 }}>ShikshaCom</div>
            <div style={{ color: SD.brand, fontSize: 8.5, fontWeight: 700, letterSpacing: ".7px", textTransform: "uppercase", marginTop: 2 }}>Skill Development</div>
          </div>
        </div>
        <button className="sidebar__closeBtn" onClick={() => setMenuOpen(false)} type="button" aria-label="Close sidebar">
          <AiOutlineClose color="rgba(255,255,255,.5)" />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px", overflowY: "auto" }}>
        {SD_NAV.map((item, i) => {
          if (item.section) return (
            <div key={i} style={{ fontSize: 9, fontWeight: 700, color: SD.section, letterSpacing: ".8px", textTransform: "uppercase", padding: "12px 8px 4px" }}>
              {item.section}
            </div>
          );
          const active = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <NavLink key={item.id} to={item.to} onClick={() => setMenuOpen(false)} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "9px 10px", fontSize: 12.5, fontWeight: active ? 700 : 500,
                color: active ? SD.txtOn : SD.txt,
                background: active ? SD.bgItem : "transparent",
                borderRadius: 8, marginBottom: 1, transition: "all .15s",
              }}>
                <item.Icon size={14} />
                {item.label}
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Return to Homepage */}
      <div style={{ padding: "10px", borderTop: `1px solid ${SD.border}` }}>
        <a href={HOME_URL} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 7, color: "rgba(255,255,255,.42)", fontSize: 11.5, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", fontFamily: SD.MP }}>
          <FiHome size={13} /> Return to Homepage
        </a>
      </div>
    </aside>
  );
}

/* ── Academy sidebar — matches Academy Dashboard.html mockup ─────────
   Slate #425f7f chrome, sectioned nav (LEARN / LIVE / PRACTICE / CONNECT),
   the course switcher in the mockup's selector slot, and a user footer.
   Every item routes to a live page (Progress + Assignments now have their
   own top-level landings). */
const ACAD_NAV = [
  { section: "LEARN" },
  { l: "Dashboard", i: "home", to: "/", end: true },
  { l: "My Courses", i: "book", to: "/my-courses" },
  { l: "Subjects", i: "layers", to: "/subjects", end: true },
  { l: "Progress", i: "trend", to: "/progress" },
  { section: "LIVE" },
  { l: "Live Sessions", i: "video", to: "/live-sessions" },
  { l: "Private Sessions", i: "lock", to: "/private-sessions" },
  { l: "Group Sessions", i: "users", to: "/group-sessions" },
  { l: "Recordings", i: "play", to: "/subjects/recordings" },
  { section: "PRACTICE" },
  { l: "Assignments", i: "file", to: "/assignments" },
  { l: "Quizzes", i: "help", to: "/subjects/quiz" },
  { l: "Study Material", i: "clip", to: "/study-material" },
  { section: "CONNECT" },
  { l: "Teachers", i: "grad", to: "/teachers" },
  { l: "Messages", i: "msg", to: "/chat" },
  { l: "Counselling", i: "help", to: "/counseling" },
  { l: "Browse Courses", i: "book", to: "/browse-courses" },
];

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
  const userName =
    activeProfile?.display_name || user?.name || user?.full_name ||
    user?.username || (user?.email ? user.email.split("@")[0] : "") || "Learner";
  const userInitials = initialsOf(userName);

  return (
    <aside style={{ width: "100%", height: "100%", background: "#425f7f", display: "flex", flexDirection: "column", fontFamily: '"Poppins", system-ui, sans-serif' }}>
      {/* Brand */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,.12)", border: "2px solid rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontFamily: '"Montserrat", sans-serif', fontWeight: 800, fontSize: 14, letterSpacing: "-.3px", lineHeight: 1.15 }}>ShikshaCom</div>
          <div style={{ color: "rgba(255,255,255,.55)", fontSize: 8.5, fontWeight: 700, letterSpacing: ".8px", textTransform: "uppercase", marginTop: 2 }}>Academy</div>
        </div>
        <button onClick={() => setMenuOpen(false)} type="button" aria-label="Close sidebar" className="sidebar__closeBtn" style={{ background: "none", border: "none", color: "rgba(255,255,255,.6)", cursor: "pointer" }}>
          <AiOutlineClose />
        </button>
      </div>

      {/* Active-course selector (mockup selector slot). Renders the switch
          control when the learner has 2+ enrolments, a static badge otherwise. */}
      <CourseSwitcher setMenuOpen={setMenuOpen} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: "6px 10px", overflowY: "auto", overflowX: "hidden" }}>
        {ACAD_NAV.map((item, idx) => {
          if (item.section) {
            return (
              <div key={`s-${idx}`} style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.32)", letterSpacing: ".9px", textTransform: "uppercase", padding: "13px 8px 5px" }}>
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
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 9, width: "100%",
                textAlign: "left", padding: "9px 10px", fontSize: 12.5,
                textDecoration: "none", borderRadius: 8, marginBottom: 1, transition: "background .15s",
                background: isActive ? "rgba(255,255,255,.16)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,.62)",
                fontWeight: isActive ? 700 : 500,
              })}
            >
              <NavIcon name={item.i} size={14} />
              {item.l}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#13899b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>{userInitials}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: "#fff", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>Student</div>
        </div>
      </div>

      {/* Return to homepage */}
      <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,.12)" }}>
        <a href={HOME_URL} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 7, color: "rgba(255,255,255,.42)", fontSize: 11.5, padding: "8px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)" }}>
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
