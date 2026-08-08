// skill/SkillSessions.jsx — My sessions (design_handoff_skilldev README.md
// "6. My sessions"), verified against the live standalone prototype:
// Upcoming/Past segmented control, rows with Join/Cancel, and a reschedule
// handshake panel (Accept new time / Keep current time) when the teacher
// has proposed a different slot.
//
// Deliberate divergence: the design's row actions are only Join/Cancel — no
// inline Message button (unlike the previous version). Not a feature loss:
// messaging the tutor is still reachable from Explore/Profile/Dashboard's
// own Message buttons and the Messages nav item.

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./skillIcons";
import { Avatar } from "./SkillUI";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "../components/StateViews";
import SkillReviewModal from "../components/SkillReviewModal";
import SkillModal from "../components/SkillModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useSkillToast } from "../components/useSkillToast";
import "../styles/skillSessions.css";

const STATUS_LABEL = { requested: "Requested", confirmed: "Confirmed" };

export default function SkillSessions({ setTab = () => {} }) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const showToast = useSkillToast();

  const [tab, setLocalTab] = useState("upcoming");
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [reschedule, setReschedule] = useState(null); // {session_id, expert_name, proposed_scheduled_for, reschedule_reason}
  const [loading, setLoading] = useState(true);
  const [reviewFor, setReviewFor] = useState(null);
  const [cancelDlg, setCancelDlg] = useState(null);
  const [reschedBusy, setReschedBusy] = useState(false);

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    Promise.all([
      api.get("/skill/student/dashboard/"),
      api.get("/skill/my-sessions/"),
    ])
      .then(([dash, sessions]) => {
        setUpcoming(dash.data.upcoming_sessions || []);
        setPast(dash.data.past_sessions || []);
        const awaiting = (Array.isArray(sessions.data) ? sessions.data : [])
          .find((s) => s.status === "needs_reconfirmation");
        setReschedule(awaiting || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [load]);

  const joinSession = (sessionId) => navigate(`/skill-session/live/${sessionId}`);

  const cancelSession = async (s) => {
    try {
      await api.post(`/skill/sessions/${s.session_id || s.id}/cancel/`);
      showToast("Session cancelled.");
      setCancelDlg(null);
      load(true);
    } catch {
      showToast("Couldn't cancel — please try again.");
      setCancelDlg(null);
    }
  };

  const resolveReschedule = async (accept) => {
    if (!reschedule || reschedBusy) return;
    setReschedBusy(true);
    try {
      await api.post(`/skill/sessions/${reschedule.id}/${accept ? "confirm-reschedule" : "decline-reschedule"}/`);
      showToast(accept ? "New time accepted." : "Kept your original time.");
      load(true);
    } catch {
      showToast("Couldn't update — please try again.");
    } finally {
      setReschedBusy(false);
    }
  };

  const rows = tab === "upcoming" ? upcoming : past;

  return (
    <div className="ss-screen">
      <SkillReviewModal onDone={() => load(true)} />

      <h1 className="ss-title">My sessions</h1>

      <div className="ss-seg">
        <button className={`ss-seg__btn ${tab === "upcoming" ? "is-active" : ""}`} onClick={() => setLocalTab("upcoming")}>Upcoming</button>
        <button className={`ss-seg__btn ${tab === "past" ? "is-active" : ""}`} onClick={() => setLocalTab("past")}>Past</button>
      </div>

      {loading ? (
        <LoadingState label="Loading sessions" />
      ) : rows.length === 0 ? (
        <div className="ss-empty">
          {tab === "upcoming" ? "No upcoming sessions." : "No completed sessions yet."}{" "}
          {tab === "upcoming" && <button className="ss-link" onClick={() => setTab("explore")}>Explore tutors →</button>}
        </div>
      ) : rows.map((s) => (
        <div className="ss-rowWrap" key={s.id}>
          <div className={`ss-row${tab === "upcoming" && reschedule && reschedule.id === s.id ? " ss-row--resched" : ""}`}>
            <Avatar name={s.expert_name} img={s.expert_img} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ss-topic">{s.topic}</div>
              <div className="ss-meta">with {s.expert_name} · {s.when}</div>
            </div>
            <span className={`ss-tag ss-tag--${s.status}`}>{STATUS_LABEL[s.status] || s.status}</span>

            {tab === "upcoming" ? (
              <div className="ss-actions">
                {(s.live || s.joinable) && (
                  <button className={`ss-btn ${s.live ? "ss-btn--live" : "ss-btn--primary"}`} onClick={() => joinSession(s.session_id || s.id)}>
                    <Icon.vid size={13} /> {s.live ? "Join · Live now" : "Join session"}
                  </button>
                )}
                <button className="ss-btn ss-btn--outline" onClick={() => setCancelDlg(s)}>Cancel</button>
              </div>
            ) : (
              <div className="ss-actions">
                <button className="ss-btn ss-btn--outline" onClick={() => navigate(`/skill-dev/sessions/${s.session_id || s.id}`)}>Details</button>
                {s.reviewed ? (
                  <span className="ss-reviewedTag"><Icon.check size={13} /> Reviewed</span>
                ) : (
                  <button className="ss-btn ss-btn--primary" onClick={() => setReviewFor(s)}><Icon.star size={12} /> Leave review</button>
                )}
              </div>
            )}
          </div>

          {tab === "upcoming" && reschedule && reschedule.id === s.id && (
            <div className="ss-reschedPanel">
              <div className="ss-reschedTitle">Reschedule requested</div>
              <div className="ss-reschedLine">
                {s.expert_name} proposed a new time: {reschedule.proposed_scheduled_for
                  ? new Date(reschedule.proposed_scheduled_for).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })
                  : "a new time"}
              </div>
              {reschedule.reschedule_reason && <div className="ss-reschedReason">&ldquo;{reschedule.reschedule_reason}&rdquo;</div>}
              <div className="ss-reschedActions">
                <button className="ss-btn ss-btn--primary" disabled={reschedBusy} onClick={() => resolveReschedule(true)}>Accept new time</button>
                <button className="ss-btn ss-btn--outline" disabled={reschedBusy} onClick={() => resolveReschedule(false)}>Keep current time</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {reviewFor && (
        <ReviewModal
          session={reviewFor}
          api={api}
          onClose={() => setReviewFor(null)}
          onSaved={() => {
            setPast((list) => list.map((x) => (x.id === reviewFor.id ? { ...x, reviewed: true } : x)));
            setReviewFor(null);
            load(true);
          }}
        />
      )}

      <ConfirmDialog
        dialog={cancelDlg ? {
          title: "Cancel this session?",
          message: `This will cancel your session with ${cancelDlg.expert_name}. The tutor will be notified.`,
          confirmLabel: "Yes, cancel",
          danger: true,
          tone: "skill",
          onConfirm: () => cancelSession(cancelDlg),
        } : null}
        onClose={() => setCancelDlg(null)}
      />
    </div>
  );
}

function ReviewModal({ session, api, onClose, onSaved }) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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
    <SkillModal open onClose={onClose} title="Review your session">
      <div className="ss-reviewSub">with {session.expert_name}</div>
      <div className="ss-starPicker">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className={`ss-starBtn ${n <= rating ? "is-filled" : ""}`}>★</button>
        ))}
      </div>
      <textarea className="ss-reviewInput" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="What was the session like?" />
      {err && <div className="ss-reviewErr">{err}</div>}
      <div className="ss-reviewActions">
        <button className="ss-btn ss-btn--primary" disabled={!rating || busy} onClick={submit}>{busy ? "Submitting…" : "Submit review"}</button>
        <button className="ss-btn ss-btn--outline" disabled={busy} onClick={onClose}>Cancel</button>
      </div>
    </SkillModal>
  );
}
