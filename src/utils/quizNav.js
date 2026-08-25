// ============================================================
// STUDENT — src/utils/quizNav.js
//
// Where "Back to Quizzes" should actually go.
//
// The quiz hub is mounted at TWO routes (src/App.jsx):
//
//     subjects/quiz              → every assigned quiz for the course
//     subjects/quiz/:subjectId   → the same list, filtered to one subject
//
// QuizHub.jsx narrows `assigned` client-side off that optional param, so the
// two routes render genuinely different lists from one payload.
//
// The sidebar links to the UNSCOPED route (utils/academyNav.js), but every
// child screen knows its subject and used to synthesise the SCOPED route on
// the way back. So a learner who opened the hub from the sidebar, viewed a
// result, and pressed Back silently landed on a different, shorter list —
// six quizzes and "4 open" became two, with nothing on screen explaining why
// and no way to widen it again short of using the sidebar.
//
// Fix: record the hub path we actually came from in router state and hand it
// back on the return trip. Deep links carry no state, so they keep falling
// back to the subject-scoped hub, which is the right home for a URL that
// already names a subject.
// ============================================================

/** Router-state key. Kept in one place so the three quiz screens agree. */
export const QUIZ_ORIGIN_KEY = "quizHubOrigin";

/**
 * Build the `state` for a navigation LEAVING the quiz hub (or leaving a
 * screen that was itself reached from the hub), preserving the original
 * origin across multi-hop trips such as hub → attempts → result.
 *
 * @param {string} currentPath   `location.pathname` of the screen navigating.
 * @param {object} [currentState] `location.state` of that screen, if any.
 */
export function withQuizOrigin(currentPath, currentState) {
  return { [QUIZ_ORIGIN_KEY]: currentState?.[QUIZ_ORIGIN_KEY] || currentPath };
}

/**
 * Resolve where a "Back to Quizzes" control should navigate.
 *
 * @param {object} [state]      `location.state` of the current screen.
 * @param {string} [subjectId]  Falls back to the subject-scoped hub, matching
 *                              the pre-existing deep-link behaviour.
 */
export function quizHubPath(state, subjectId) {
  return (
    state?.[QUIZ_ORIGIN_KEY] ||
    (subjectId ? `/subjects/quiz/${subjectId}` : "/subjects/quiz")
  );
}
