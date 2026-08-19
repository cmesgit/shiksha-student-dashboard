// The Academy sidebar's nav structure, and the page title derived from it.
//
// The design's header shows "the current page title" on the left, and its
// routing section derives that title from the active nav label — so the nav
// array is the single source of truth for both the sidebar and the header
// (previously the header had no title at all on any page except the
// dashboard, and DocumentTitle humanised the first path segment, which
// rendered "/subjects/quiz" as "Subjects").

export const ACAD_NAV = [
  { section: "LEARN" },
  { l: "Dashboard", i: "home", to: "/", end: true },
  { l: "Subjects", i: "layers", to: "/subjects" },
  { l: "Progress", i: "trend", to: "/progress" },
  { section: "LIVE" },
  { l: "Live Sessions", i: "video", to: "/live-sessions" },
  { l: "Private Sessions", i: "lock", to: "/private-sessions" },
  { l: "Group Sessions", i: "users", to: "/group-sessions" },
  { l: "Recordings", i: "play", to: "/subjects/recordings" },
  { section: "PRACTICE" },
  { l: "Assignments", i: "file", to: "/assignments" },
  { l: "Quizzes", i: "help", to: "/subjects/quiz" },
  { l: "Study Material", i: "clip", to: "/study-material" },
  { l: "My Courses", i: "book", to: "/my-courses" },
  { section: "CONNECT" },
  { l: "Teachers", i: "grad", to: "/teachers" },
  { l: "Messages", i: "msg", to: "/chat" },
];

// Pages reachable outside the sidebar (profile menu, notification deep links,
// the course catalogue) still need a header title.
const EXTRA_TITLES = [
  { to: "/browse-courses", l: "Browse Courses" },
  { to: "/counseling", l: "Counselling" },
  { to: "/private-details", l: "Private Details" },
  { to: "/change-password", l: "Change Password" },
  { to: "/profile", l: "Profile" },
];

// Longest path first, so /subjects/recordings and /subjects/quiz win over
// /subjects rather than being swallowed by it.
const MATCHERS = [...ACAD_NAV.filter((n) => n.l), ...EXTRA_TITLES]
  .slice()
  .sort((a, b) => b.to.length - a.to.length);

// Sidebar highlighting needs the same "most specific sibling wins" rule as
// the header title above, but the sidebar can't reuse MATCHERS as-is: it
// must only ever pick ONE nav item (never EXTRA_TITLES, which aren't
// rendered there) and must respect `end` so "Dashboard" (`/`, end: true)
// doesn't swallow every other route. Without this, <NavLink>'s own
// per-item matching (each item decides its own active state independently,
// with no notion of a sibling being a more specific match) marks BOTH
// "Subjects" (`/subjects`) and "Recordings"/"Quizzes" (`/subjects/recordings`,
// `/subjects/quiz`) active at once, since the latter two never got their own
// top-level path the way Assignments/Study Material did.
const NAV_MATCHERS = ACAD_NAV.filter((n) => n.l).slice().sort((a, b) => b.to.length - a.to.length);

// Subject-scoped deep links live under /subjects/:subjectId/… — title AND
// highlight them by what they actually show. A plain longest-prefix match
// gives "Subjects" for all of them, because these screens never got their
// own top-level path the way /assignments and /study-material did. That is
// why the sidebar lit "Subjects" while the user was looking at Assignments.
const SUBJECT_SUBSCREENS = [
  { seg: "assignments", l: "Assignments", to: "/assignments" },
  { seg: "quiz",        l: "Quizzes",     to: "/subjects/quiz" },
  { seg: "recordings",  l: "Recordings",  to: "/subjects/recordings" },
];

/** The /subjects/:id/<seg> screen this pathname is on, if any. */
function subjectSubscreen(pathname) {
  const m = pathname.match(/^\/subjects\/[^/]+\/([^/]+)/);
  return m ? SUBJECT_SUBSCREENS.find((s) => s.seg === m[1]) : undefined;
}

/** Which ACAD_NAV item's `to` should be highlighted for this pathname. */
export function activeNavTo(pathname) {
  // Checked before the prefix matchers, or /subjects swallows these.
  const sub = subjectSubscreen(pathname);
  if (sub) return sub.to;

  const hit = NAV_MATCHERS.find((n) =>
    n.end ? pathname === n.to : pathname === n.to || pathname.startsWith(`${n.to}/`)
  );
  return hit ? hit.to : null;
}

function humanise(pathname) {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg) return "Dashboard";
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** The header/tab title for a pathname, taken from the active nav item. */
export function pageTitleFor(pathname) {
  if (pathname === "/") return "Dashboard";

  // Same SUBJECT_SUBSCREENS table activeNavTo uses, so the sidebar
  // highlight and the header title can never name different screens.
  const sub = subjectSubscreen(pathname);
  if (sub) return sub.l;

  const hit = MATCHERS.find(
    (n) => !n.end && (pathname === n.to || pathname.startsWith(`${n.to}/`))
  );
  return hit ? hit.l : humanise(pathname);
}
