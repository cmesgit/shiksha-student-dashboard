/**
 * student_dashboard/src/components/Header.jsx  (FULL REPLACEMENT)
 *
 * Adds the ProfileSwitcher to the student header so learners can:
 *   - Switch between child profiles inline (PIN-gated)
 *   - Enter teacher mode (teacher password gated)
 *   - Reach teacher signup if no teacher identity exists
 *
 * Everything else (course picker, notification bell, my courses) is unchanged.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { IoChevronDown } from "react-icons/io5";
import { BsBook } from "react-icons/bs";
import { useCourse } from "../contexts/CourseContext";
import { useAuth } from "../contexts/AuthContext";
import ProfileSwitcher from "../shared/ProfileSwitcher";
import "../styles/header.css";
import "../shared/ProfileSwitcher.css";
import NotificationBell from "./NotificationBell";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100";

const HOME_URL = import.meta.env.VITE_HOME_URL || "https://www.shikshacom.com";
const TEACHER_URL = import.meta.env.VITE_TEACHER_URL || "https://teacher.shikshacom.com/teacher/dashboard";

export default function Header({ toggleMenu, menuOpen }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDashboard = pathname === "/";

  const dropdownRef = useRef(null);

  const { courses, activeCourse, selectCourse } = useCourse();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [myCoursesOpen, setMyCoursesOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <header className="header">
      <div className="header__hamburger" onClick={toggleMenu}>
        {menuOpen ? <HiOutlineX size={26} /> : <HiOutlineMenu size={26} />}
      </div>

      {isDashboard && (
        <div className="header__left">
          <h3 className="header__title">Welcome Back</h3>
          <p className="header__subtitle">Let's learn something new today</p>
        </div>
      )}

      <div className="header__courseWrap" ref={dropdownRef}>
        <button className="header__btn" onClick={() => setOpen((p) => !p)}>
          {activeCourse?.title || "Select Course"}
          <span className={`header__chevron ${open ? "header__chevron--up" : ""}`}>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </button>
        {open && (
          <div className="header__dropdown">
            {courses.map((course) => (
              <div key={course.id} className="header__dropdownItem" onClick={() => { selectCourse(course.id); setOpen(false); }}>
                {course.title}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="header__right" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <NotificationBell />
        {/* Profile switcher replaces the old avatar + dropdown */}
        <ProfileSwitcher
          teacherSignupUrl={`${HOME_URL}/signup?role=teacher`}
          learnUrl={window.location.origin}
          teachUrl={TEACHER_URL}
        />
      </div>
    </header>
  );
}
