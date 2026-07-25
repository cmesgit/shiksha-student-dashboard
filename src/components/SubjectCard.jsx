import "../styles/subjectCard.css";
import { subjectChipPalette } from "../utils/subjectChips";

export function subjectInitials(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "S";
  return trimmed.slice(0, 1).toUpperCase() + (trimmed.slice(1, 2).toLowerCase() || "");
}

export default function SubjectCard({
  subject,
  teacher,
  progressPercent,
  chaptersDone,
  chaptersTotal,
  pendingCount,
  taskCount,
  taskLabel,
  footText,
  actionLabel = "Open",
  onClick,
}) {
  const { bg, ink } = subjectChipPalette(subject);

  const chip =
    pendingCount != null && pendingCount > 0
      ? { label: `${pendingCount} pending`, bg: "#fef3ec", color: "#c2701c" }
      : taskCount != null && taskLabel
      ? { label: `${taskCount} ${taskLabel}${taskCount === 1 ? "" : "s"}`, bg: "#e8edfb", color: "#1d4ed8" }
      : null;

  const hasBar = progressPercent !== undefined && progressPercent !== null;

  const resolvedFootText =
    footText !== undefined
      ? footText
      : chaptersDone != null && chaptersTotal != null
      ? `${chaptersDone}/${chaptersTotal} chapters`
      : null;

  return (
    <div className="cardTile" onClick={onClick} title={subject} role="button" tabIndex={0}>
      <div className="cardTile__top">
        <div className="cardTile__avatar" style={{ background: bg, color: ink }}>
          {subjectInitials(subject)}
        </div>
        {chip && (
          <span className="cardTile__chip" style={{ background: chip.bg, color: chip.color }}>
            {chip.label}
          </span>
        )}
      </div>

      <div className="cardTile__body">
        <h3 className="cardTile__title" title={subject}>
          {subject}
        </h3>
        <p className="cardTile__meta" title={teacher}>
          {teacher || "No teacher assigned"}
        </p>
      </div>

      {hasBar && (
        <div className="cardTile__progress">
          <div className="cardTile__progressTrack">
            <div
              className="cardTile__progressFill"
              style={{ width: `${Math.min(100, progressPercent || 0)}%` }}
            />
          </div>
          <span className="cardTile__progressLabel">{progressPercent}%</span>
        </div>
      )}

      <div className="cardTile__footer">
        <span className="cardTile__footText">{resolvedFootText}</span>
        <button type="button" className="cardTile__btn" onClick={onClick} tabIndex={-1}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
