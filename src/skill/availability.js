// PLACEMENT: student_dashboard/src/skill/availability.js  (replace whole file)
//
// Grid definition for the Book-a-Tutor calendar. Open/booked state comes from
// the backend (GET /skill/teachers/<id>/availability/).
//
// The tutor's grid is a WEEKLY-RECURRING template. Booking a slot schedules it
// at that weekday+time's NEXT occurrence (the backend rolls forward if the
// time this week has already passed). So instead of "this week's" dates —
// which showed past days — each column is labelled with the date the slot
// would ACTUALLY land on, and today's already-passed hours are disabled.
//
// Slot key: "<dayIndex>-<slotIndex>"
//   dayIndex  0 = Monday .. 5 = Saturday   (matches the backend week math)
//   slotIndex 0..5 -> SLOT_HOURS / _SLOT_HOURS in skills/views.py

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Must line up with _SLOT_HOURS in the backend: [9,11,14,16,18,20].
export const SLOT_HOURS = [9, 11, 14, 16, 18, 20];
export const SLOTS = ["9 AM", "11 AM", "2 PM", "4 PM", "6 PM", "8 PM"];

const todayIdx = () => (new Date().getDay() + 6) % 7; // 0 = Monday

/** Date (day-of-month + short month) of the NEXT occurrence of weekday di. */
function nextOccurrence(di) {
  const now = new Date();
  let delta = (di - todayIdx() + 7) % 7; // 0 = today
  const d = new Date(now);
  d.setDate(now.getDate() + delta);
  return d;
}

/** Column labels with the real upcoming date, e.g. "Mon · 6 Jul". */
export function dateLabels() {
  return DAYS.map((n, i) => {
    const d = nextOccurrence(i);
    return `${n} ${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
  });
}

/** True when the slot is TODAY's column but its hour has already passed —
 *  shown as unavailable so the header date is never a lie. */
export function isPastToday(di, si) {
  const now = new Date();
  return di === todayIdx() && now.getHours() >= SLOT_HOURS[si];
}

export function label(k) {
  const [di, si] = String(k).split("-").map(Number);
  const d = nextOccurrence(di);
  const ds = `${DAYS[di] ?? "?"} ${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
  return `${ds} \u00b7 ${SLOTS[si] ?? "?"}`;
}

export default { DAYS, SLOTS, SLOT_HOURS, dateLabels, isPastToday, label };
