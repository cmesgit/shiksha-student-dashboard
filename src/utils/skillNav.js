// The Skill Dev header title map — mirrors academyNav.js's pageTitleFor, but
// for the Skill Dev track. Skill Dev Student.dc.html's own `titles` object
// (dc:1136) is the header h1 for every screen — no skill screen renders its
// own on-page heading. The one exception is Dashboard: its title there is a
// time-of-day greeting, not a fixed label.

export function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function firstName(activeProfile, user) {
  return (
    activeProfile?.display_name || user?.name || user?.full_name ||
    user?.username || "there"
  ).split(" ")[0];
}

const STATIC_TITLES = [
  { to: "/skill-dev/explore",  l: "Explore experts" },
  { to: "/skill-dev/profile",  l: "Expert profile" },
  { to: "/skill-dev/courses",  l: "My courses" },
  { to: "/skill-dev/book",     l: "Book a session" },
  { to: "/skill-dev/sessions", l: "My sessions" },
  { to: "/skill-messages",     l: "Messages" },
  { to: "/skill-dev/reviews",  l: "Reviews & reputation" },
];

/** Header title for a Skill Dev route. `greetingName` is used only on "/". */
export function pageTitleForSkill(pathname, greetingName) {
  if (pathname === "/") return `${timeGreeting()}, ${greetingName || "there"}`;
  const hit = STATIC_TITLES.find(
    (n) => pathname === n.to || pathname.startsWith(`${n.to}/`)
  );
  return hit ? hit.l : "Skill Development";
}
