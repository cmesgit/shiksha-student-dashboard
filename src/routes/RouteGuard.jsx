/**
 * src_student_dashboard/src/routes/RouteGuard.jsx
 *
 * Replaces the empty file that was here before.
 *
 * Three guards used in App.jsx:
 *
 *   RequireAuth         — user must be logged in (any context)
 *   RequireProfile      — user must be in LEARNER context (profile selected)
 *                         If they just logged in but haven't picked a profile,
 *                         send them to the marketplace profile picker.
 *   RequireComplete     — learner profile must be marked is_complete
 *                         (redirects to form-fillup on the marketplace)
 */
const HOME_URL = import.meta.env.VITE_HOME_URL || "https://www.shikshacom.com";

function hardRedirect(url) {
  window.location.href = url;
  return null;
}

// ── RequireAuth ────────────────────────────────────────────────────────────
export function RequireAuth({ auth }) {
  const { isAuthenticated, loading } = auth;
  if (loading) return null;
  if (!isAuthenticated) {
    try {
      const here = window.location.pathname + window.location.search;
      if (here.startsWith("/") && !here.startsWith("//"))
        sessionStorage.setItem("post_auth_redirect", here);
    } catch { /* */ }
    return hardRedirect(HOME_URL + "/login");
  }
  return null; // pass-through — caller renders children
}

// ── RequireProfile ──────────────────────────────────────────────────────────
/**
 * Ensures the JWT is in LEARNER context (a profile has been selected).
 * Usage in App.jsx (wraps the whole StudentLayout route):
 *
 *   <Route path="/" element={<RequireProfileWrapper><StudentLayout /></RequireProfileWrapper>} >
 *     ...
 *   </Route>
 *
 * See App.jsx for the actual wrapper component that uses this.
 */
export function checkProfileContext({ isAuthenticated, isLearnerContext, loading }) {
  if (loading) return "loading";
  if (!isAuthenticated) return "unauthenticated";
  if (!isLearnerContext) return "no_profile"; // in account or teacher context
  return "ok";
}

export function redirectForStatus(status) {
  if (status === "unauthenticated") return hardRedirect(HOME_URL + "/login");
  if (status === "no_profile") return hardRedirect(HOME_URL + "/pick-profile");
  return null;
}

// ── RequireComplete ─────────────────────────────────────────────────────────
export function checkProfileComplete({ user }) {
  return user?.profile_complete ?? user?.active_profile?.profile_complete ?? false;
}
