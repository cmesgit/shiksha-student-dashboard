// src/components/BatchPickerModal.jsx
// ──────────────────────────────────────────────────────────────────────────
// Shown mid-enrollment when a course has batches configured (Morning/
// Afternoon/Evening/Night etc — see courses.models.Batch on the backend).
// Reuses renewSubscriptionModal.css's modal chrome so there's no new
// container styling to maintain; only the option-pill styles below are new.
// ──────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import "../styles/renewSubscriptionModal.css";
import "../styles/batchPickerModal.css";

export default function BatchPickerModal({ course, batches, onClose, onChoose }) {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await onChoose(selected);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="renewModal__backdrop" onClick={onClose}>
      <div className="renewModal" onClick={(e) => e.stopPropagation()}>
        <div className="renewModal__header">
          <h2>Choose your batch</h2>
          <button
            type="button"
            className="renewModal__closeBtn"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="renewModal__intro">
          <strong>{course.title}</strong> runs in multiple batches — pick the
          one that works for you.
        </p>

        <div className="batchPicker__options">
          {batches.map((b) => (
            <button
              type="button"
              key={b.id}
              className={`batchPicker__option${selected === b.id ? " is-selected" : ""}`}
              disabled={b.is_full}
              onClick={() => setSelected(b.id)}
            >
              <span className="batchPicker__name">{b.name}</span>
              {b.is_full ? (
                <span className="batchPicker__seats batchPicker__seats--full">Full</span>
              ) : b.capacity ? (
                <span className="batchPicker__seats">
                  {Math.max(b.capacity - b.seats_taken, 0)} seats left
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="renewModal__actions">
          <button
            type="button"
            className="renewModal__btn renewModal__btn--secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="renewModal__btn renewModal__btn--primary"
            onClick={handleContinue}
            disabled={!selected || submitting}
          >
            {submitting ? "Continuing…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
