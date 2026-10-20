// PLACEMENT: src/pages/counselling/ReviewWidget.jsx   (NEW FILE — student dashboard)
//
// Workflow §8 "Rate & review" — 1–5 stars plus an optional written review on
// a COMPLETED session, with edit and delete once submitted.
//
// Writing here is what moves the counsellor's public average: the endpoint
// recomputes CounselorProfile.avg_rating from the reviews table on every
// write and delete (see counseling/models.py recalc_counselor_rating).
// That is why delete is offered at all — a student who mis-tapped a 1-star
// must be able to take it back rather than live with it.

import React, { useState } from "react";
import { deleteReview, saveReview } from "../../api/counsellingService";

function Stars({ value, onPick, readOnly = false }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className={`rv-stars${readOnly ? " rv-stars--ro" : ""}`}
      onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          className={`rv-star${n <= shown ? " rv-star--on" : ""}`}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          aria-pressed={!readOnly && n === value}
          onMouseEnter={() => !readOnly && setHover(n)}
          onClick={() => !readOnly && onPick(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ReviewWidget({ appointment, onSaved }) {
  const existing = appointment.review || null;
  const [editing, setEditing] = useState(!existing);
  const [rating, setRating] = useState(existing?.rating || 0);
  const [comment, setComment] = useState(existing?.comment || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const submit = async () => {
    if (!rating) { setError("Pick a star rating first."); return; }
    setBusy(true); setError("");
    try {
      const saved = await saveReview(appointment.id, { rating, comment });
      setEditing(false);
      setMenuOpen(false);
      onSaved({ ...appointment, review: saved });
    } catch {
      setError("Couldn't save your rating — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true); setError("");
    try {
      await deleteReview(appointment.id);
      setRating(0); setComment(""); setEditing(true); setMenuOpen(false);
      onSaved({ ...appointment, review: null });
    } catch {
      setError("Couldn't remove your rating — try again.");
    } finally {
      setBusy(false);
    }
  };

  // Submitted and not being edited — the read-only summary with a ⋯ menu.
  if (existing && !editing) {
    return (
      <div className="rv-box rv-box--done">
        <div className="rv-done-head">
          <Stars value={existing.rating} readOnly />
          <span className="rv-done-label">Your rating</span>
          <div className="rv-menu-wrap">
            <button className="rv-menu-btn" aria-label="Rating options"
              aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>⋯</button>
            {menuOpen && (
              <div className="rv-menu">
                <button onClick={() => { setEditing(true); setMenuOpen(false); }}>Edit</button>
                <button className="rv-menu-danger" disabled={busy} onClick={remove}>Delete</button>
              </div>
            )}
          </div>
        </div>
        {existing.comment && <p className="rv-done-text">{existing.comment}</p>}
        {error && <div className="rv-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="rv-box">
      <div className="rv-prompt">
        {existing ? "Update your rating" : "How was this session?"}
      </div>
      <Stars value={rating} onPick={(n) => { setRating(n); setError(""); }} />
      <textarea
        className="rv-text"
        placeholder="What was helpful? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <div className="rv-error">{error}</div>}
      <div className="rv-actions">
        <button className="mc-btn" disabled={busy} onClick={submit}>
          {busy ? "Saving…" : existing ? "Save changes" : "Submit rating"}
        </button>
        {existing && (
          <button className="mc-btn mc-btn--outline" disabled={busy}
            onClick={() => {
              setRating(existing.rating); setComment(existing.comment || "");
              setEditing(false); setError("");
            }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
