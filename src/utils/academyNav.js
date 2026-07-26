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
  { section: "CONNECT" },
  { l: "Teachers", i: "grad", to: "/teachers" },
  { l: "Messages", i: "msg", to: "/chat" },
];

// Pages reachable outside the sidebar (profile menu, notification deep links,
// the course catalogue) still need a header title.
const EXTRA_TITLES = [
  { to: "/my-courses", l: "My Courses" },
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

function humanise(pathname) {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg) return "Dashboard";
  return seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Subject-scoped deep links live under /subjects/:subjectId/… — title them by
// what they actually show, not as "Subjects", which is what a plain
// longest-prefix match would give.
const SUBJECT_SUBSCREENS = [
  { seg: "assignments", l: "Assignments" },
  { seg: "quiz", l: "Quizzes" },
  { seg: "recordings", l: "Recordings" },
];

/** The header/tab title for a pathname, taken from the active nav item. */
export function pageTitleFor(pathname) {
  if (pathname === "/") return "Dashboard";

  const sub = pathname.match(/^\/subjects\/[^/]+\/([^/]+)/);
  if (sub) {
    const hit = SUBJECT_SUBSCREENS.find((s) => s.seg === sub[1]);
    if (hit) return hit.l;
  }

  const hit = MATCHERS.find(
    (n) => !n.end && (pathname === n.to || pathname.startsWith(`${n.to}/`))
  );
  return hit ? hit.l : humanise(pathname);
}
