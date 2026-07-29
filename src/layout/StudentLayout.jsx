import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Breadcrumbs from "../components/Breadcrumbs";
import { useCourse } from "../contexts/CourseContext";
import { useAuth } from "../contexts/AuthContext";
import useSwipeBack from "../utils/useSwipeBack";
import "../styles/studentLayout.css";

export default function StudentLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { activeTrack } = useCourse();
  const { context, activeProfile } = useAuth();
  // Remount the routed page subtree when the active identity changes. An
  // in-place profile switch (learner→learner) does NOT reload, so without this
  // the current page keeps rendering the previous profile's data until the
  // user navigates. Keying the page container forces a fresh mount + refetch.
  const identityKey = `${context ?? ""}:${activeProfile?.id ?? ""}`;

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
        <div className="studentLayout__page studentLayout__page--live" key={identityKey}>
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
        <div className="studentLayout__page page-fade" key={`${identityKey}:${location.pathname}`}>
          <Breadcrumbs />
          <Outlet />
        </div>
      </div>
    </div>
  );
}