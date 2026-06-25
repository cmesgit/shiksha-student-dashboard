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

import { useState, useEffect } from "react";
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

  useEffect(() => {
    api.get("/skill/student/dashboard/")
      .then(r => {
        setUpcoming(r.data.upcoming_sessions || []);
        setPast(r.data.past_sessions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // The live room page (SkillSessionLive) owns the join handshake.
  const joinSession = (sessionId) => navigate(`/skill-session/live/${sessionId}`);

  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1 }}>
      <SkillReviewModal />

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
              : <button style={{ background: ACC, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon.star size={12} /> Leave review
                </button>
            }
          </div>
        ))}
      </div>
    </div>
  );
}
