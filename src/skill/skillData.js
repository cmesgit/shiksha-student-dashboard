// skill/skillData.js
// Sample data for the learner Skill Dev views. Swap these for your real API
// responses; the component prop shapes are what matter. Image paths match the
// prototype's assets — Avatar falls back to initials when an image is absent.

export const SP_COURSES = [
  { title: "Python & Data Science", expert: "Lalmuanawma", img: "assets/teacher9.jpeg",
    cat: "Coding & Web", color: "#0a808a", pct: 40, done: 8, total: 20, hrs: "6h 20m", rating: 4.8, reviews: 128,
    resume: { mod: "Data wrangling with pandas", lesson: "L9 \u00b7 Merging DataFrames", at: "4:12 / 11:30" },
    modules: [
      { t: "Python foundations", n: 5, d: "1h 10m", done: true },
      { t: "Working with data", n: 4, d: "55m", done: true },
      { t: "Data wrangling with pandas", n: 6, d: "1h 40m", cur: true },
      { t: "Visualising data", n: 3, d: "50m" },
      { t: "Capstone notebook", n: 2, d: "1h 45m" },
    ] },
  { title: "UI/UX Design Foundations", expert: "Eric Lalsiamliana", img: "assets/teacher3.jpeg",
    cat: "Design & Art", color: "#9c27b0", pct: 15, done: 2, total: 14, hrs: "4h 05m", rating: 4.9, reviews: 86,
    resume: { mod: "Design thinking", lesson: "L3 \u00b7 Empathy maps", at: "1:30 / 9:10" },
    modules: [
      { t: "Design thinking", n: 3, d: "42m", cur: true },
      { t: "Wireframing in Figma", n: 4, d: "1h 05m" },
      { t: "Visual hierarchy & type", n: 3, d: "48m" },
      { t: "Prototyping & handoff", n: 4, d: "1h 30m" },
    ] },
];

export const SP_DONE = [
  { title: "Spoken English Starter", expert: "Mimi Lalramthari", img: "assets/teacher2.jpeg", date: "30 May 2026", myRating: 5 },
  { title: "Watercolour Basics", expert: "Janet Lalhmangaihzuali", img: "assets/teacher6.jpeg", date: "12 May 2026", myRating: 4 },
];

export const LIVE_PACKAGE = { tutor: "Lalmuanawma", remaining: 3, total: 5, label: "5-session pack" };

export const LIVE_UPCOMING = [
  { tutor: "Lalmuanawma", role: "Python & Data Science", img: "assets/teacher9.jpeg", topic: "Pandas basics \u2014 1:1", when: "Today \u00b7 7:00 PM", dur: "60 min", live: true },
  { tutor: "Eric Lalsiamliana", role: "UI/UX Design", img: "assets/teacher3.jpeg", topic: "Portfolio review", when: "Sat 28 Jun \u00b7 11:00 AM", dur: "45 min" },
];

export const LIVE_PAST = [
  { tutor: "Lalmuanawma", img: "assets/teacher9.jpeg", topic: "Python foundations Q&A", when: "18 Jun", reviewed: true },
  { tutor: "Zothanpuia", img: "assets/teacher4.jpeg", topic: "UPSC essay feedback", when: "9 Jun", reviewed: false },
];

export const BOOK_TUTORS = [
  { name: "Lalmuanawma", role: "Python & Data Science", img: "assets/teacher9.jpeg", rating: 4.8, reply: "~1h", rate: 480, id: 9 },
  { name: "Eric Lalsiamliana", role: "UI/UX Designer", img: "assets/teacher3.jpeg", rating: 4.9, reply: "2h", rate: 550, id: 3 },
  { name: "Zothanpuia", role: "UPSC mentor", img: "assets/teacher4.jpeg", rating: 4.7, reply: "~3h", rate: 450, id: 4 },
];

export const SKILL_CATEGORIES = [
  { id: "coding", label: "Coding & Web", color: "#1b9c85" },
  { id: "design", label: "Design & Art", color: "#a78bfa" },
  { id: "music", label: "Music & Audio", color: "#ff8f01" },
  { id: "lang", label: "Languages", color: "#60a5fa" },
  { id: "business", label: "Business & Finance", color: "#f87171" },
  { id: "exam", label: "Exam Prep", color: "#125027" },
];

export const RECOMMENDED = [
  { name: "Hrangthantlinga", role: "Web Developer \u00b7 ex-Infosys", img: "assets/teacher1.jpeg", rating: 4.9, rate: 450, id: 1 },
  { name: "Dinah Lalremhlui", role: "Chartered Accountant", img: "assets/teacher8.jpeg", rating: 4.9, rate: 600, id: 8 },
  { name: "V. Lalrindika", role: "Guitarist & vocal coach", img: "assets/teacher5.jpeg", rating: 4.9, rate: 500, id: 5 },
];

// Single / 5-pack / 10-pack pricing for a given hourly rate.
export const packs = (rate) => [
  { n: 1, label: "Single session", total: rate, per: rate, save: null },
  { n: 5, label: "5-session pack", total: Math.round(rate * 5 * 0.9), per: Math.round(rate * 0.9), save: "Save 10%" },
  { n: 10, label: "10-session pack", total: Math.round(rate * 10 * 0.82), per: Math.round(rate * 0.82), save: "Save 18%" },
];
