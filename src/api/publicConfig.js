/**
 * The platform flags a visitor is allowed to read, from GET /api/public-config/.
 *
 * ⚠ Why not `featureFlags` from AuthContext, given this app is authenticated?
 * Because `contexts/AuthContext.jsx` is a GENERATED file — its canonical
 * source is `shared/src/contexts/AuthContext.jsx` and it is propagated by
 * `node shared/sync.mjs`. Adding a key to its DEFAULT_FEATURE_FLAGS here
 * would be silently reverted by the next sync, and editing the canonical
 * copy means syncing through a `shared/` repo currently sitting on an
 * unrelated branch with its own drift — which would drag that work into
 * this diff (root CLAUDE.md).
 *
 * Reading the public endpoint instead keeps this feature to one app.
 *
 * Deliberately NOT on `apiClient`: that instance carries a 401 interceptor
 * that can fire a session refresh, which is wrong for an anonymous endpoint.
 */
import { API_URL } from "../config/urls";

/* FAIL CLOSED — an unreachable API must not flash an unfinished surface. */
const DEFAULTS = { live_ticker_enabled: false };

let inflight = null;
let cached = null;

export function getPublicConfig() {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetch(`${API_URL}/public-config/`, {
    credentials: "omit",
    headers: { Accept: "application/json" },
  })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((body) => {
      cached = { ...DEFAULTS, ...(body || {}) };
      inflight = null;
      return cached;
    });
  return inflight;
}
