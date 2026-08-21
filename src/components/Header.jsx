/**
 * student_dashboard/src/components/Header.jsx
 *
 * The design's 60px header (Academy Dashboard.dc.html lines 598–636):
 *   left  — current page title (Montserrat 800 15px) over today's long date
 *   right — track switcher, messages, notification bell, avatar
 *
 * The title comes from the active nav label via pageTitleFor(), so every page
 * is identified in the header (previously only the dashboard had a heading
 * here, and it was a greeting — the greeting now lives on the dashboard page
 * itself, as the design's H1).
 *
 * The design's Student/Teacher pill switcher is deliberately NOT reproduced:
 * it exists so one prototype file can demo both roles. Here the roles are two
 * separate apps behind separate logins, so that slot holds the real controls —
 * LearnerTrackSwitcher (Academy ⟷ Skill Dev) and ProfileSwitcher.
 */
import { useLocation, useNavigate } from "react-router-dom";
import { useCourse } from "../contexts/CourseContext";
import { useAuth } from "../contexts/AuthContext";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { RiDashboardLine, RiBookOpenLine } from "react-icons/ri";
import ProfileSwitcher from "../shared/ProfileSwitcher";
import LearnerTrackSwitcher from "./LearnerTrackSwitcher";
import "../styles/header.css";
import "../shared/ProfileSwitcher.css";
import MessageIcon from "./MessageIcon";
import NotificationBell from "./NotificationBell";
import { pageTitleFor } from "../utils/academyNav";
import { pageTitleForSkill, firstName } from "../utils/skillNav";
import { HOME_URL, TEACHER_DASHBOARD_URL as TEACHER_URL } from "../config/urls";

// "Saturday, 25 July 2026" — en-GB, matching the design's date sub-line.
const DATE_FMT = { weekday: "long", day: "numeric", month: "long", year: "numeric" };

export default function Header({ toggleMenu, menuOpen }) {
  const { activeTrack } = useCourse();
  const { activeProfile, user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isSkill = activeTrack === "skill";
  const title = isSkill
    ? pageTitleForSkill(pathname, firstName(activeProfile, user))
    : pageTitleFor(pathname);
  const todayLong = new Date().toLocaleDateString("en-GB", DATE_FMT);

  return (
    <header className={"header" + (isSkill ? " header--skill" : "")}>
      <div className="header__hamburger" data-tour="header.hamburger" onClick={toggleMenu}>
        {menuOpen ? <HiOutlineX size={26} /> : <HiOutlineMenu size={26} />}
      </div>

      <div className="header__left">
        <h1 className="header__title">{title}</h1>
        <p className="header__subtitle">{todayLong}</p>
      </div>

      <div className="header__right">
        {/* Academy ⟷ Skill Dev switch (learner) */}
        <LearnerTrackSwitcher />
        <MessageIcon to={isSkill ? "/skill-messages" : "/chat"} />
        <NotificationBell />
        <ProfileSwitcher
          compact
          teacherSignupUrl={`${HOME_URL}/signup?role=teacher`}
          learnUrl={window.location.origin}
          teachUrl={TEACHER_URL}
          quickActions={[
            { label: "Dashboard", icon: <RiDashboardLine />, onClick: () => navigate("/") },
            isSkill
              ? { label: "My sessions", icon: <RiBookOpenLine />, onClick: () => navigate("/skill-dev/sessions") }
              : { label: "My courses", icon: <RiBookOpenLine />, onClick: () => navigate("/my-courses") },
          ]}
        />
      </div>
    </header>
  );
}
