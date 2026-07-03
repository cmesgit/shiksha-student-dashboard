// src/components/SkillDevStudentSection.jsx
// Rendered by Dashboard.jsx when activeTrack === "skill".
//
// This is the Learner Skill Dev "Skill Dashboard". ShikshaCom Skill Dev is a
// 1-on-1 tutoring marketplace — there are NO self-paced courses here, so this
// dashboard is entirely session + tutor focused:
//   • Overview:      Tutors booked · Sessions done · Hours learned · Upcoming
//   • Next session:  the learner's upcoming 1-on-1 sessions (Join / Details)
//   • Your tutors:   experts the learner has booked (Book again / Message)
//
// It fetches its own data from GET /skill/student/dashboard/ (the same endpoint
// the other skill pages use), so it no longer depends on the academy dashboard
// payload being pre-shaped.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/skillDevDashboard.css";

/* ── Icons ─────────────────────────────────────────────────────────── */
const Ic = {
  Users:         () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  CheckCircle:   () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Clock:         () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Calendar:      () => <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Video:         () => <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  MessageSquare: () => <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Star:          () => <svg width={10} height={10} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
};

/* ── Tokens ────────────────────────────────────────────────────────── */
const C = {
  forestDk:  "#431407",
  forest:    "#6b2410",
  forestMid: "#b3402e",
  orange:    "#ff8f01",
  cream2:    "#f3e2da",
  border:    "rgba(67,20,7,.13)",
  ink:       "#26130b",
  soft:      "rgba(38,19,11,.52)",
};
const MH = '"Montserrat", system-ui, sans-serif';
const MP = '"Poppins", system-ui, sans-serif';

/* ── Atoms ─────────────────────────────────────────────────────────── */
function Avatar({ text, img, size = 34 }) {
  if (img) {
    return <img src={img} alt="" style={{ width: size, height: size, borderRadius: size * 0.28, objectFit: "cover", flexShrink: 0 }} />;
  }
  const initials = (text || "?").trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: C.forestDk, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.32, fontWeight: 800, fontFamily: MH }}>
      {initials}
    </div>
  );
}

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
export default function SkillDevStudentSection() {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [data,    setData]    = useState({ stats: {}, upcoming_sessions: [], experts: [] });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  const load = () => {
    setError(false);
    api.get("/skill/student/dashboard/")
      .then(r => setData({
        stats:             r.data.stats || {},
        upcoming_sessions: r.data.upcoming_sessions || [],
        experts:           r.data.experts || [],
      }))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const { stats, upcoming_sessions: sessions, experts } = data;

  const stat = [
    { value: stats.tutors_booked ?? 0,        label: "Tutors booked", Icon: Ic.Users       },
    { value: stats.sessions_done ?? 0,        label: "Sessions done", Icon: Ic.CheckCircle },
    { value: `${stats.session_hours ?? 0}h`,  label: "Hours learned", Icon: Ic.Clock       },
    { value: stats.upcoming_count ?? 0,       label: "Upcoming",      Icon: Ic.Calendar    },
  ];

  const openMsg  = (teacherId, name) =>
    navigate("/skill-messages", { state: teacherId ? { teacherId, expertName: name } : undefined });
  const bookTutor = (expertId) =>
    navigate("/skill-dev/book", { state: expertId ? { expertId } : undefined });

  return (
    <div className="sd-shell">

      {/* ── Main column ── */}
      <div className="sd-main">

        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: MH, fontWeight: 900, fontSize: 26, color: C.ink, letterSpacing: "-.5px", margin: 0 }}>
            Skill Development
          </h1>
          <p style={{ fontSize: 13, color: C.soft, margin: "4px 0 0", fontFamily: MP }}>Your 1-on-1 learning dashboard</p>
        </div>

        {error && !loading && (
          <div style={{ ...emptyBox, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, textAlign: "left", padding: "14px 16px", marginBottom: 16 }}>
            <span>Couldn&apos;t load your dashboard.</span>
            <button onClick={() => { setLoading(true); load(); }}
              style={{ all: "unset", cursor: "pointer", padding: "7px 14px", borderRadius: 9, background: C.orange, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: MP }}>
              Retry
            </button>
          </div>
        )}

        {/* Overview */}
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 20px", marginBottom: 22, boxShadow: "0 3px 14px rgba(18,80,39,.05)" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.soft, letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 14, fontFamily: MP }}>Overview</div>
          <div className="sd-stat-grid">
            {stat.map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: "4px 0", borderRight: i < 3 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.cream2, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", color: C.forest }}>
                  <s.Icon />
                </div>
                <div style={{ fontFamily: MH, fontWeight: 900, fontSize: 24, color: C.ink, letterSpacing: "-.5px" }}>{loading ? "—" : s.value}</div>
                <div style={{ fontSize: 11, color: C.soft, marginTop: 3, lineHeight: 1.3, fontFamily: MP }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Next session */}
        <SectionHead title="Next session" action="View all →" onClick={() => navigate("/skill-dev/sessions")} />

        {loading ? (
          <div style={emptyBox}>Loading your sessions…</div>
        ) : sessions.length === 0 ? (
          <div style={emptyBox}>
            No upcoming sessions.{" "}
            <button onClick={() => navigate("/skill-dev/explore")} style={{ all: "unset", cursor: "pointer", color: C.forestMid, fontWeight: 600 }}>
              Explore tutors →
            </button>
          </div>
        ) : sessions.slice(0, 3).map((s) => (
          <div key={s.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "15px 18px", marginBottom: 12, boxShadow: "0 2px 10px rgba(18,80,39,.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar text={s.expert_name} img={s.expert_img} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: MH, fontWeight: 800, fontSize: 14.5, color: C.ink, letterSpacing: "-.25px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.topic || "1-on-1 session"}
                </div>
                <div style={{ fontSize: 12, color: C.soft, marginTop: 2, fontFamily: MP }}>with {s.expert_name}</div>
                <div style={{ fontSize: 11.5, color: C.soft, marginTop: 5, fontWeight: 600, fontFamily: MP, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Ic.Calendar /> {s.when || "Time TBC"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => openMsg(s.expert_teacher_id, s.expert_name)} disabled={!s.expert_teacher_id} title="Message tutor"
                  style={{ all: "unset", cursor: s.expert_teacher_id ? "pointer" : "not-allowed", opacity: s.expert_teacher_id ? 1 : 0.4, width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.forest }}>
                  <Ic.MessageSquare />
                </button>
                {s.live ? (
                  <button onClick={() => navigate(`/skill-session/live/${s.session_id || s.id}`)}
                    style={{ all: "unset", cursor: "pointer", padding: "9px 16px", borderRadius: 10, background: C.orange, color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: MP, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Ic.Video /> Join
                  </button>
                ) : (
                  <button onClick={() => navigate(`/skill-dev/sessions/${s.session_id || s.id}`)}
                    style={{ all: "unset", cursor: "pointer", padding: "9px 16px", borderRadius: 10, background: "#fff", border: `1px solid ${C.border}`, color: "#516066", fontSize: 12.5, fontWeight: 700, fontFamily: MP }}>
                    Details
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Right panel: Your tutors ── */}
      <div className="sd-aside">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontFamily: MH, fontWeight: 800, fontSize: 14, color: C.ink, letterSpacing: "-.3px", margin: 0 }}>Your tutors</h3>
          <button onClick={() => navigate("/skill-dev/explore")} style={{ all: "unset", cursor: "pointer", fontSize: 12, color: C.forestMid, fontWeight: 600, fontFamily: MP }}>Find more →</button>
        </div>

        {loading ? (
          <p style={{ fontSize: 12, color: C.soft, fontFamily: MP }}>Loading…</p>
        ) : experts.length === 0 ? (
          <p style={{ fontSize: 12, color: C.soft, fontFamily: MP }}>No tutors yet. Book a session to get started.</p>
        ) : experts.map((e) => (
          <div key={e.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 13px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar text={e.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: MP }}>{e.name}</div>
                <div style={{ fontSize: 11, color: C.soft, marginTop: 1, fontFamily: MP, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.skill || "1-on-1 tutor"}</div>
                <div style={{ fontSize: 10.5, color: C.soft, marginTop: 3, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MP }}>
                  <span style={{ color: C.orange, display: "inline-flex", alignItems: "center", gap: 3 }}><Ic.Star /> {e.rating ?? "—"}</span>
                  {e.rate != null && <span>· ₹{e.rate}/hr</span>}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
              <button onClick={() => bookTutor(e.id)}
                style={{ all: "unset", cursor: "pointer", flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 9, background: C.orange, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: MP }}>
                Book
              </button>
              <button onClick={() => openMsg(e.teacher_id, e.name)} disabled={!e.teacher_id} title="Message"
                style={{ all: "unset", cursor: e.teacher_id ? "pointer" : "not-allowed", opacity: e.teacher_id ? 1 : 0.4, width: 34, height: 32, borderRadius: 9, background: C.cream2, display: "flex", alignItems: "center", justifyContent: "center", color: C.forest }}>
                <Ic.MessageSquare />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const emptyBox = {
  textAlign: "center", padding: "32px", color: C.soft, fontSize: 13,
  background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`, fontFamily: MP,
};
