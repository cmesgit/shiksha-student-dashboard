// src/components/SkillDevStudentSection.jsx
// Rendered by Dashboard.jsx when activeTrack === "skill".
// Receives the same `data` object that Dashboard.jsx already fetches
// from /dashboard/?course_id=... so no extra API call is needed.
//
// Expected shape (all optional — falls back to empty):
//   data.skill_courses        []  {name, expert_name, sessions_done, sessions_total, progress_pct, id}
//   data.upcoming_sessions    []  {subject, topic, display_time}
//   data.experts              []  {name, skill, id}
//   data.enrolled_count       number
//   data.lessons_done         number
//   data.hours_learned        number
//   data.upcoming_count       number
//
// If the backend sends these fields already inside the existing /dashboard/
// response — great, nothing changes. If not, they fall back to 0 / [] and
// the UI shows empty states until the endpoint is updated.

import { useNavigate } from "react-router-dom";
import {
  BookOpen, Clock, Calendar, CheckCircle,
  Zap, MessageSquare
} from "lucide-react";

/* ── Tokens ────────────────────────────────────────────────────────── */
const C = {
  forestDk:  "#003223",
  forest:    "#125027",
  forestMid: "#1b9c85",
  orange:    "#ff8f01",
  cream2:    "#f7f1de",
  border:    "rgba(9,62,5,.13)",
  ink:       "#0e1c0f",
  soft:      "rgba(14,28,15,.52)",
};
const MH = '"Montserrat", system-ui, sans-serif';
const MP = '"Poppins", system-ui, sans-serif';

/* ── Atoms ─────────────────────────────────────────────────────────── */
function Bar({ pct }) {
  return (
    <div style={{ height: 5, borderRadius: 100, background: "rgba(9,62,5,.10)", overflow: "hidden", margin: "8px 0 4px" }}>
      <div style={{ width: `${Math.min(100, pct ?? 0)}%`, height: "100%", borderRadius: 100, background: C.orange }} />
    </div>
  );
}
function Chip({ text, bg = C.cream2, color = C.forest }) {
  return (
    <span style={{ fontSize: 10.5, padding: "3px 9px", borderRadius: 6, background: bg, color, fontWeight: 600, fontFamily: MP }}>
      {text}
    </span>
  );
}
function Avatar({ text, size = 34 }) {
  const initials = (text || "?").trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: C.forestDk, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.32, fontWeight: 800, fontFamily: MH }}>
      {initials}
    </div>
  );
}

/* ── Section title ─────────────────────────────────────────────────── */
function SectionHead({ title, action, onClick }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <h3 style={{ fontFamily: MH, fontWeight: 800, fontSize: 15, color: C.ink, letterSpacing: "-.3px", margin: 0 }}>{title}</h3>
      {action && (
        <button onClick={onClick} style={{ all: "unset", cursor: "pointer", fontSize: 12, color: C.forestMid, fontWeight: 600, fontFamily: MP }}>
          {action}
        </button>
      )}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────── */
export default function SkillDevStudentSection({ data }) {
  const navigate = useNavigate();

  // Normalise data — the dashboard endpoint may return these directly
  // or they may be under a skill_dev sub-key depending on your backend.
  const sd = data?.skill_dev ?? data ?? {};

  const courses         = sd.skill_courses      ?? [];
  const sessions        = sd.upcoming_sessions  ?? [];
  const experts         = sd.experts            ?? [];
  const enrolledCount   = sd.enrolled_count     ?? courses.length;
  const lessonsDone     = sd.lessons_done       ?? 0;
  const hoursLearned    = sd.hours_learned      ?? 0;
  const upcomingCount   = sd.upcoming_count     ?? sessions.length;

  const stats = [
    { value: enrolledCount,        label: "Enrolled courses", Icon: BookOpen    },
    { value: lessonsDone,          label: "Lessons done",     Icon: CheckCircle },
    { value: `${hoursLearned}h`,   label: "Hours learned",    Icon: Clock       },
    { value: upcomingCount,        label: "Upcoming",         Icon: Calendar    },
  ];

  return (
    <div style={{ display: "flex", gap: 0, height: "100%" }}>

      {/* ── Main column ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 22px" }}>

        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: MH, fontWeight: 900, fontSize: 26, color: C.ink, letterSpacing: "-.5px", margin: 0 }}>
            Skill Development
          </h1>
          <p style={{ fontSize: 13, color: C.soft, margin: "4px 0 0", fontFamily: MP }}>Your learning dashboard</p>
        </div>

        {/* Overview */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 20px", marginBottom: 22, boxShadow: "0 3px 14px rgba(18,80,39,.05)" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.soft, letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 14, fontFamily: MP }}>Overview</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: "4px 0", borderRight: i < 3 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.cream2, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                  <s.Icon size={16} color={C.forest} strokeWidth={1.8} />
                </div>
                <div style={{ fontFamily: MH, fontWeight: 900, fontSize: 24, color: C.ink, letterSpacing: "-.5px" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.soft, marginTop: 3, lineHeight: 1.3, fontFamily: MP }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Continue learning */}
        <SectionHead title="Continue learning" action="My courses →" onClick={() => navigate("/skill-dev/courses")} />

        {courses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px", color: C.soft, fontSize: 13, background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`, fontFamily: MP }}>
            No active skill courses yet.{" "}
            <button onClick={() => navigate("/skill-dev/explore")} style={{ all: "unset", cursor: "pointer", color: C.forestMid, fontWeight: 600 }}>
              Explore courses →
            </button>
          </div>
        ) : courses.map((c, i) => (
          <div key={c.id ?? i} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "15px 18px", marginBottom: 12, boxShadow: "0 2px 10px rgba(18,80,39,.04)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              {/* Icon */}
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.cream2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Zap size={20} color={C.orange} strokeWidth={2} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: MH, fontWeight: 800, fontSize: 14.5, color: C.ink, letterSpacing: "-.25px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.name || c.course_name}
                </div>
                <div style={{ fontSize: 12, color: C.soft, marginTop: 2, fontFamily: MP }}>
                  Expert · {c.expert_name || c.teacher}
                </div>
                <Bar pct={c.progress_pct ?? 0} />
                <div style={{ fontSize: 11, color: C.soft, fontFamily: MP }}>
                  Session {c.sessions_done ?? 0} of {c.sessions_total ?? "?"} · {c.progress_pct ?? 0}%
                </div>
              </div>

              {/* CTA */}
              <button onClick={() => navigate(`/skill-dev/courses/${c.id}`)} style={{
                all: "unset", cursor: "pointer", padding: "8px 16px", borderRadius: 10,
                background: C.orange, color: "#fff", fontSize: 12.5, fontWeight: 700,
                flexShrink: 0, fontFamily: MP,
              }}>
                Continue
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Right panel ── */}
      <div style={{ width: 272, minWidth: 272, overflowY: "auto", padding: "24px 18px 24px 0" }}>

        {/* Upcoming Sessions */}
        <h3 style={{ fontFamily: MH, fontWeight: 800, fontSize: 14, color: C.ink, letterSpacing: "-.3px", margin: "0 0 12px" }}>Upcoming Sessions</h3>
        {sessions.length === 0
          ? <p style={{ fontSize: 12, color: C.soft, fontFamily: MP }}>No upcoming sessions.</p>
          : sessions.slice(0, 3).map((s, i) => (
            <div key={i} style={{ background: C.orange, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ fontFamily: MH, fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: "-.25px" }}>
                {s.subject || s.skill}
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.8)", marginTop: 3, lineHeight: 1.35, fontFamily: MP }}>
                {s.topic}
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.68)", marginTop: 6, fontWeight: 600, fontFamily: MP }}>
                {s.display_time || s.when || s.date}
              </div>
            </div>
          ))
        }

        {/* Your Experts */}
        <h3 style={{ fontFamily: MH, fontWeight: 800, fontSize: 14, color: C.ink, letterSpacing: "-.3px", margin: "18px 0 12px" }}>Your Experts</h3>
        {experts.length === 0
          ? <p style={{ fontSize: 12, color: C.soft, fontFamily: MP }}>No experts assigned yet.</p>
          : experts.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
              <Avatar text={e.name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: MP }}>
                  {e.name}
                </div>
                <div style={{ fontSize: 11, color: C.soft, marginTop: 1, fontFamily: MP }}>
                  {e.skill || e.subject}
                </div>
              </div>
              <button onClick={() => navigate(`/skill-dev/messages/${e.id}`)} style={{ all: "unset", cursor: "pointer", width: 30, height: 30, borderRadius: 8, background: C.cream2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={14} color={C.forest} />
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
}
