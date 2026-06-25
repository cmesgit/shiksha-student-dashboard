// PLACEMENT: student_dashboard/src/skill/availability.js  (replace whole file)
//
// Grid definition for the Book-a-Tutor weekly calendar. The REAL open/booked
// state now comes from the backend (GET /skill/teachers/<id>/availability/),
// so the old localStorage "SDAvail" mock store has been removed entirely.
// This module only describes the grid layout + a label helper.
//
// Slot key format: "<dayIndex>-<slotIndex>" (e.g. "3-1").
//   dayIndex  0 = Monday .. 5 = Saturday   (matches the backend week math)
//   slotIndex 0..5 -> SLOTS / _SLOT_HOURS in skills/views.py [9,11,14,16,18,20]

function mondayOfThisWeek() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;          // 0 = Monday
  const m = new Date(now);
  m.setDate(now.getDate() - dow);
  m.setHours(0, 0, 0, 0);
  return m;
}

// Mon–Sat of the CURRENT week with real date numbers, e.g. ["Mon 23", ...].
export const DAYS = (() => {
  const m = mondayOfThisWeek();
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return names.map((n, i) => {
    const d = new Date(m);
    d.setDate(m.getDate() + i);
    return `${n} ${d.getDate()}`;
  });
})();

// Time-of-day labels — must line up with _SLOT_HOURS in the backend.
export const SLOTS = ["9 AM", "11 AM", "2 PM", "4 PM", "6 PM", "8 PM"];

export function label(k) {
  const [di, si] = String(k).split("-").map(Number);
  return `${DAYS[di] ?? "?"} \u00b7 ${SLOTS[si] ?? "?"}`;
}

export default { DAYS, SLOTS, label };
