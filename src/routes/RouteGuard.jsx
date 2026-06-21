/**
 * src/routes/RouteGuard.jsx  ·  UPDATED — imports from config/urls.js
 */
import { LOGIN_URL, PICK_PROFILE_URL, FORM_FILLUP_URL } from "../config/urls";

function hardRedirect(url) { window.location.href = url; return null; }

export function RequireAuth({ auth }) {
  const { isAuthenticated, loading } = auth;
  if (loading) return null;
  if (!isAuthenticated) {
    try {
      const here = window.location.pathname + window.location.search;
      if (here.startsWith("/") && !here.startsWith("//"))
        sessionStorage.setItem("post_auth_redirect", here);
    } catch { /* */ }
    return hardRedirect(LOGIN_URL);
  }
  return null;
}

export function checkProfileContext({ isAuthenticated, isLearnerContext, loading }) {
  if (loading)          return "loading";
  if (!isAuthenticated) return "unauthenticated";
  if (!isLearnerContext) return "no_profile";
  return "ok";
}

export function redirectForStatus(status) {
  if (status === "unauthenticated") return hardRedirect(LOGIN_URL);
  if (status === "no_profile")      return hardRedirect(PICK_PROFILE_URL);
  return null;
}

export function checkProfileComplete({ user }) {
  return user?.profile_complete ?? user?.active_profile?.profile_complete ?? false;
}
