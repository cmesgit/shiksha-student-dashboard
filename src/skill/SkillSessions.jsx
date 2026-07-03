// PLACEMENT: student_dashboard/src/skill/SkillSessions.jsx   (REPLACE WHOLE FILE)
// DEPLOY:    /app/student_dashboard/src/skill/SkillSessions.jsx
//
// Change from previous version (ONLY the join handler):
//   - "Join" no longer pre-joins then navigates to /private-session/live/<id>
//     (the ACADEMY live page, which 404s on a skill-session id).
//   - It now navigates straight to /skill-session/live/<id> (the new skill
//     LiveKit room page). That page performs POST /skill/sessions/<id>/join/
//     and mounts the LiveKit room. No throwaway pre-join here.
// Everything else is identical to the previous version.

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./skillIcons";
import { Avatar } from "./skillUI";
import { useAuth } from "../contexts/AuthContext";
import SkillReviewModal from "../components/SkillReviewModal";

const ACC = "#ff8f01";

export default function SkillSessions({ setTab = () => {}, openMsg = () => {} }) {
  const { api }  = useAuth();
  const navigate = useNavigate();

  const [upcoming, setUpcoming] = useState([]);
  const [past,     setPast]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [reviewFor, setReviewFor] = useState(null);   // session being reviewed inline

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    api.get("/skill/student/dashboard/")
      .then(r => {
        setUpcoming(r.data.upcoming_sessions || []);
        setPast(r.data.past_sessions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    load();
    // Poll so a "Join now" appears shortly after the tutor starts the class,
    // without the student having to refresh.
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [load]);

  // The live room page (SkillSessionLive) owns the join handshake.
  const joinSession = (sessionId) => navigate(`/skill-session/live/${sessionId}`);

  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1 }}>
      <SkillReviewModal onDone={() => load(true)} />

      {/* Upcoming sessions */}
      <div className="rd-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>Upcoming 1-on-1 sessions</h4>
          <button onClick={() => setTab("book")} style={{ background: "none", border: "none", color: "#d97706", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Book a tutor →
          </button>
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: "#888" }}>Loading…</div>
        ) : upcoming.length === 0 ? (
          <div style={{ fontSize: 12, color: "#888", padding: "8px 0" }}>
            No upcoming sessions.{" "}
            <button onClick={() => setTab("book")} style={{ background: "none", border: "none", color: ACC, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
              Book one →
            </button>
          </div>
        ) : upcoming.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: 13, border: "1px solid #efe2d6", borderRadius: 13, marginBottom: 10, background: "#fff" }}>
            <Avatar name={s.expert_name} img={s.expert_img} size={48} radius={11} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1a2c33" }}>{s.topic}</div>
              <div style={{ fontSize: 11.5, color: "#888" }}>with {s.expert_name}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11.5, color: "#6b7c83" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon.cal size={12} /> {s.when || "TBC"}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon.clock size={12} /> {s.dur}</span>
              </div>
            </div>
            <button
              onClick={() => openMsg(s.expert_teacher_id, s.expert_name)}
              title="Message"
              disabled={!s.expert_teacher_id}
              style={{
                background: "#fff", border: "1px solid #f0d7b6", color: "#d97706",
                borderRadius: 9, width: 38, height: 38,
                cursor: s.expert_teacher_id ? "pointer" : "not-allowed",
                display: "grid", placeItems: "center", flexShrink: 0,
                opacity: s.expert_teacher_id ? 1 : 0.35,
              }}
            >
              <Icon.msg size={15} />
            </button>
            {s.live ? (
              <button
                onClick={() => joinSession(s.id)}
                style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0 }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 0 rgba(255,255,255,.7)", animation: "none" }} />
                <Icon.vid size={14} /> Join · Live now
              </button>
            ) : s.joinable ? (
              <button
                onClick={() => joinSession(s.id)}
                style={{ background: ACC, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0 }}
              >
                <Icon.vid size={14} /> Join
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {s.status === "requested" && (
                  <span title="Waiting for the tutor to accept" style={{ fontSize: 10.5, fontWeight: 800, color: "#b46a00", background: "#ff8f0122", padding: "4px 9px", borderRadius: 100, whiteSpace: "nowrap" }}>
                    Pending
                  </span>
                )}
                <button
                  onClick={() => navigate(`/skill-dev/sessions/${s.id}`)}
                  style={{ background: "#fff", border: "1px solid #e3dccf", color: "#555", borderRadius: 9, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Details
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Past sessions */}
      <div className="rd-card">
        <h4>Past sessions</h4>
        {loading ? (
          <div style={{ fontSize: 12, color: "#888" }}>Loading…</div>
        ) : past.length === 0 ? (
          <div style={{ fontSize: 12, color: "#888" }}>No completed sessions yet.</div>
        ) : past.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #eee" }}>
            <Avatar name={s.expert_name} img={s.expert_img} size={42} radius={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{s.topic}</div>
              <div style={{ fontSize: 11.5, color: "#888" }}>with {s.expert_name} · {s.when}</div>
            </div>
            <button
              onClick={() => openMsg(s.expert_teacher_id, s.expert_name)}
              title="Message"
              disabled={!s.expert_teacher_id}
              style={{
                background: "none", border: "none", color: "#d97706",
                cursor: s.expert_teacher_id ? "pointer" : "default",
                opacity: s.expert_teacher_id ? 1 : 0.35, padding: "4px 8px",
              }}
            >
              <Icon.msg size={15} />
            </button>
            <button
              onClick={() => navigate(`/skill-dev/sessions/${s.id}`)}
              style={{ background: "none", border: "none", color: "#888", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 8px", textDecoration: "underline" }}
            >
              Details
            </button>
            {s.reviewed
              ? <span style={{ fontSize: 11.5, color: "#2f9d42", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon.check size={13} /> Reviewed</span>
              : <button onClick={() => setReviewFor(s)} style={{ background: ACC, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon.star size={12} /> Leave review
                </button>
            }
          </div>
        ))}
      </div>
      {reviewFor && (
        <ReviewOverlay
          session={reviewFor}
          api={api}
          onClose={() => setReviewFor(null)}
          onSaved={() => {
            setPast(list => list.map(x => x.id === reviewFor.id ? { ...x, reviewed: true } : x));
            setReviewFor(null);
            load(true);
          }}
        />
      )}
    </div>
  );
}

/* Small modal for reviewing a specific past session from the list.
   One review per session — the server rejects duplicates, and success/duplicate
   both flip the row to "Reviewed" so the button can't be spammed. */
function ReviewOverlay({ session, api, onClose, onSaved }) {
  const [rating, setRating] = useState(0);
  const [body, setBody]     = useState("");
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState("");

  const submit = async () => {
    if (!rating || busy) return;
    setBusy(true); setErr("");
    try {
      await api.post(`/skill/sessions/${session.session_id || session.id}/review/`, { rating, body });
      onSaved();
    } catch (e) {
      const flat = JSON.stringify(e?.response?.data || "");
      if (flat.toLowerCase().includes("already reviewed")) onSaved();
      else setErr("Couldn't submit your review. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,10,5,.45)", zIndex: 300, display: "grid", placeItems: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "22px 20px", width: "100%", maxWidth: 400, boxShadow: "0 18px 50px rgba(0,0,0,.25)" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#1a2c33" }}>Review your session</div>
        <div style={{ fontSize: 12.5, color: "#888", marginTop: 3 }}>with {session.expert_name}</div>
        <div style={{ display: "flex", gap: 4, margin: "14px 0 4px" }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} type="button" onClick={() => setRating(n)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 30, padding: 2, color: n <= rating ? ACC : "#d1d5db" }}>★</button>
          ))}
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
          placeholder="What was the session like?"
          style={{ width: "100%", boxSizing: "border-box", marginTop: 8, border: "1.5px solid #e3dccf", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", resize: "vertical" }} />
        {err && <div style={{ marginTop: 8, fontSize: 12.5, color: "#c0492f", fontWeight: 600 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={submit} disabled={!rating || busy}
            style={{ flex: 1, background: ACC, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 800, cursor: !rating||busy?"default":"pointer", opacity: !rating||busy?0.6:1 }}>
            {busy ? "Submitting…" : "Submit review"}
          </button>
          <button onClick={onClose} disabled={busy}
            style={{ background: "#fff", border: "1px solid #e3dccf", color: "#555", borderRadius: 10, padding: "11px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
