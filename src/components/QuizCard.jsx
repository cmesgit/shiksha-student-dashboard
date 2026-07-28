// src/components/QuizCard.jsx
// ──────────────────────────────────────────────────────────────────────────
// Shared quiz card — used by the Quizzes list (src/pages/QuizList.jsx) and
// the Dashboard's right-rail Assignments/Quizzes toggle. Matches the design
// handoff's Quizzes card (Academy Dashboard.dc.html, section 12): subject
// chip + status/mode tag on top, title, meta, then a footer with one action.
//
// `subject`/`subjSlot` are optional — the Dashboard's compact rail card
// doesn't pass them (no room for a chip there), so the top row degrades to
// just the status/mode tag.
// ──────────────────────────────────────────────────────────────────────────
import "../styles/academyScreens.css";
import "../styles/quiz.css";

export default function QuizCard({
  subject,
  subjSlot,
  title,
  teacher,
  deadline,
  mode,
  isCompleted,
  inProgress,
  badge,
  scoreLabel,
  onClick,
}) {
  const statusTag = isCompleted
    ? { tone: "success", label: `Completed${scoreLabel ? ` · ${scoreLabel}` : ""}` }
    : inProgress
      ? { tone: "warning", label: "In progress" }
      : mode === "Practice"
        ? { tone: "info", label: "Practice" }
        : null;

  return (
    <div className="ac-card qz-card" onClick={onClick}>
      <div className="ac-card__top">
        {subject && (
          <span className={`subj-chip subj-chip--${subjSlot ?? 0}`}>{subject}</span>
        )}
        {statusTag && <span className={`ac-tag ac-tag--${statusTag.tone}`}>{statusTag.label}</span>}
      </div>

      <div>
        <div className="ac-card__title">{title}</div>
        <div className="ac-card__meta">{teacher}</div>
        <div className="ac-card__meta">{badge ? `${deadline} · ${badge}` : deadline}</div>
      </div>

      <div className="ac-card__foot">
        <span className="ac-card__footText">
          {isCompleted ? "Tap to review or re-attempt" : ""}
        </span>
        <div className="ac-card__actions">
          <button type="button" className="ac-cardBtn ac-cardBtn--primary" onClick={onClick}>
            {isCompleted
              ? "Review"
              : inProgress
                ? "Resume"
                : mode === "Practice"
                  ? "Practice"
                  : "Start quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
