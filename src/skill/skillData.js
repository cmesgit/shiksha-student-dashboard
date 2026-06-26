// PLACEMENT: student_dashboard/src/skill/skillData.js  (replace whole file)
//
// All sample/mock arrays (SP_COURSES, LIVE_*, BOOK_TUTORS, RECOMMENDED,
// SKILL_CATEGORIES, …) have been removed — those screens now read real data
// from the backend. The only thing kept here is the pure pricing helper used
// by SkillBookTutor to render single / 5-pack / 10-pack options from a rate.

export const packs = (rate) => [
  { n: 1,  label: "Single session", total: rate,                         per: rate,                    save: null },
  { n: 5,  label: "5-session pack",  total: Math.round(rate * 5 * 0.9),   per: Math.round(rate * 0.9),  save: "Save 10%" },
  { n: 10, label: "10-session pack", total: Math.round(rate * 10 * 0.82), per: Math.round(rate * 0.82), save: "Save 18%" },
];
