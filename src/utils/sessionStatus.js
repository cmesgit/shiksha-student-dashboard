// Canonical private-session status vocabulary.
//
// One map, used by both pages/PrivateSessions.jsx and
// components/PrivateSessionCard.jsx. It used to be duplicated across the two,
// and both copies prefixed the label with an emoji ("✅ Approved", "⏳ Pending",
// "🔴 Live", "⚠️ Needs Confirmation"). The design says a status is a plain word
// in a coloured chip, so the colour carries the meaning and the label is just
// text — which also means screen readers don't announce decorative emoji.
//
// `tone` names an .ac-tag--* variant from styles/academyScreens.css, mapped to
// the design's status palette (README "Status chip palette"):
//   Scheduled / Confirmed / Completed → success
//   Accepted                          → info
//   Reschedule sent                   → warning
//   Rejected / Declined               → danger

export const SESSION_STATUS = {
  approved:             { label: "Approved",           tone: "success" },
  ongoing:              { label: "Live",               tone: "live" },
  pending:              { label: "Pending",            tone: "warning" },
  needs_reconfirmation: { label: "Needs confirmation", tone: "warning" },
  completed:            { label: "Completed",          tone: "success" },
  cancelled:            { label: "Cancelled",          tone: "danger" },
  declined:            { label: "Declined",           tone: "danger" },
  expired:              { label: "Expired",            tone: "neutral" },
  withdrawn:            { label: "Withdrawn",          tone: "neutral" },
  teacher_no_show:      { label: "Teacher no-show",    tone: "danger" },
  student_no_show:      { label: "Student no-show",    tone: "danger" },
};

export function statusLabel(status) {
  return SESSION_STATUS[status]?.label ?? status;
}

export function statusTone(status) {
  return SESSION_STATUS[status]?.tone ?? "neutral";
}
