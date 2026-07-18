/**
 * student_dashboard/src/components/Header.jsx
 *
 * Header: greeting + Academy⟷Skill toggle + notifications + ProfileSwitcher.
 * The track toggle is the learner-facing LearnerTrackSwitcher, which flips
 * activeTrack in CourseContext. (The old "Select Course" dropdown stays
 * removed — the active course comes from enrollment.)
 */
import { useLocation } from "react-router-dom";
import { useCourse } from "../contexts/CourseContext";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { useAuth } from "../contexts/AuthContext";
import ProfileSwitcher from "../shared/ProfileSwitcher";
import LearnerTrackSwitcher from "./LearnerTrackSwitcher";
import "../styles/header.css";
import "../shared/ProfileSwitcher.css";
import MessageIcon from "./MessageIcon";
import NotificationBell from "./NotificationBell";
import { HOME_URL, TEACHER_DASHBOARD_URL as TEACHER_URL } from "../config/urls";

export default function Header({ toggleMenu, menuOpen }) {
  const { activeTrack } = useCourse();
  const { pathname } = useLocation();
  const isDashboard = pathname === "/";

  const { user, activeProfile, isTeacherContext } = useAuth();

  // Name to greet: active learner profile, else teacher username, else account.
  const greetName =
    (!isTeacherContext && activeProfile?.display_name) ||
    user?.username ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "";

  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <header className={"header" + (activeTrack === "skill" ? " header--skill" : "")}>
      <div className="header__hamburger" onClick={toggleMenu}>
        {menuOpen ? <HiOutlineX size={26} /> : <HiOutlineMenu size={26} />}
      </div>

      {isDashboard && (
        <div className="header__left">
          <h3 className="header__title">
            {greetName ? `${timeGreeting}, ${greetName}` : "Welcome Back"}
          </h3>
          <p className="header__subtitle">Let's learn something new today</p>
        </div>
      )}

      {/* Academy ⟷ Skill Dev switch (learner) */}
      <LearnerTrackSwitcher />

      <div className="header__right" style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
        <MessageIcon to={activeTrack === "skill" ? "/skill-messages" : "/chat"} />
        <NotificationBell />
        <ProfileSwitcher
          teacherSignupUrl={`${HOME_URL}/signup?role=teacher`}
          learnUrl={window.location.origin}
          teachUrl={TEACHER_URL}
        />
      </div>
    </header>
  );
}
