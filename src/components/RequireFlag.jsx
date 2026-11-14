// Route gate for an admin-flippable GlobalSettings feature flag.
//
// design_handoff_dashboards_v2 Phase D2. Built for `dashboards_v2_enabled`,
// but deliberately generic — the next flag-gated route should reuse this
// rather than hand-rolling the same three branches again.
//
// ⚠ This reads `user.feature_flags`, NOT a `featureFlags` value off the
// context, because this app's AuthContext does not expose one. The teacher
// app's does, and so does the canonical shared/src copy — this app's
// AuthContext.jsx has drifted ~177 lines behind canonical. Resolving that
// drift means running `shared/sync.mjs`, which would also overwrite
// privateSessionService.js and GroupSessionLive.jsx, both of which currently
// hold unrelated UNCOMMITTED work in this tree. So we read the flag off the
// raw /accounts/me/ payload instead: AuthContext does `setUser(data)`, so the
// whole response — feature_flags included — is already on `user`.
//
// ⚠ Fail-closed: a missing or not-yet-deployed flag reads as `undefined` →
// falsy → gate CLOSED. A frontend ahead of its backend must hide the feature,
// not reveal it.

import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RequireFlag({ flag, fallback = "/", children }) {
  const { user, loading } = useAuth();

  // While /accounts/me/ is in flight, render neither the children nor the
  // redirect — mounting the gated screen would fire its API calls before the
  // gate is known, and redirecting would bounce a legitimate user.
  if (loading) {
    return (
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "60vh", color: "var(--ink-muted)", fontSize: 14,
        }}
        aria-busy="true"
      >
        Loading…
      </div>
    );
  }

  if (!user?.feature_flags?.[flag]) return <Navigate to={fallback} replace />;
  return children;
}
