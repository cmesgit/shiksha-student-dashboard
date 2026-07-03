import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useCourse } from "../contexts/CourseContext";
import useSwipeBack from "../utils/useSwipeBack";
import "../styles/studentLayout.css";

export default function StudentLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { activeTrack } = useCourse();

  // Hide sidebar + header in live session view
  const isLiveSession = location.pathname.startsWith("/live/");

  const swipeHandlers = useSwipeBack({
    disabled: menuOpen || isLiveSession,
    minSwipeDistance: 80,
    edgeOnly: true,
    edgeSize: 28,
    mobileMaxWidth: 768,
    blockedRoutes: ["/"],
    preventScrollOnSwipe: false,
  });

  // ───── LIVE SESSION FULLSCREEN MODE ─────
  if (isLiveSession) {
    return (
      <div className="studentLayout studentLayout--live">
        <div className="studentLayout__page studentLayout__page--live">
          <Outlet />
        </div>
      </div>
    );
  }

  // ───── NORMAL LAYOUT ─────
  return (
    <div className="studentLayout" data-track={activeTrack} {...swipeHandlers}>
      {menuOpen && (
        <div
          className="mobileOverlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div
        className={`studentLayout__sidebar ${
          menuOpen ? "showSidebar" : ""
        }`}
      >
        <Sidebar setMenuOpen={setMenuOpen} />
      </div>

      <div className="studentLayout__right">
        <Header
          toggleMenu={() => setMenuOpen(!menuOpen)}
          menuOpen={menuOpen}
        />
        <div className="studentLayout__page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}