// DocumentTitle — keeps the browser tab title in sync with the current page
// AND the active learner profile, so it's always unambiguous which profile the
// user is in (audit finding #6). Renders nothing; mount once inside the Router
// (it uses useLocation) and AuthProvider (it uses useAuth).
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const APP_NAME = "ShikshaCom";

function pageLabel(pathname) {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg) return "Dashboard";
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DocumentTitle() {
  const { pathname } = useLocation();
  const { isAuthenticated, activeProfile } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      document.title = APP_NAME;
      return;
    }
    const who = activeProfile?.display_name || "Learner";
    document.title = `${pageLabel(pathname)} · ${who} — ${APP_NAME}`;
  }, [pathname, isAuthenticated, activeProfile?.display_name, activeProfile?.id]);

  return null;
}
