/**
 * tourRegistry.js — student-app tour content (TOUR_SYSTEM_SPEC.md §3.1, §7.3).
 * Per-app, NOT synced by shared/sync.mjs (same reasoning as tokens.css).
 *
 * ⚠️ COPY IS A DRAFT. Every `title`/`body` string below is a placeholder the
 * spec's own guidance (§13) explicitly asks the implementer NOT to finalize
 * unprompted — it fixes structure, not words. Needs product-owner sign-off
 * before shipping. Structure (steps, targets, gating) is the reviewed part.
 *
 * Deviations from TOUR_SYSTEM_SPEC.md §3.1, found while wiring real anchors
 * (phase 3) — flagged per TOUR_BUILD_GUIDE.md §3 rather than invented around:
 *
 *   - `student.courses.detail` — spec assumed chapters/lessons/materials/
 *     recordings content on `MyCourseDetail.jsx`. That page only has a
 *     Progress/Teachers/PaymentHistory card grid + a quick-actions row
 *     (Class chat / Message a teacher). Built as 2 steps, not 4.
 *   - `student.assignment.submit` — spec's 3rd step ("resubmission") has no
 *     real target: once submitted, `AssignmentDetail.jsx` has no re-upload
 *     path. Built as 2 steps.
 *   - `student.quiz.intro` — spec described "Mock vs practice" as a binary
 *     toggle; the real UI is a 3-way Practice/Mock tests/Completed tab strip.
 *     Kept the real structure (per explicit product direction) — 4 steps
 *     across the 3 tabs + the results grid.
 *   - `student.recordings` — spec's "notes" step has no target on this
 *     route: notes live one level deeper, on `RecordingDetail.jsx`
 *     (`.../video/:videoId`), which this route-scoped tour can't reach.
 *     Built as 2 steps (filters, grid).
 *   - `student.welcome.academy` step 5 — now phase 5 is done, this points at
 *     the profile switcher AND names "Help & tours" in the copy, satisfying
 *     spec §6.1's "final step of every T1 tour must point at entry point 1."
 *   - `student.welcome.skill` — that same §6.1 rule applies to every T1 tour,
 *     not just academy, but §3.1's table lists exactly 4 steps for this one
 *     with no room left for it. Added a 5th step rather than dropping real
 *     content to make room — flagging the step-count deviation rather than
 *     silently reconciling it.
 *
 * Two engine gaps discovered while wiring gating (both are `shared/src/tour/`
 * fixes made alongside this file, not registry content):
 *   - `entry.featureFlag` was documented in the schema (§7.3) but never read
 *     by `TourProvider`'s rule engine — added the one-line check so
 *     `student.live.room`'s `show_tour` sub-switch (spec's own requirement)
 *     actually works.
 *   - `entry.trigger.match` only supports a route PREFIX (`matchesRoute` in
 *     TourProvider.jsx), no wildcard/regex — too coarse to express e.g.
 *     "`/subjects/quiz/:id` but not `/subjects/quiz/:id/take/:id`" on its
 *     own. Worked around it here by pairing a loose `trigger.match` (so the
 *     entry is even considered) with a precise regex in `conditions` (so it
 *     only actually fires on the exact shape) — see each T2 entry below.
 *     `entry.audience` (in the schema example) and `entry.trigger.minSession`
 *     are similarly unread by the engine; omitted below rather than implying
 *     precision that isn't there. `step.advanceOn` is also unread — every
 *     step advances via the card's own Next button regardless of the value,
 *     so it's omitted too.
 *
 * Mobile (spec §10): T1 welcome tours are left `mobile: false` (the engine's
 * default) — both target sidebar nav items, which spec §10 explicitly says
 * must NEVER auto-run on mobile (the sidebar is a drawer there) and instead
 * need a dedicated `.mobile` variant targeting the bottom nav. That variant
 * needs bottom-nav anchors that don't exist yet — out of scope for this
 * pass, flagging rather than building it unprompted. The five T2 tours below
 * target in-content elements, not the sidebar, so `mobile: true` is safe per
 * the same section. Note spec §10 also calls for the card to become a
 * full-width bottom sheet on mobile — `tours.css` has no such media query
 * yet (phase 2 gap, not registry content); `position.js`'s own viewport
 * clamping (`cardWidth = min(300, viewport.width * 0.92)`, already verified
 * in the phase-2 checklist) keeps the card on-screen at 375px regardless, so
 * tours are functional on mobile without that polish, just not pixel-spec.
 *
 * `student.welcome.academy.mobile` (spec §10) — the spec's own wording
 * assumes a "bottom nav" to target. This app has none: mobile navigation is
 * the same `acad-side` drawer as desktop, opened via `Header.jsx`'s
 * hamburger (`bottomNav.css` exists in the codebase but is dead — no
 * component ever renders a `.bottomNav`). Building a real bottom-nav
 * component is UI work far outside "add the flagged mobile tour variant" —
 * targeted the three things that already sit in the always-visible mobile
 * header instead (hamburger, notifications, profile switcher), which serves
 * the same purpose the spec's variant is actually after: orient a first-time
 * mobile visitor without touching the sidebar drawer.
 *
 * The three T3 beacon entries below (`student.beacon.profile-switcher`,
 * `student.beacon.settings-sessions`, `student.beacon.browse-filters`) reuse
 * anchors phase 3 already added for the T1/T2 tours above — no new
 * `data-tour` attributes needed. `TourProvider` renders a beacon whenever
 * its entry's `tier: "T3"`, its route matches, and it hasn't been seen yet
 * (§9.5's engine, added alongside this content — see `shared/src/tour/
 * Beacon.jsx`).
 */

const track = (name) => () =>
  document.querySelector(".studentLayout")?.dataset.track === name;

export const tourRegistry = [
  // ── T1 — Welcome tours ────────────────────────────────────────────────
  {
    key: "student.welcome.academy",
    label: "Welcome tour — Academy",
    version: 1,
    tier: "T1",
    renderer: "spotlight",
    trigger: { match: "/" },
    conditions: [track("academy")],
    steps: [
      {
        target: '[data-tour="sidebar.section-learn"]',
        placement: "right",
        title: "Everything, grouped",
        body: "Your subjects, live classes, and practice work are grouped into sections like this one down the side.",
      },
      {
        target: '[data-tour="sidebar.course-switcher"]',
        placement: "right",
        title: "Your active course",
        body: "This shows which course you're viewing. If you're enrolled in more than one, switch between them here.",
      },
      {
        target: '[data-tour="dashboard.live-rail"]',
        placement: "top",
        title: "What's coming up",
        body: "Your live classes for the week show up here, with a direct join link once one starts.",
      },
      {
        target: '[data-tour="header.notifications"]',
        placement: "bottom-end",
        title: "Stay in the loop",
        body: "New assignments, grades, and messages land here first.",
      },
      {
        target: '[data-tour="header.profile-switcher"]',
        placement: "bottom-end",
        title: "Come back to this anytime",
        body: "Open this menu and choose Help & tours to replay any of this, or manage your profile and sign out.",
      },
    ],
  },
  {
    key: "student.welcome.academy.mobile",
    label: "Welcome tour — Academy (mobile)",
    version: 1,
    tier: "T1",
    renderer: "spotlight",
    mobile: true,
    trigger: { match: "/" },
    // S7 only blocks non-mobile entries under 768px — it never restricts a
    // `mobile: true` entry to ONLY that width, so without this the desktop
    // and mobile variants could both fire for the same visitor depending on
    // which width they happened to load at first.
    conditions: [track("academy"), () => window.innerWidth < 768],
    steps: [
      {
        target: '[data-tour="header.hamburger"]',
        placement: "bottom-start",
        title: "Everything lives in this menu",
        body: "Your subjects, live classes, and practice work are grouped in here — tap to open it any time.",
      },
      {
        target: '[data-tour="header.notifications"]',
        placement: "bottom-end",
        title: "Stay in the loop",
        body: "New assignments, grades, and messages land here first.",
      },
      {
        target: '[data-tour="header.profile-switcher"]',
        placement: "bottom-end",
        title: "Come back to this anytime",
        body: "Open this menu and choose Help & tours to replay any of this, or manage your profile and sign out.",
      },
    ],
  },
  {
    key: "student.welcome.skill",
    label: "Welcome tour — Skill Dev",
    version: 1,
    tier: "T1",
    renderer: "spotlight",
    trigger: { match: "/" },
    conditions: [track("skill")],
    steps: [
      {
        target: '[data-tour="sidebar-skill.nav-explore"]',
        placement: "right",
        title: "Find an expert",
        body: "Browse experts by skill and book a session directly from their profile.",
      },
      {
        target: '[data-tour="sidebar-skill.nav-courses"]',
        placement: "right",
        title: "Your courses",
        body: "Anything you've enrolled in through Skill Dev lives here.",
      },
      {
        target: '[data-tour="sidebar-skill.nav-sessions"]',
        placement: "right",
        title: "Upcoming and past sessions",
        body: "Track every session you've booked, confirmed or completed, in one place.",
      },
      {
        target: '[data-tour="sidebar-skill.nav-messages"]',
        placement: "right",
        title: "Talk to your expert",
        body: "Message an expert before or after a session without leaving the app.",
      },
      {
        target: '[data-tour="header.profile-switcher"]',
        placement: "bottom-end",
        title: "Come back to this anytime",
        body: "Open this menu and choose Help & tours to replay any of this, or manage your profile and sign out.",
      },
    ],
  },

  // ── T2 — Page tours ───────────────────────────────────────────────────
  {
    key: "student.courses.detail",
    label: "Course detail page",
    version: 1,
    tier: "T2",
    renderer: "spotlight",
    mobile: true,
    trigger: { match: "/my-courses" },
    conditions: [(ctx) => /^\/my-courses\/[^/]+$/.test(ctx.location.pathname)],
    steps: [
      {
        target: '[data-tour="course-detail.quick-actions"]',
        placement: "bottom",
        title: "Reach your teacher directly",
        body: "Open the class chat or message a teacher without hunting for their contact details.",
      },
      {
        target: '[data-tour="course-detail.progress-card"]',
        placement: "top",
        title: "Track how far you've come",
        body: "See how much of the syllabus your teachers have covered so far.",
      },
    ],
  },
  {
    key: "student.quiz.intro",
    label: "Quizzes",
    version: 1,
    tier: "T2",
    renderer: "spotlight",
    mobile: true,
    trigger: { match: "/subjects/quiz" },
    conditions: [(ctx) => /^\/subjects\/quiz(\/[^/]+)?$/.test(ctx.location.pathname)],
    steps: [
      {
        target: '[data-tour="quiz-hub.tab-practice"]',
        placement: "bottom",
        title: "Practice without pressure",
        body: "These aren't timed and you can re-attempt them — a low-stakes way to check your understanding.",
      },
      {
        target: '[data-tour="quiz-hub.tab-mock"]',
        placement: "bottom",
        title: "Mock tests are timed",
        body: "These mirror exam conditions, with a countdown and one attempt — so results reflect what a real test would show.",
      },
      {
        target: '[data-tour="quiz-hub.tab-completed"]',
        placement: "bottom",
        title: "Review what you've finished",
        body: "Every quiz you've submitted moves here, so you can revisit your answers and scores.",
      },
      {
        target: '[data-tour="quiz-hub.grid"]',
        placement: "top",
        title: "Open any quiz for details",
        body: "Tap a card to start it, or to see your attempt history and result if you've already finished it.",
      },
    ],
  },
  {
    key: "student.assignment.submit",
    label: "Submitting an assignment",
    version: 1,
    tier: "T2",
    renderer: "spotlight",
    mobile: true,
    trigger: { match: "/subjects" },
    conditions: [(ctx) => /^\/subjects\/[^/]+\/assignments\/[^/]+$/.test(ctx.location.pathname)],
    steps: [
      {
        target: '[data-tour="assignment.status-chip"]',
        placement: "bottom",
        title: "Know where you stand",
        body: "This shows whether it's due, overdue, or already submitted — and marks late submissions once you turn one in.",
      },
      {
        target: '[data-tour="assignment.upload-zone"]',
        placement: "top",
        title: "Submit your work here",
        body: "Upload a PDF or document — you'll see it listed as ready before you confirm submission.",
      },
    ],
  },
  {
    key: "student.live.room",
    label: "Live class controls",
    version: 1,
    tier: "T2",
    renderer: "spotlight",
    mobile: true, // groupSessionLive.css reflows the control bar below 900px/560px but never hides these buttons — checked, not assumed
    trigger: { match: "/group-session/live/" },
    featureFlag: "show_tour",
    steps: [
      {
        target: '[data-tour="live-room.mic"]',
        placement: "top",
        title: "You start muted",
        body: "Unmute yourself here once you're ready to speak — your camera toggle sits right next to it.",
      },
      {
        target: '[data-tour="live-room.raise-hand"]',
        placement: "top",
        title: "Ask without interrupting",
        body: "Raise your hand and the host sees you're waiting to speak.",
      },
      {
        target: '[data-tour="live-room.chat-toggle"]',
        placement: "top",
        title: "Or type it instead",
        body: "Open the chat panel to ask a question or share something without unmuting.",
      },
      {
        target: '[data-tour="live-room.leave"]',
        placement: "top",
        title: "Leaving doesn't end the class",
        body: "You can rejoin any time before the session ends.",
      },
    ],
  },
  {
    key: "student.recordings",
    label: "Recordings",
    version: 1,
    tier: "T2",
    renderer: "spotlight",
    mobile: true,
    trigger: { match: "/subjects/recordings" },
    conditions: [(ctx) => /^\/subjects\/recordings\/[^/]+$/.test(ctx.location.pathname)],
    steps: [
      {
        target: '[data-tour="recordings.filters"]',
        placement: "bottom",
        title: "Jump to a subject",
        body: "Filter recordings by subject instead of scrolling through everything.",
      },
      {
        target: '[data-tour="recordings.grid"]',
        placement: "top",
        title: "Open one to watch",
        body: "Tap any recording to start playback — teacher's notes, if any, are right there with it.",
      },
    ],
  },

  // ── T3 — Beacon hints ────────────────────────────────────────────────
  {
    key: "student.beacon.profile-switcher",
    label: "Profile switcher",
    version: 1,
    tier: "T3",
    trigger: { match: "/" },
    conditions: [(ctx) => (ctx.profiles?.length || 0) > 1],
    steps: [
      {
        target: '[data-tour="header.profile-switcher"]',
        placement: "bottom-end",
        title: "More than one profile?",
        body: "Switch between the profiles on this account here, without signing out.",
      },
    ],
  },
  {
    key: "student.beacon.settings-sessions",
    label: "Sessions & devices",
    version: 1,
    tier: "T3",
    trigger: { match: "/" },
    insideModal: true,
    steps: [
      {
        target: '[data-tour="settings.sessions-nav"]',
        placement: "right",
        title: "See where you're signed in",
        body: "Every device currently signed into this account is listed here — sign any of them out remotely if something looks off.",
      },
    ],
  },
  {
    key: "student.beacon.browse-filters",
    label: "Browse-courses filters",
    version: 1,
    tier: "T3",
    trigger: { match: "/browse-courses" },
    steps: [
      {
        target: '[data-tour="browse-courses.toolbar"]',
        placement: "bottom",
        title: "Narrow it down",
        body: "Filter by board, stream, or category to find a course faster.",
      },
    ],
  },
];
