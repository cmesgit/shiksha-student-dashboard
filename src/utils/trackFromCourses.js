/**
 * trackFromCourses.js — classify the student's enrolled courses into the two
 * learning tracks the dashboard switch toggles between:
 *   "academy"  — academic classes 8–12 (Faculty side)
 *   "skill"    — skill-development courses (Guest-expert side)
 *
 * The course payload from /courses/my/ varies, so we classify defensively:
 *   1. an explicit category/type/track field that mentions "skill"
 *   2. an explicit skill flag
 *   3. academic signals (board / stream / class) → academy
 *   4. fall back to academy (the primary product)
 *
 * A track the student has no course in stays LOCKED in the switch — they
 * unlock it by buying that course from the homepage.
 */
export function courseTrack(course) {
  if (!course) return "academy";

  const hay = [
    course.category, course.course_type, course.type, course.track,
    course.kind, course.program, course.segment, course.vertical, course.stream_type,
  ]
    .filter((v) => typeof v === "string")
    .join(" ")
    .toLowerCase();

  if (/skill/.test(hay)) return "skill";
  if (course.is_skill === true || course.skill === true) return "skill";

  // Academic class courses carry board / stream / class information.
  if (
    course.board || course.board_name ||
    course.stream || course.stream_name ||
    course.grade || course.current_class || course.class_name
  ) {
    return "academy";
  }

  return "academy";
}

/** Set of tracks ("academy" | "skill") the student is enrolled in. */
export function enrolledTracks(courses = []) {
  const set = new Set();
  for (const c of courses) set.add(courseTrack(c));
  return set;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Route → track
 *
 * The chrome (sidebar nav, accents, breadcrumbs) is driven by activeTrack.
 * Deriving that ONLY from the localStorage override + active course means a
 * deep link into a track-specific page — a notification click, a shared URL,
 * a refresh — renders that page's content inside the OTHER track's chrome:
 * e.g. a Skill Dev session opened while the override says "academy" shows
 * Skill session details wrapped in the Academy learner sidebar.
 *
 * The teacher app never had this bug because it mounts two different layouts
 * per route (TeacherLayout / SkillDevLayout) — the route IS the track there.
 * These prefixes give the single-layout student app the same property.
 *
 * Only routes that are UNAMBIGUOUSLY one track are listed. Genuinely neutral
 * routes ("/", /profile, /chat, /blogs, /settings, /counseling…) are left
 * out on purpose so they keep following the user's remembered choice — that
 * also keeps LearnerTrackSwitcher working, since it navigates to "/".
 * ───────────────────────────────────────────────────────────────────────── */
const SKILL_ROUTES = ["/skill-dev", "/skill-messages", "/skill-session"];

const ACADEMY_ROUTES = [
  "/subjects", "/assignments", "/progress", "/study-material",
  "/live-sessions", "/live", "/private-sessions", "/group-sessions",
  "/quiz", "/teachers", "/my-courses", "/browse-courses",
];

// Prefix match on a path BOUNDARY, so "/live" claims "/live/42" but never
// "/live-sessions" (which is its own entry).
const onRoute = (pathname, prefix) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * The track a path belongs to, or null when the path is track-neutral and
 * the caller should fall back to the remembered override / active course.
 */
export function trackFromPath(pathname) {
  if (typeof pathname !== "string" || !pathname) return null;
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (SKILL_ROUTES.some((r) => onRoute(path, r))) return "skill";
  if (ACADEMY_ROUTES.some((r) => onRoute(path, r))) return "academy";
  return null;
}
