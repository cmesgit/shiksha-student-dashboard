// ============================================================
// STUDENT — src/utils/courseKind.js
//
// One question, asked in several places: what do we print UNDER a course's
// title to tell it apart from the learner's other courses?
//
// For a school course that is the board ("CBSE"), which is what every screen
// already showed. A competitive exam has `board = NULL` and
// `class_level = NULL` — not missing data, but the correct value: an exam
// belongs to no board and no class. So every one of those screens fell
// through to an empty subtitle, and a learner enrolled in both "Class 10"
// and "UPSC Civil Services" saw one qualified and the other bare.
//
// Note this is only about the LABEL. A competitive course already reaches the
// Academy track on its own: `courseTrack()` returns "skill" only on a /skill/
// match, and "COACHING" does not match, so it correctly falls through to
// "academy" with no change needed.
// ============================================================

/** Board name, tolerating both the nested object and the flat string the
 *  various endpoints use. */
export function boardNameOf(course) {
  const b = course?.board;
  return (typeof b === "string" ? b : b?.name) || course?.board_name || "";
}

/**
 * Is this a competitive-exam course?
 *
 * Checks BOTH signals, because they can disagree. `kind` is written on create
 * and read by very little; the discriminator the nav and catalog key on is a
 * linked category whose group is "competitive". A course can carry one
 * without the other — the seeding command skips the category link (with a
 * warning) when categories were never seeded — so testing either alone would
 * miss exactly the rows most likely to be misfiled.
 */
export function isCompetitiveCourse(course) {
  if (!course) return false;
  if (course.kind === "COACHING") return true;
  return (course.categories || []).some(
    (c) => (typeof c === "string" ? c : c?.group) === "competitive"
  );
}

/**
 * The subtitle to render under a course title.
 *
 * Deliberately does NOT treat "no board" as "competitive": an academic course
 * can also have a null board (a misconfigured row), and captioning that
 * "Competitive exam" would state something false. Only the course's own
 * kind/category decides; anything unclassifiable returns "" and the caller's
 * existing `{qualifier && ...}` guard hides the element, exactly as before.
 */
export function courseQualifier(course) {
  const board = boardNameOf(course);
  if (board) return board;
  if (isCompetitiveCourse(course)) return "Competitive exam";
  return "";
}
