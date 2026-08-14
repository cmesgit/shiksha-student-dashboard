import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Breadcrumbs from "../components/Breadcrumbs";
import { useCourse } from "../contexts/CourseContext";
import { useAuth } from "../contexts/AuthContext";
import useSwipeBack from "../utils/useSwipeBack";
import { SkillToastProvider } from "../components/SkillToast";
import "../styles/studentLayout.css";

export default function StudentLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { activeTrack, setTrack } = useCourse();
  const { context, activeProfile } = useAuth();

  // Cross-app handoff: shiksha-frontend's expert-profile booking flow does a
  // full page navigate (different origin, no shared localStorage) and can't
  // call setTrack() itself — it signals via ?track=skill instead. Consume it
  // once so a fresh landing on e.g. /skill-dev/sessions?track=skill actually
  // shows the Skill Dev dashboard afterward, not the academy default.
  useEffect(() => {
    const wanted = new URLSearchParams(location.search).get("track");
    if (wanted === "academy" || wanted === "skill") {
      setTrack(wanted);
      const params = new URLSearchParams(location.search);
      params.delete("track");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
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
          {/* Skill Dev screens are shallow (2 levels deep, max) and the
              design has no breadcrumb anywhere — Academy keeps it. */}
          {activeTrack !== "skill" && <Breadcrumbs />}
          {/* Mounted app-wide (this layout serves both Academy and Skill
              tracks, no separate Skill Dev layout component exists here)
              rather than adding a new wrapper — Academy pages simply never
              call useSkillToast(). */}
          <SkillToastProvider>
            <Outlet />
          </SkillToastProvider>
        </div>
      </div>
    </div>
  );
}