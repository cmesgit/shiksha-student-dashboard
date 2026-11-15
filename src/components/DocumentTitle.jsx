// DocumentTitle — keeps the browser tab title in sync with the current page
// AND the active learner profile, so it's always unambiguous which profile the
// user is in (audit finding #6). Renders nothing; mount once inside the Router
// (it uses useLocation) and AuthProvider (it uses useAuth).
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { pageTitleFor } from "../utils/academyNav";

const APP_NAME = "ShikshaCom";

// The tab title comes from the SAME table as the in-app header
// (academyNav.js's ACAD_NAV + EXTRA_TITLES) rather than a second, private
// copy. This file used to carry its own pageLabel() that just humanised the
// first path segment, which silently diverged the moment a route needed an
// explicit title: /v2 rendered "Dashboard" in the header — academyNav has an
// EXTRA_TITLES entry for it — while the browser tab said "V2".
//
// Fixed in the teacher app first; this is the parallel copy, found because
// the student /v2 tab still read "V2" after that fix. pageTitleFor falls back
// to the same humanise() this used to do, so paths that were already correct
// stay correct.

export default function DocumentTitle() {
  const { pathname } = useLocation();
  const { isAuthenticated, activeProfile } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      document.title = APP_NAME;
      return;
    }
    const who = activeProfile?.display_name || "Learner";
    document.title = `${pageTitleFor(pathname)} · ${who} — ${APP_NAME}`;
  }, [pathname, isAuthenticated, activeProfile?.display_name, activeProfile?.id]);

  return null;
}
