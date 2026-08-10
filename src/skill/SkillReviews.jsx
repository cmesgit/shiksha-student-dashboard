// skill/SkillReviews.jsx — Skill Dev Student.dc.html dc:687-745.
// One white "My reviews" card holds every review as a nested bordered box
// (no background of its own) in a 620px-wide left-aligned column.
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

  const startEdit = (r) => { setEditId(r.id); setDeleteId(null); setDraft({ rating: r.rating, body: r.body || "" }); };
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
      <div className="sr-gridWrap">
      <div className="sr-outerCard">
        <h3 className="sr-subhead">My reviews</h3>

        {loading ? (
          <LoadingState label="Loading your reviews" />
        ) : reviews.length === 0 ? (
          <div className="sr-empty">You haven&apos;t left any reviews yet.</div>
        ) : (
          <div className="sr-list">
            {reviews.map((r) => (
              <div key={r.id} className="sr-card">
                <div className="sr-cardHead">
                  <Avatar name={r.expert_name} size={34} />
                  <div className="sr-headText">
                    <div className="sr-eyebrow">A review for</div>
                    <div className="sr-name">{r.expert_name}</div>
                    <div className="sr-date">{fmtDate(r.created_at)}{r.is_edited && " · edited"}</div>
                  </div>
                  {editId !== r.id && <span className="sr-headStars"><Stars n={r.rating} /></span>}
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
                ) : (
                  <>
                    {r.body && <div className="sr-bodyText">{r.body}</div>}
                    <div className="sr-rowActions">
                      <button className="sr-btn sr-btn--edit" onClick={() => startEdit(r)}>Edit</button>
                      <button className="sr-btn sr-btn--delete" onClick={() => setDeleteId(r.id)}>Delete</button>
                    </div>
                    {deleteId === r.id && (
                      <div className="sr-deleteConfirm">
                        <div className="sr-deleteText">Delete this review permanently?</div>
                        <div className="sr-editActions">
                          <button className="sr-btn sr-btn--danger" disabled={deleting} onClick={confirmDelete}>
                            {deleting ? "Deleting…" : "Delete review"}
                          </button>
                          <button className="sr-btn sr-btn--outline" disabled={deleting} onClick={() => setDeleteId(null)}>Keep it</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
