/**
 * PLACEMENT: student_dashboard/src/pages/SkillSessionDetail.jsx  (REPLACE WHOLE FILE)
 * DEPLOY:    /app/student_dashboard/src/pages/SkillSessionDetail.jsx
 *
 * Wired to: GET /skill/sessions/<id>/
 * Route:    /skill-dev/sessions/:id  (already in App.jsx)
 *
 * Change from previous version (ONLY handleJoin):
 *   "Join session now" now navigates to /skill-session/live/<id> (the new
 *   skill LiveKit room) instead of /private-session/live/<id> (the ACADEMY
 *   live page, which 404s on a skill-session id). The live page performs the
 *   POST /skill/sessions/<id>/join/ handshake.
 *
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const T = {
  forest:    "#6b2410",
  forestMid: "#b3402e",
  orange:    "#ff8f01",
  teal:      "#0a808a",
  tealBg:    "#eef6f7",
  border:    "rgba(67,20,7,0.14)",
  ink:       "#26130b",
  soft:      "rgba(38,19,11,0.58)",
};

const STATUS_CFG = {
  requested: { label: "Pending",   bg: "#fef3c7", color: "#b45309" },
  confirmed: { label: "Confirmed", bg: "#d1fae5", color: "#065f46" },
  completed: { label: "Completed", bg: "#e0e7ff", color: "#3730a3" },
  cancelled: { label: "Cancelled", bg: "#fee2e2", color: "#b91c1c" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.requested;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "4px 12px", borderRadius: 100,
      fontSize: 11.5, fontWeight: 700, letterSpacing: ".3px",
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  );
}

function Row({ icon, label, value, muted }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ color: T.soft, fontSize: 15, marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: muted ? T.soft : T.ink, lineHeight: 1.45 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function ExpertCard({ expert, onMessage }) {
  const initials = (n) => (n || "?").trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      background: "#fff", border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "14px 16px",
      boxShadow: "0 2px 10px rgba(67,20,7,.06)",
    }}>
      {expert.img
        ? <img src={expert.img} alt={expert.name} style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
        : <div style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(135deg,${T.forestMid},${T.teal})`,
            color: "#fff", display: "grid", placeItems: "center",
            fontWeight: 800, fontSize: 18,
          }}>
            {initials(expert.name)}
          </div>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: T.forest }}>{expert.name}</div>
        <div style={{ fontSize: 12, color: T.soft, marginTop: 2 }}>{expert.title}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11.5 }}>
          {expert.rating && <span style={{ color: "#f59e0b", fontWeight: 700 }}>★ {expert.rating}</span>}
          {expert.cat && <span style={{ color: T.soft }}>{expert.cat}</span>}
        </div>
      </div>
      <button
        onClick={onMessage}
        disabled={!expert.teacher_profile_id}
        title="Message expert"
        style={{
          all: "unset",
          cursor: expert.teacher_profile_id ? "pointer" : "not-allowed",
          width: 38, height: 38, borderRadius: 10,
          background: T.tealBg, border: `1px solid ${T.teal}22`,
          display: "grid", placeItems: "center",
          color: T.teal, fontSize: 16, flexShrink: 0,
          opacity: expert.teacher_profile_id ? 1 : 0.4,
        }}
      >
        💬
      </button>
    </div>
  );
}

function Skeleton() {
  const bar = (w, h = 14, mt = 0) => (
    <div style={{
      width: w, height: h, borderRadius: 6, marginTop: mt,
      background: "linear-gradient(90deg,#f0ece4 25%,#e8e2d8 50%,#f0ece4 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
    }} />
  );
  return (
    <div style={{ padding: "20px 18px" }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {bar("40%", 20)}
      {bar("25%", 12, 10)}
      <div style={{ marginTop: 24 }}>
        {[1,2,3,4].map(i => <div key={i} style={{ padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>{bar("60%")}</div>)}
      </div>
      <div style={{ marginTop: 20 }}>{bar("100%", 80)}</div>
    </div>
  );
}

export default function SkillSessionDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { api }  = useAuth();

  const [session,    setSession]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [joining,    setJoining]    = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/skill/sessions/${id}/`)
      .then(r => setSession(r.data))
      .catch(() => setError("Session not found or you don't have access."))
      .finally(() => setLoading(false));
  }, [id]);

  // The skill LiveKit room page (/skill-session/live/<id>) owns the
  // POST /skill/sessions/<id>/join/ handshake and mounts the room.
  // (Previously this navigated to /private-session/live/<id> — the ACADEMY
  //  live page — which 404s on a skill-session id and never connected.)
  const handleJoin = () => {
    setJoining(true);
    navigate(`/skill-session/live/${id}`);
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this session request?")) return;
    setCancelling(true);
    try {
      await api.post(`/skill/sessions/${id}/cancel/`);
      setSession(s => ({ ...s, status: "cancelled" }));
    } catch {
      alert("Could not cancel. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleMessage = () => {
    if (!session?.expert?.teacher_profile_id) return;
    navigate("/skill-messages", {
      state: { teacherId: session.expert.teacher_profile_id, expertName: session.expert.name },
    });
  };

  if (loading) return <div style={{ flex: 1 }}><Skeleton /></div>;
  if (error)   return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: T.soft, fontFamily: "Poppins, sans-serif" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>😕</div>
      <div style={{ fontSize: 14, marginBottom: 20 }}>{error}</div>
      <button onClick={() => navigate("/skill-dev/sessions")} style={{ all: "unset", cursor: "pointer", background: T.forest, color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "Poppins, sans-serif" }}>
        Back to sessions
      </button>
    </div>
  );

  const s           = session;
  const isLive      = s.is_live;
  const isCompleted = s.status === "completed";
  const isCancelled = s.status === "cancelled";
  const isRequested = s.status === "requested";

  return (
    <div style={{ padding: "16px 18px 32px", fontFamily: "Poppins, sans-serif", maxWidth: 680, margin: "0 auto" }}>

      {/* Back */}
      <button
        onClick={() => navigate("/skill-dev/sessions")}
        style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: T.soft, marginBottom: 18 }}
      >
        ← Back to sessions
      </button>

      {/* Header card */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: "0 2px 12px rgba(67,20,7,.06)", padding: "18px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
              Booking {s.booking_ref}
            </div>
            <h2 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 18, fontWeight: 800, color: T.forest, margin: 0, lineHeight: 1.3 }}>
              {s.topic}
            </h2>
          </div>
          <StatusBadge status={s.status} />
        </div>

        {isLive && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(252,165,165,.12)", border: "1px solid rgba(252,165,165,.4)", borderRadius: 10 }}>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fca5a5", animation: "pulse 1.6s ease-in-out infinite", display: "inline-block" }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fca5a5" }}>Session is live now</span>
          </div>
        )}
      </div>

      {/* Detail rows */}
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: "0 2px 12px rgba(67,20,7,.06)", padding: "4px 20px 6px", marginBottom: 14 }}>
        <Row icon="📅" label="Scheduled" value={s.when || "To be confirmed by teacher"} muted={!s.when} />
        <Row icon="⏱" label="Duration"  value={`${s.duration_mins} minutes`} />
        <Row icon="🎥" label="Mode"      value={s.contact_mode === "session" ? "Video call · Shiksha room" : s.contact_mode} />
        {s.meeting_url && (
          <Row icon="🔗" label="Meeting link" value={
            <a href={s.meeting_url} target="_blank" rel="noreferrer" style={{ color: T.teal, fontWeight: 700 }}>Join meeting room ↗</a>
          } />
        )}
        <div style={{ padding: "11px 0" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Booking ID</div>
          <div style={{ fontSize: 12, fontFamily: "monospace", color: T.soft }}>{s.booking_ref}</div>
        </div>
      </div>

      {/* Payment — settled directly with the expert */}
      {s.amount > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: "0 2px 12px rgba(67,20,7,.06)", padding: "4px 20px 6px", marginBottom: 14 }}>
          <Row
            icon="₹"
            label="Payment"
            value={
              <span>
                ₹{s.amount_rupees} · <span style={{ color: s.payment_status === "paid" ? "#059669" : "#b45309", fontWeight: 700 }}>
                  {s.payment_status === "paid" ? "Paid" : "Unpaid"}
                </span>
              </span>
            }
          />
          {s.payment_status !== "paid" && s.pay_to && (
            <Row
              icon="💳"
              label={`Pay ${s.pay_to.name}`}
              value={
                <span>
                  UPI: <span style={{ fontFamily: "monospace" }}>{s.pay_to.upi}</span>
                  {s.pay_to.note && <div style={{ marginTop: 4, fontWeight: 500, color: T.soft }}>{s.pay_to.note}</div>}
                </span>
              }
            />
          )}
        </div>
      )}

      {/* Expert */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Expert</div>
        <ExpertCard expert={s.expert} onMessage={handleMessage} />
      </div>

      {/* Intro video */}
      {s.expert?.intro_video_embed_url && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: T.soft, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Intro video</div>
          <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            <iframe
              src={s.expert.intro_video_embed_url}
              title="Expert intro"
              style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isLive && (
          <button onClick={handleJoin} disabled={joining} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: T.orange, color: "#fff", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 800, fontFamily: "Poppins, sans-serif", boxShadow: "0 4px 16px rgba(255,143,1,.30)" }}>
            {joining ? "Connecting…" : "🎥  Join session now"}
          </button>
        )}

        {!isCancelled && (
          <button onClick={handleMessage} disabled={!s.expert?.teacher_profile_id} style={{ all: "unset", cursor: s.expert?.teacher_profile_id ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: T.tealBg, color: T.teal, border: `1.5px solid ${T.teal}33`, borderRadius: 12, padding: "12px", fontSize: 13.5, fontWeight: 700, fontFamily: "Poppins, sans-serif" }}>
            💬  Message {s.expert?.name?.split(" ")[0] || "expert"}
          </button>
        )}

        {isCompleted && !s.reviewed && (
          <button onClick={() => navigate("/skill-dev/sessions")} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#fffbeb", color: "#b45309", border: "1.5px solid #fde68a", borderRadius: 12, padding: "12px", fontSize: 13.5, fontWeight: 700, fontFamily: "Poppins, sans-serif" }}>
            ★  Leave a review
          </button>
        )}

        {isCompleted && s.reviewed && (
          <div style={{ textAlign: "center", fontSize: 12.5, color: "#059669", fontWeight: 600 }}>✓ You've reviewed this session</div>
        )}

        {isRequested && (
          <button onClick={handleCancel} disabled={cancelling} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "none", color: "#9ca3af", borderRadius: 12, padding: "10px", fontSize: 12.5, fontWeight: 600, fontFamily: "Poppins, sans-serif", textDecoration: "underline" }}>
            {cancelling ? "Cancelling…" : "Cancel this request"}
          </button>
        )}
      </div>
    </div>
  );
}
