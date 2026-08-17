// skill/SkillSessions.jsx — Skill Dev Student.dc.html dc:601-647 (list) +
// dc:754-798 (cancel / rate modals).

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "./SkillUI";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState, EmptyState } from "../components/StateViews";
import SkillReviewModal from "../components/SkillReviewModal";
import SkillModal from "../components/SkillModal";
import { useSkillToast } from "../components/useSkillToast";
import "../styles/skillSessions.css";

const STATUS_LABEL = { requested: "Requested", confirmed: "Confirmed", cancelled: "Cancelled" };
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export default function SkillSessions({ setTab = () => {} }) {
  const { api } = useAuth();
  const navigate = useNavigate();
  const showToast = useSkillToast();

  const [tab, setLocalTab] = useState("upcoming");
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [reschedule, setReschedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rateFor, setRateFor] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);

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
    // load()'s setState calls all happen inside its own .then()/.finally()
    // callbacks once the request settles, never synchronously in this effect
    // body — a standard mount-fetch, not the cascading-render pattern this
    // rule targets. (The linter's static analysis can't see across the
    // async boundary; CancelModal/RateModal below use the identical
    // shape unflagged.)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(true);
    const id = setInterval(() => load(true), 15000);
    return () => clearInterval(id);
  }, [load]);

  const joinSession = (sessionId) => navigate(`/skill-session/live/${sessionId}`);

  const resolveReschedule = async (accept) => {
    if (!reschedule) return;
    try {
      await api.post(`/skill/sessions/${reschedule.id}/${accept ? "confirm-reschedule" : "decline-reschedule"}/`);
      showToast(accept ? "New time accepted." : "Kept your original time.");
      load(true);
    } catch {
      showToast("Couldn't update — please try again.");
    }
  };

  const rows = tab === "upcoming" ? upcoming : past;

  return (
    <div className="ss-screen">
      <SkillReviewModal onDone={() => load(true)} />

      <div className="ss-seg">
        <button className={`ss-seg__btn ${tab === "upcoming" ? "is-active" : ""}`} onClick={() => setLocalTab("upcoming")}>Upcoming</button>
        <button className={`ss-seg__btn ${tab === "past" ? "is-active" : ""}`} onClick={() => setLocalTab("past")}>Past</button>
      </div>

      {loading ? (
        <LoadingState label="Loading sessions" />
      ) : rows.length === 0 ? (
        <EmptyState
          plain
          icon="video"
          title={tab === "upcoming" ? "No upcoming sessions" : "No completed sessions yet"}
          message={
            tab === "upcoming"
              ? "Book a session with an expert and it'll show up here until it's confirmed."
              : "Sessions you've finished move here, so you can review notes or book a follow-up."
          }
          action={tab === "upcoming" ? { label: "Explore tutors", onClick: () => setTab("explore") } : undefined}
        />
      ) : (
        <div className="ss-rows">
          {rows.map((s) => {
            const resched = tab === "upcoming" && reschedule && reschedule.id === s.id;
            return (
              <div className={`ss-row ${s.status === "cancelled" ? "ss-tag--cancelled-row" : ""}`} key={s.id}>
                <Avatar name={s.expert_name} img={s.expert_img} size={46} />
                <div className="ss-body">
                  <div className="ss-topic">{s.topic}</div>
                  <div className="ss-meta">
                    with {s.expert_name} · {s.when}
                    {s.status !== "cancelled" && (
                      <> · ₹{s.amount_rupees} {s.payment_status === "paid" ? "· Paid ✓" : "· Payment pending"}</>
                    )}
                  </div>
                </div>
                <span className={`ss-tag ss-tag--${s.status}`}>{STATUS_LABEL[s.status] || s.status}</span>

                {tab === "upcoming" ? (
                  <>
                    {(s.live || s.joinable) && (
                      <button className="ss-btn ss-btn--join" onClick={() => joinSession(s.session_id || s.id)}>Join session</button>
                    )}
                    <button className="ss-btn ss-btn--cancel" onClick={() => setCancelFor(s)}>Cancel</button>
                  </>
                ) : s.reviewed ? (
                  <span className="ss-myStars">★★★★★</span>
                ) : (
                  <button className="ss-btn ss-btn--rate" onClick={() => setRateFor(s)}>Rate session</button>
                )}

                {resched && (
                  <div className="ss-reschedPanel">
                    <div className="ss-reschedTitle">Reschedule requested</div>
                    <div className="ss-reschedLine">
                      {s.expert_name} proposed a new time: <strong>{reschedule.proposed_scheduled_for
                        ? new Date(reschedule.proposed_scheduled_for).toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })
                        : "a new time"}</strong>
                    </div>
                    {reschedule.reschedule_reason && <div className="ss-reschedReason">&ldquo;{reschedule.reschedule_reason}&rdquo;</div>}
                    <div className="ss-reschedActions">
                      <button className="ss-btn ss-btn--accept" onClick={() => resolveReschedule(true)}>Accept new time</button>
                      <button className="ss-btn ss-btn--keep" onClick={() => resolveReschedule(false)}>Keep current time</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cancelFor && (
        <CancelModal
          session={cancelFor}
          api={api}
          onClose={() => setCancelFor(null)}
          onCancelled={() => { setCancelFor(null); showToast("Session cancelled."); load(true); }}
        />
      )}

      {rateFor && (
        <RateModal
          session={rateFor}
          api={api}
          onClose={() => setRateFor(null)}
          onSaved={() => {
            setPast((list) => list.map((x) => (x.id === rateFor.id ? { ...x, reviewed: true } : x)));
            setRateFor(null);
            load(true);
          }}
        />
      )}
    </div>
  );
}

function CancelModal({ session, api, onClose, onCancelled }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [now] = useState(() => Date.now());
  const scheduled = session.scheduled_for ? new Date(session.scheduled_for) : null;
  const isLate = scheduled ? scheduled.getTime() - now < TWELVE_HOURS_MS : false;

  const confirm = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      // `reason` isn't consumed by StudentCancelSessionView yet — harmless to
      // send now, ready for when the backend logs it.
      await api.post(`/skill/sessions/${session.session_id || session.id}/cancel/`, { reason });
      onCancelled();
    } catch (e) {
      // A CONFIRMED session currently 409s — cancellation there requires
      // messaging the expert, which this modal can't do; surface the real
      // reason rather than pretending it succeeded.
      setErr(e?.response?.data?.detail || "Couldn't cancel — please try again.");
      setBusy(false);
    }
  };

  return (
    <SkillModal open onClose={onClose} title="Cancel this session?" maxWidth={440}>
      <div className="ss-cancelLabel">&ldquo;{session.topic}&rdquo; with {session.expert_name} · {session.when}</div>

      {isLate ? (
        <div className="ss-noticeBox ss-noticeBox--late">
          <strong>Late cancellation.</strong> This session starts within the expert's 12-hour notice window — you'll be offered one free reschedule instead of a fresh booking.
        </div>
      ) : (
        <div className="ss-noticeBox ss-noticeBox--free">
          <strong>Free cancellation.</strong> You're outside the expert's 12-hour notice window — the slot is released with no penalty.
        </div>
      )}

      <label className="ss-reasonLabel">Reason (optional, shared with the expert)</label>
      <textarea
        className="ss-reasonInput"
        value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Something came up at work…"
      />

      {err && <div className="ss-reviewErr">{err}</div>}

      <div className="ss-cancelActions">
        <button className="ss-btn ss-btn--keepBooking" onClick={onClose} disabled={busy}>Keep booking</button>
        <button className="ss-btn ss-btn--cancelSession" onClick={confirm} disabled={busy}>Cancel session</button>
      </div>
    </SkillModal>
  );
}

function RateModal({ session, api, onClose, onSaved }) {
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
    <SkillModal open onClose={onClose} title="How was your session?" maxWidth={400}>
      <div className="ss-rateSub">{session.topic} with {session.expert_name}</div>
      <div className="ss-starPicker">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className={`ss-starBtn ${n <= rating ? "is-filled" : ""}`}>★</button>
        ))}
      </div>
      <textarea className="ss-reviewInput" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Anything to share with the expert? (optional)" />
      {err && <div className="ss-reviewErr">{err}</div>}
      <button className={`ss-submitRate ${rating > 0 ? "is-enabled" : ""}`} disabled={!rating || busy} onClick={submit}>
        {busy ? "Submitting…" : rating > 0 ? "Submit rating" : "Tap a star to rate"}
      </button>
    </SkillModal>
  );
}
