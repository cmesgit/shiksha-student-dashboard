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
