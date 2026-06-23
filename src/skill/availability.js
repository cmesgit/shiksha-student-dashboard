// skill/availability.js
// Shared weekly-availability store for Skill Dev — ES-module port of the
// prototype's window.SDAvail. One source of truth, backed by localStorage so
// it stays in sync across the learner's Book-a-Tutor calendar and the expert's
// Availability grid / Bookings on the same origin.
//
// Slot key format: "<dayIndex>-<slotIndex>" (e.g. "3-1").
// State per teacher: { open: [keys], booked: [keys] }
//   open   = teacher is bookable
//   booked = a learner's request was accepted -> locked, shown differently,
//            unavailable to others.

export const DAYS  = ["Mon 23", "Tue 24", "Wed 25", "Thu 26", "Fri 27", "Sat 28"];
export const SLOTS = ["9 AM", "11 AM", "2 PM", "4 PM", "6 PM", "8 PM"];

const KEY = (tid) => "sd_avail_" + tid;

function defaultOpen(tid) {
  const out = [];
  DAYS.forEach((d, di) => SLOTS.forEach((sl, si) => {
    if (((tid * 7 + di * 3 + si * 5) % 4) !== 0) out.push(di + "-" + si);
  }));
  return out;
}
function defaultBooked(tid) {
  const o = defaultOpen(tid);
  return o.length ? [o[0]] : [];
}

function load(tid) {
  try {
    const raw = localStorage.getItem(KEY(tid));
    if (raw) { const o = JSON.parse(raw); return { open: o.open || [], booked: o.booked || [] }; }
  } catch (e) {}
  return { open: defaultOpen(tid), booked: defaultBooked(tid) };
}
function save(tid, data) { try { localStorage.setItem(KEY(tid), JSON.stringify(data)); } catch (e) {} }

export function get(tid) { return load(tid); }

export function status(tid, k) {
  const d = load(tid);
  if (d.booked.includes(k)) return "booked";
  if (d.open.includes(k)) return "open";
  return "closed";
}

export function toggleOpen(tid, k) {
  const d = load(tid);
  if (d.booked.includes(k)) return d;
  d.open = d.open.includes(k) ? d.open.filter((x) => x !== k) : [...d.open, k];
  save(tid, d);
  return d;
}

export function book(tid, k) {
  const d = load(tid);
  if (!d.open.includes(k)) d.open = [...d.open, k];
  if (!d.booked.includes(k)) d.booked = [...d.booked, k];
  save(tid, d);
  return d;
}

export function label(k) {
  const [di, si] = k.split("-").map(Number);
  return DAYS[di] + " \u00b7 " + SLOTS[si];
}

export default { DAYS, SLOTS, get, status, toggleOpen, book, label };
