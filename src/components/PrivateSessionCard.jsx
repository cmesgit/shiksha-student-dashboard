/**
 * FILE: STUDENT_DASHBOARD/src/components/PrivateSessionCard.jsx
 *
 * One private-session row, in the design's shared row shape (Academy
 * Dashboard.dc.html lines 1636–1652): time/day block · divider · subject chip +
 * status tag, topic, teacher · trailing action.
 *
 * This used to be a vertical tile with its own emoji status badge. The status
 * vocabulary now lives in utils/sessionStatus.js so this and PrivateSessions.jsx
 * can't drift apart.
 */

import { subjectChipSlot } from "../utils/subjectChips";
import { statusLabel, statusTone } from "../utils/sessionStatus";
import "../styles/academyScreens.css";

export default function PrivateSessionCard({
  subject,
  topic,
  teacher,
  date,
  time,
  status,
  onEnterRoom,
  onClick,
}) {
  const canEnter = status === "approved" || status === "ongoing";

  const activate = () => onClick && onClick();

  return (
    <div
      className="ac-row"
      onClick={activate}
      role="button"
      tabIndex={0}
      // Was focusable via tabIndex but had no key handler, so keyboard users
      // could reach the row and not open it.
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
    >
      <div className="ac-row__when">
        <div className="ac-row__time">{time}</div>
        <div className="ac-row__day">{date}</div>
      </div>
      <div className="ac-row__divider" />
      <div className="ac-row__body">
        <div className="ac-row__meta">
          {subject && (
            <span className={`subj-chip subj-chip--${subjectChipSlot(subject)}`}>
              {subject}
            </span>
          )}
          <span className={`ac-tag ac-tag--${statusTone(status)}`}>
            {statusLabel(status)}
          </span>
        </div>
        {topic && <div className="ac-row__topic">{topic}</div>}
        {teacher && <div className="ac-row__sub">{teacher}</div>}
      </div>
      {canEnter && (
        <button
          type="button"
          className="ac-btn ac-btn--primary"
          onClick={(e) => {
            e.stopPropagation();
            onEnterRoom && onEnterRoom();
          }}
        >
          {status === "ongoing" ? "Join now" : "Enter room"}
        </button>
      )}
    </div>
  );
}
