// skill/SkillReviews.jsx — "My Reviews" (Learner Skill Dev).
// Lists the reviews this learner has written for tutors, with inline editing.
// Wired to:
//   GET   /skill/my-reviews/              → { count, reviews[] }
//   PATCH /skill/my-reviews/<id>/         → edit rating + body
import { useState, useEffect } from "react";
import { Icon } from "./skillIcons";
import { Avatar } from "./skillUI";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "../components/StateViews";

const ACC = "#ff8f01";

function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}

/* Interactive star row for the edit form. */
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button"
          onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, lineHeight: 1, padding: 1, color: n <= (hover || value) ? ACC : "#d1d5db" }}>
          ★
        </button>
      ))}
    </div>
  );
}

/* Static star row for display. */
function Stars({ n }) {
  return (
    <span style={{ color: ACC, fontSize: 13, letterSpacing: 1 }}>
      {"★".repeat(n)}<span style={{ color: "#d9d9d9" }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default function SkillReviews() {
  const { api } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editId,   setEditId]   = useState(null);
  const [draft,    setDraft]    = useState({ rating: 0, body: "" });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    api.get("/skill/my-reviews/")
      .then(r => setReviews(r.data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  const startEdit = (r) => { setEditId(r.id); setDraft({ rating: r.rating, body: r.body || "" }); };
  const cancel    = () => { setEditId(null); setSaving(false); };

  const save = async (id) => {
    if (!draft.rating) return;
    setSaving(true);
    try {
      const r = await api.patch(`/skill/my-reviews/${id}/`, { rating: draft.rating, body: draft.body });
      setReviews(list => list.map(x => x.id === id ? { ...x, rating: r.data.rating, body: r.data.body } : x));
      setEditId(null);
    } catch {
      /* keep the editor open on failure */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1 }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontFamily: "var(--font-head, Montserrat)", fontWeight: 900, fontSize: 22, color: "#0e1c0f", letterSpacing: "-.5px", margin: 0 }}>My Reviews</h1>
        <p style={{ fontSize: 12.5, color: "rgba(14,28,15,.55)", margin: "4px 0 0" }}>Reviews you&apos;ve left for your tutors. You can edit them any time.</p>
      </div>

      {loading ? (
        <LoadingState label="Loading your reviews" />
      ) : reviews.length === 0 ? (
        <div className="rd-card" style={{ textAlign: "center", padding: "30px 16px" }}>
          <div style={{ fontSize: 13, color: "#888" }}>You haven&apos;t written any reviews yet.</div>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>After a session ends, you can review your tutor from <b>My Sessions → Past</b>.</div>
        </div>
      ) : reviews.map((r) => (
        <div key={r.id} className="rd-card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
            <Avatar name={r.expert_name} size={44} radius={11} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1a2c33" }}>{r.expert_name}</div>
                  <div style={{ fontSize: 11.5, color: "#9aa9af", marginTop: 1 }}>{r.topic} · {fmtDate(r.created_at)}</div>
                </div>
                {editId !== r.id && (
                  <button onClick={() => startEdit(r)}
                    style={{ background: "#fff", border: "1px solid #f0d7b6", color: "#d97706", borderRadius: 9, padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    <Icon.doc size={13} /> Edit
                  </button>
                )}
              </div>

              {editId === r.id ? (
                <div style={{ marginTop: 10 }}>
                  <StarPicker value={draft.rating} onChange={(n) => setDraft(d => ({ ...d, rating: n }))} />
                  <textarea
                    value={draft.body}
                    onChange={(e) => setDraft(d => ({ ...d, body: e.target.value }))}
                    rows={3}
                    placeholder="Share what the session was like…"
                    style={{ width: "100%", marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #e3dccf", fontSize: 13, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", color: "#1a2c33" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button onClick={() => save(r.id)} disabled={saving || !draft.rating}
                      style={{ background: ACC, color: "#fff", border: "none", borderRadius: 9, padding: "8px 18px", fontSize: 12.5, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: (!draft.rating || saving) ? 0.6 : 1 }}>
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    <button onClick={cancel} disabled={saving}
                      style={{ background: "#fff", color: "#555", border: "1px solid #e3dccf", borderRadius: 9, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 7 }}>
                  <Stars n={r.rating} />
                  {r.body && <p style={{ fontSize: 13, color: "#516066", lineHeight: 1.6, margin: "7px 0 0" }}>{r.body}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
