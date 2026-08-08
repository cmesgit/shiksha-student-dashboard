// skill/SkillReviews.jsx — "Reviews & reputation" (design_handoff_skilldev
// README.md "8. Reviews"), verified against the live standalone prototype.
// Single column, max 620px; each card: avatar, amber eyebrow "A REVIEW FOR",
// teacher name, date (+" · edited"), star string, body, Edit/Delete.
//
// GET    /skill/my-reviews/              → { reviews[] }
// PATCH  /skill/my-reviews/<id>/         → edit rating + body
// DELETE /skill/my-reviews/<id>/         → permanent delete

import { useState, useEffect } from "react";
import { Avatar } from "./SkillUI";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "../components/StateViews";
import { useSkillToast } from "../components/useSkillToast";
import "../styles/skillReviews.css";

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return ""; }
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="sr-starPicker">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)} className={`sr-starBtn ${n <= (hover || value) ? "is-filled" : ""}`}>★</button>
      ))}
    </div>
  );
}

function Stars({ n }) {
  return <span className="sr-stars">{"★".repeat(n)}<span className="sr-starsEmpty">{"★".repeat(5 - n)}</span></span>;
}

export default function SkillReviews() {
  const { api } = useAuth();
  const showToast = useSkillToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({ rating: 0, body: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get("/skill/my-reviews/")
      .then(r => setReviews(r.data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  const startEdit = (r) => { setEditId(r.id); setDraft({ rating: r.rating, body: r.body || "" }); };
  const cancelEdit = () => { setEditId(null); setSaving(false); };

  const save = async (id) => {
    if (!draft.rating) return;
    setSaving(true);
    try {
      const r = await api.patch(`/skill/my-reviews/${id}/`, { rating: draft.rating, body: draft.body });
      setReviews((list) => list.map((x) => (x.id === id ? { ...x, rating: r.data.rating, body: r.data.body, is_edited: true } : x)));
      setEditId(null);
    } catch { /* keep editor open on failure */ }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/skill/my-reviews/${deleteId}/`);
      setReviews((list) => list.filter((x) => x.id !== deleteId));
      showToast("Review deleted.");
    } catch {
      showToast("Couldn't delete — please try again.");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="sr-screen">
      <h1 className="sr-title">Reviews & reputation</h1>
      <h3 className="sr-subhead">My reviews</h3>

      {loading ? (
        <LoadingState label="Loading your reviews" />
      ) : reviews.length === 0 ? (
        <div className="sr-empty">You haven&apos;t left any reviews yet.</div>
      ) : reviews.map((r) => (
        <div key={r.id} className="sr-card">
          <div className="sr-cardHead">
            <Avatar name={r.expert_name} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sr-eyebrow">A review for</div>
              <div className="sr-name">{r.expert_name}</div>
              <div className="sr-date">{fmtDate(r.created_at)}{r.is_edited && " · edited"}</div>
            </div>
          </div>

          {editId === r.id ? (
            <div className="sr-editArea">
              <StarPicker value={draft.rating} onChange={(n) => setDraft((d) => ({ ...d, rating: n }))} />
              <textarea
                className="sr-textarea"
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                rows={4}
                placeholder="Share what the session was like…"
              />
              <div className="sr-editActions">
                <button className="sr-btn sr-btn--primary" disabled={saving || !draft.rating} onClick={() => save(r.id)}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button className="sr-btn sr-btn--outline" disabled={saving} onClick={cancelEdit}>Cancel</button>
              </div>
            </div>
          ) : deleteId === r.id ? (
            <div className="sr-deleteConfirm">
              <div className="sr-deleteText">Delete this review permanently?</div>
              <div className="sr-editActions">
                <button className="sr-btn sr-btn--danger" disabled={deleting} onClick={confirmDelete}>
                  {deleting ? "Deleting…" : "Delete review"}
                </button>
                <button className="sr-btn sr-btn--outline" disabled={deleting} onClick={() => setDeleteId(null)}>Keep it</button>
              </div>
            </div>
          ) : (
            <>
              <div className="sr-body">
                <Stars n={r.rating} />
                {r.body && <p className="sr-bodyText">{r.body}</p>}
              </div>
              <div className="sr-rowActions">
                <button className="sr-link" onClick={() => startEdit(r)}>Edit</button>
                <button className="sr-link sr-link--danger" onClick={() => setDeleteId(r.id)}>Delete</button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
