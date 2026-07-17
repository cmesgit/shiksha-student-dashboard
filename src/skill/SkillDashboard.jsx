// PLACEMENT: student_dashboard/src/skill/SkillDashboard.jsx  (replace whole file)
// skill/SkillDashboard.jsx — Skill Dev overview (skillTab === "dashboard").
// Wired to GET /skill/student/dashboard/
// Falls back gracefully to empty state if data isn't ready.

import { useState, useEffect } from "react";
import { Icon } from "./skillIcons";
import { Avatar } from "./skillUI";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "../components/StateViews";

const ACC = "#ff8f01";

function Stat({ icon, value, label, loading }) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(9,62,5,.16)", borderRadius: 13, padding: "13px 14px" }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: "#fff3e3", color: ACC, display: "grid", placeItems: "center", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: "var(--font-head, Montserrat)", fontWeight: 900, fontSize: 23, color: "#0e1c0f", letterSpacing: "-.6px" }}>
        {loading ? "—" : value}
      </div>
      <div style={{ fontSize: 11, color: "rgba(14,28,15,.6)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

const EMPTY = {
  stats: { lessons_done: 0, hours_learned: 0, upcoming_count: 0 },
  upcoming_sessions: [], experts: [],
};

export default function SkillDashboard({ setTab = () => {}, openMsg = () => {} }) {
  const { api } = useAuth();
  const [data,    setData]    = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/skill/student/dashboard/")
      .then(r => setData({ ...EMPTY, ...r.data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { stats, upcoming_sessions, experts } = data;

  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1 }}>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 13 }}>
        <Stat loading={loading} icon={<Icon.check size={16} />} value={stats.lessons_done}    label="Lessons done" />
        <Stat loading={loading} icon={<Icon.clock size={16} />} value={`${stats.hours_learned}h`} label="Hours learned" />
        <Stat loading={loading} icon={<Icon.cal size={16} />}   value={stats.upcoming_count}  label="Upcoming" />
      </div>

      {/* Next up */}
      <div className="rd-card" style={{ marginBottom: 13 }}>
        <h4>Next up</h4>
        {loading ? (
          <LoadingState plain label="Loading" />
        ) : upcoming_sessions.length === 0 ? (
          <div style={{ fontSize: 12, color: "#888" }}>No upcoming sessions. <button onClick={() => setTab("book")} style={{ background: "none", border: "none", color: ACC, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Book a tutor →</button></div>
        ) : upcoming_sessions.slice(0, 3).map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid #efe2d6", borderRadius: 12, marginBottom: 9, background: "#fff" }}>
            <Avatar name={s.expert_name} img={s.expert_img} size={44} radius={11} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1a2c33" }}>{s.topic}</div>
              <div style={{ fontSize: 11.5, color: "#888" }}>with {s.expert_name}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 5, fontSize: 11.5, color: "#6b7c83" }}>
                <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Icon.cal size={12} /> {s.when || "TBC"}</span>
              </div>
            </div>
            <button onClick={() => openMsg(s.expert_teacher_id, s.expert_name)} disabled={!s.expert_teacher_id} title="Message" style={{ background: "#fff", border: "1px solid #f0d7b6", color: "#d97706", borderRadius: 9, width: 36, height: 36, cursor: s.expert_teacher_id ? "pointer" : "not-allowed", opacity: s.expert_teacher_id ? 1 : 0.45, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon.msg size={15} />
            </button>
            {s.live
              ? <button onClick={() => window.location.href = `/skill-dev/sessions`} style={{ background: ACC, color: "#fff", border: "none", borderRadius: 9, padding: "9px 15px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Join</button>
              : <button onClick={() => setTab("sessions")} style={{ background: "#fff", border: "1px solid #e3dccf", color: "#555", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Details</button>}
          </div>
        ))}
      </div>

      {/* Experts you follow */}
      <div className="rd-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
          <h4 style={{ margin: 0 }}>Experts you work with</h4>
          <button onClick={() => setTab("explore")} style={{ background: "none", border: "none", color: "#d97706", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Explore →</button>
        </div>
        {loading ? (
          <LoadingState plain label="Loading" />
        ) : experts.length === 0 ? (
          <div style={{ fontSize: 12, color: "#888" }}>No experts yet. Book a session to get started.</div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {experts.slice(0, 4).map((t) => (
              <div key={t.id} style={{ flex: 1, minWidth: 150, display: "flex", gap: 10, alignItems: "center", border: "1px solid #efe2d6", borderRadius: 12, padding: 10 }}>
                <Avatar name={t.name} img={t.img} size={40} radius={10} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                  <div style={{ fontSize: 10.5, color: "#999", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon.star size={10} /> {t.rating ?? "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
