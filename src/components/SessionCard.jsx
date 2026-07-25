// ============================================================
// STUDENT — src/components/SessionCard.jsx  (FULL REPLACEMENT)
// ============================================================
// Redesigned as a horizontal ROW to match the Academy Dashboard
// redesign's "Upcoming Live Sessions" list spec: time/day block →
// divider → subject chip + relative start + topic + teacher → Join
// button. Only used by src/pages/Dashboard.jsx, so this is a full
// visual replacement, not just a restyle — no other page depends on
// the old vertical-card markup.
// ============================================================

import { useNavigate } from "react-router-dom";
import "../styles/sessionCard.css";

export default function SessionCard({
  id,
  subject,
  topic,
  teacher,
  time,
  dayLabel,
  startsInText,
  isLive,
  chipBg,
  chipColor,
}) {
  const navigate = useNavigate();

  const handleRowClick = () => navigate("/live-sessions");

  const handleJoin = (e) => {
    e.stopPropagation();
    navigate(id ? `/live/${id}` : "/live-sessions");
  };

  return (
    <div
      className={`sessionRow ${isLive ? "sessionRow--live" : ""}`}
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleRowClick()}
    >
      <div className="sessionRow__time">
        <div className="sessionRow__clock">{time}</div>
        <div className="sessionRow__day">{dayLabel}</div>
      </div>

      <div className="sessionRow__divider" />

      <div className="sessionRow__body">
        <div className="sessionRow__meta">
          <span
            className="sessionRow__chip"
            style={{ background: chipBg, color: chipColor }}
          >
            {subject}
          </span>
          <span className="sessionRow__startsIn">{startsInText}</span>
        </div>
        <p className="sessionRow__topic">{topic || "Title/Topic"}</p>
        <p className="sessionRow__teacher">{teacher || "Teacher’s Name"}</p>
      </div>

      <button type="button" className="sessionRow__join" onClick={handleJoin}>
        Join
      </button>
    </div>
  );
}
