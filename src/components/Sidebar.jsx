// src/components/Sidebar.jsx  (student dashboard — full replacement)
// Reads activeTrack from CourseContext and renders either the Academy
// nav or the Skill Dev nav. CSS classes from sidebar.css are kept for
// the academy side; the skill-dev side uses its own inline tokens so it
// matches the new design exactly without touching sidebar.css.

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "../styles/sidebar.css";
import logo from "../assets/Vector.svg";
import { useCourse } from "../contexts/CourseContext";

// react-icons used by the academy nav (unchanged from original)
import { MdDashboardCustomize } from "react-icons/md";
import { BsBook } from "react-icons/bs";
import { BiVideo } from "react-icons/bi";
import { FaClipboardList, FaBookOpen } from "react-icons/fa";
import { RiLiveLine, RiLockLine, RiGroupLine, RiSparkling2Fill } from "react-icons/ri";
import { FaChalkboardTeacher } from "react-icons/fa";
import { AiOutlineFileDone, AiOutlineClose } from "react-icons/ai";
import { FiHome, FiSearch, FiCalendar, FiBook, FiLayout } from "react-icons/fi";
import { HOME_URL } from "../config/urls";

/* ── Skill Dev design tokens (self-contained, no CSS file needed) ─── */
const SD = {
  bg:      "#003223",
  bgItem:  "#ff8f01",   // active nav item
  border:  "rgba(255,255,255,.08)",
  txt:     "rgba(255,255,255,.62)",
  txtOn:   "#fff",
  section: "rgba(255,255,255,.28)",
  brand:   "#ff8f01",   // subtitle colour
  forest:  "#125027",
  MH: '"Montserrat", system-ui, sans-serif',
  MP: '"Poppins", system-ui, sans-serif',
};

/* Skill Dev sidebar nav config */
const SD_NAV = [
  { id: "dash",    label: "My Dashboard", Icon: FiLayout,   to: "/"                   },
  { section: "SELF-PACED COURSES" },
  { id: "courses", label: "My Courses",   Icon: FiBook,     to: "/skill-dev/courses"  },
  { section: "LIVE 1-ON-1" },
  { id: "sessions",label: "My Sessions",  Icon: BiVideo,    to: "/skill-dev/sessions" },
  { id: "book",    label: "Book a Tutor", Icon: FiCalendar, to: "/skill-dev/book"     },
  { section: "DISCOVER" },
  { id: "explore", label: "Explore More", Icon: FiSearch,   to: "/skill-dev/explore"  },
];

/* ── Skill Dev sidebar ─────────────────────────────────────────────── */
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

/* ── Academy sidebar (original, unchanged) ─────────────────────────── */
function AcademySidebar({ setMenuOpen }) {
  const location = useLocation();

  const isSubjectsActive =
    location.pathname.startsWith("/subjects") ||
    location.pathname.startsWith("/assignments") ||
    location.pathname.startsWith("/study-material");

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <div className="sidebar__brand">
          <img src={logo} alt="Logo" className="sidebar__logoCircle" />
          <div>
            <h2 className="sidebar__title">ShikshaCom</h2>
            <p className="sidebar__tagline">Empowerment Through Education</p>
          </div>
        </div>
        <button className="sidebar__closeBtn" onClick={() => setMenuOpen(false)} type="button" aria-label="Close sidebar">
          <AiOutlineClose />
        </button>
      </div>

      <nav className="sidebar__nav">
        <NavLink className="sidebar__link" to="/" end onClick={() => setMenuOpen(false)}>
          <span className="sidebar__icon"><MdDashboardCustomize /></span>
          Dashboard
        </NavLink>

        <NavLink className="sidebar__link" to="/subjects" end onClick={() => setMenuOpen(false)}>
          <span className="sidebar__icon"><BsBook /></span>
          Subjects
        </NavLink>

        {isSubjectsActive && (
          <div className="sidebar__subMenu">
            <NavLink className="sidebar__subLink" to="/assignments" onClick={() => setMenuOpen(false)}>
              <FaClipboardList /> <span>Assignments</span>
            </NavLink>
            <NavLink className="sidebar__subLink" to="/subjects/quiz" onClick={() => setMenuOpen(false)}>
              <AiOutlineFileDone /> <span>Quiz</span>
            </NavLink>
            <NavLink className="sidebar__subLink" to="/subjects/recordings" onClick={() => setMenuOpen(false)}>
              <BiVideo /> <span>Recordings</span>
            </NavLink>
            <NavLink className="sidebar__subLink" to="/study-material" onClick={() => setMenuOpen(false)}>
              <FaBookOpen /> <span>Study Material</span>
            </NavLink>
          </div>
        )}

        <NavLink className="sidebar__link" to="/live-sessions" onClick={() => setMenuOpen(false)}>
          <span className="sidebar__icon"><RiLiveLine /></span>
          Live Sessions
        </NavLink>

        <NavLink className="sidebar__link" to="/private-sessions" onClick={() => setMenuOpen(false)}>
          <span className="sidebar__icon"><RiLockLine /></span>
          Private Sessions
        </NavLink>

        <NavLink className="sidebar__link" to="/group-sessions" onClick={() => setMenuOpen(false)}>
          <span className="sidebar__icon"><RiGroupLine /></span>
          Group Sessions
        </NavLink>

        <NavLink className="sidebar__link" to="/teachers" onClick={() => setMenuOpen(false)}>
          <span className="sidebar__icon"><FaChalkboardTeacher /></span>
          Teachers
        </NavLink>
      </nav>

      <div className="sidebar__bottom">
        <a href={HOME_URL} className="sidebar__homeBtn">
          <FiHome /> Return to Homepage
        </a>
      </div>
    </aside>
  );
}

/* ── Root export ───────────────────────────────────────────────────── */
export default function Sidebar({ setMenuOpen }) {
  const { activeTrack } = useCourse();

  if (activeTrack === "skill") {
    return <SkillDevSidebar setMenuOpen={setMenuOpen} />;
  }
  return <AcademySidebar setMenuOpen={setMenuOpen} />;
}
