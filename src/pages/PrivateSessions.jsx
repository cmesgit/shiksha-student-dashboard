/**
 * FILE: STUDENT_DASHBOARD/src/pages/PrivateSessions.jsx
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import privateSession from "../api/privateSessionService";
import PrivateSessionCard from "../components/PrivateSessionCard";
import { subjectChipSlot } from "../utils/subjectChips";
import { statusLabel, statusTone } from "../utils/sessionStatus";
import "../styles/academyScreens.css";
import { LoadingState } from "../components/StateViews";
import NotesViewModal from "../components/live/NotesViewModal";
import { useToast } from "../contexts/ToastContext";
import "../styles/privateSessions.css";

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function Stars({ count }) {
  const n = Math.round(count || 0);
  return (
    <span className="ps__stars">
      {"★".repeat(n)}{"☆".repeat(5 - n)}
    </span>
  );
}

function TeacherAvatar({ name, size = 42 }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2);
  return (
    <div className="ps__teacherAvatar" style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

function statusCls(st) {
  const m = {
    approved: "approved", pending: "pending", ongoing: "ongoing",
    needs_reconfirmation: "needs_reconfirmation",
    completed: "completed", cancelled: "cancelled", declined: "declined",
    expired: "expired", withdrawn: "withdrawn",
    teacher_no_show: "noshow", student_no_show: "noshow",
  };
  return m[st] || "";
}

function formatDate(d) {
  if (!d) return "TBD";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
    });
  } catch { return d; }
}

function formatTime(t) {
  if (!t) return "TBD";
  try {
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch { return t; }
}

function calcDurationDisplay(startTime, durationMins) {
  if (!startTime || !durationMins) return "";
  try {
    const [h, m] = startTime.split(":").map(Number);
    const endTotal = h * 60 + m + durationMins;
    const eh = Math.floor(endTotal / 60) % 24;
    const em = endTotal % 60;
    const startStr = formatTime(startTime);
    const endAmpm = eh >= 12 ? "PM" : "AM";
    const endH12 = eh % 12 || 12;
    const endStr = `${endH12}:${String(em).padStart(2, "0")} ${endAmpm}`;
    return `${startStr} – ${endStr}`;
  } catch { return formatTime(startTime); }
}

/* ═══════════════════════════════════════════════════════════
   CANCEL MODAL
═══════════════════════════════════════════════════════════ */
function CancelModal({ session, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  return (
    <div className="ps__modalOverlay" onClick={onClose}>
      <div className="ps__modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="ps__modalTitle">Cancel Request</h3>
        <div className="ps__modalInfo">
          <div className="ps__modalInfoRow"><span className="ps__modalInfoLabel">Date:</span> <strong>{formatDate(session.date)}</strong></div>
          <div className="ps__modalInfoRow"><span className="ps__modalInfoLabel">Time Slot:</span> <strong>{calcDurationDisplay(session.time, session.durationMinutes) || formatTime(session.time)}</strong></div>
          <div className="ps__modalInfoRow"><span className="ps__modalInfoLabel">Duration:</span> <strong>{session.durationLabel || `${session.durationMinutes} minutes`}</strong></div>
        </div>
        <p className="ps__modalNote">
          <strong>Note:</strong> The Teacher and Group Members will be notified of the cancellation.
        </p>
        <div className="ps__modalActions">
          <button className="ps__modalBack" onClick={onClose}>Back</button>
          <button className="ps__modalConfirm" onClick={() => onConfirm(session.id, reason)}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONFIRM SESSION MODAL
═══════════════════════════════════════════════════════════ */
function ConfirmModal({ session, onClose, onConfirm }) {
  return (
    <div className="ps__modalOverlay" onClick={onClose}>
      <div className="ps__modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="ps__modalTitle">Confirm Session</h3>
        <div className="ps__modalInfo">
          <div className="ps__modalInfoRow"><span className="ps__modalInfoLabel">Date:</span> <strong>{formatDate(session.rescheduledDate || session.date)}</strong></div>
          <div className="ps__modalInfoRow"><span className="ps__modalInfoLabel">Timing:</span> <strong>{calcDurationDisplay(session.rescheduledTime || session.time, session.durationMinutes) || formatTime(session.rescheduledTime || session.time)}</strong></div>
          <div className="ps__modalInfoRow"><span className="ps__modalInfoLabel">Duration:</span> <strong>{session.durationLabel || `${session.durationMinutes} minutes`}</strong></div>
        </div>
        <p className="ps__modalNote">
          <strong>Note:</strong> The session will be scheduled and saved upon confirmation.
        </p>
        <div className="ps__modalActions">
          <button className="ps__modalBack" onClick={onClose}>Back</button>
          <button className="ps__modalConfirm" style={{ background: "#16a34a" }} onClick={() => onConfirm(session.id)}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SESSION DETAIL VIEW (Scheduled tab)
═══════════════════════════════════════════════════════════ */
function SessionDetail({ session, onBack, onCancel, onEnterRoom }) {
  const [showCancel, setShowCancel] = useState(false);
  const isLive = session.status === "ongoing";

  return (
    <div className="ps__detail">
      <div className="ps__sidebarBack">
        <button className="ps__backBtn" onClick={onBack}>‹ Back to Sessions</button>
      </div>
      <div className={`ps__statusBar ${isLive ? "ps__statusBar--live" : "ps__statusBar--upcoming"}`}>
        <span>{isLive ? "STATUS: CURRENTLY LIVE" : `STATUS: UPCOMING at ${formatTime(session.time)}`}</span>
        {isLive ? (
          <button className="ps__joinBtn" onClick={() => onEnterRoom(session)}>JOIN</button>
        ) : (
          <button className="ps__cancelBtn" onClick={() => setShowCancel(true)}>Cancel Class</button>
        )}
      </div>
      <div className="ps__detailLabel">Summary:</div>
      <div className="ps__detailBody">
        <div className="ps__detailLeft">
          {[
            ["Subject", session.subject],
            ["Teacher", session.teacher],
            ["Date", formatDate(session.date)],
            ["Time", formatTime(session.time)],
            ["Duration", session.durationLabel || `${session.durationMinutes} minutes`],
            ["Type", session.sessionType === "group" ? "Group" : "One-on-One"],
          ].map(([k, v]) => (
            <div key={k} className="ps__detailRow">
              <span className="ps__detailKey">{k}:</span>
              <span className="ps__detailVal">{v}</span>
            </div>
          ))}
          {session.note && (
            <div className="ps__noteBlock">
              <div className="ps__detailKey">Note:</div>
              <div className="ps__noteBox">{session.note}</div>
            </div>
          )}
        </div>
        <div className="ps__detailRight">
          <div className="ps__groupHeader">Group Strength: <strong>{session.groupStrength}</strong></div>
          <div className="ps__studentList">
            {session.students?.map((s, i) => (
              <div key={i} className="ps__studentItem">{s}</div>
            ))}
          </div>
        </div>
      </div>
      {showCancel && (
        <CancelModal
          session={session}
          onClose={() => setShowCancel(false)}
          onConfirm={(id, reason) => { setShowCancel(false); onCancel(id, reason); onBack(); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REQUEST DETAIL VIEW (Requests tab)
═══════════════════════════════════════════════════════════ */
function RequestDetail({ session, onBack, onCancel, onConfirmReschedule }) {
  const [showCancel, setShowCancel] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const isPending = session.status === "pending";
  const isReconfirm = session.status === "needs_reconfirmation";

  return (
    <div className="ps__detail">
      <div className="ps__sidebarBack">
        <button className="ps__backBtn" onClick={onBack}>‹ Back to Sessions</button>
      </div>
      <div className="ps__statusBar ps__statusBar--pending">
        <span>STATUS: {isPending ? "PENDING APPROVAL" : "NEEDS RECONFIRMATION"}</span>
        <div style={{ display: "flex", gap: 8 }}>
          {isReconfirm && (
            <button className="ps__joinBtn" style={{ background: "#16a34a" }} onClick={() => setShowConfirm(true)}>Accept</button>
          )}
          <button className="ps__cancelBtn" onClick={() => setShowCancel(true)}>Cancel Request</button>
        </div>
      </div>
      {isReconfirm && session.teacherNote && (
        <div className="ps__reschedBanner">
          <div className="ps__reschedBannerIcon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div className="ps__reschedBannerText">
            <strong>Teacher proposed a new time</strong>
            <p>
              Original: {formatDate(session.originalDate)}, {formatTime(session.originalTime)}<br />
              New: <strong>{formatDate(session.rescheduledDate)}, {formatTime(session.rescheduledTime)}</strong><br />
              Note: "{session.teacherNote}"
            </p>
          </div>
        </div>
      )}
      <div className="ps__detailLabel">Summary:</div>
      <div className="ps__detailBody">
        <div className="ps__detailLeft">
          {[
            ["Subject", session.subject],
            ["Teacher", session.teacher],
            ["Date", formatDate(isReconfirm ? (session.rescheduledDate || session.date) : session.date)],
            ["Time Slot", calcDurationDisplay(isReconfirm ? (session.rescheduledTime || session.time) : session.time, session.durationMinutes) || formatTime(session.time)],
            ["Duration", session.durationLabel || `${session.durationMinutes} minutes`],
            ["Type", session.sessionType === "group" ? "Group" : "One-on-One"],
          ].map(([k, v]) => (
            <div key={k} className="ps__detailRow">
              <span className="ps__detailKey">{k}:</span>
              <span className="ps__detailVal">{v}</span>
            </div>
          ))}
          {session.note && (
            <div className="ps__noteBlock">
              <div className="ps__detailKey">Student's Note:</div>
              <div className="ps__noteBox">{session.note}</div>
            </div>
          )}
          {session.teacherNote && !isReconfirm && (
            <div className="ps__noteBlock">
              <div className="ps__detailKey">Teacher's Note:</div>
              <div className="ps__noteBox">{session.teacherNote}</div>
            </div>
          )}
        </div>
        <div className="ps__detailRight">
          <div className="ps__groupHeader">Group Strength: <strong>{session.groupStrength}</strong></div>
          <div className="ps__studentList">
            {session.students?.length > 0
              ? session.students.map((s, i) => <div key={i} className="ps__studentItem">{s}</div>)
              : <div className="ps__studentItem" style={{ opacity: 0.5 }}>Just you</div>
            }
          </div>
        </div>
      </div>
      {showCancel && (
        <CancelModal
          session={session}
          onClose={() => setShowCancel(false)}
          onConfirm={(id, reason) => { setShowCancel(false); onCancel(id, reason); onBack(); }}
        />
      )}
      {showConfirm && (
        <ConfirmModal
          session={session}
          onClose={() => setShowConfirm(false)}
          onConfirm={(id) => { setShowConfirm(false); onConfirmReschedule(id); onBack(); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HISTORY DETAIL VIEW
═══════════════════════════════════════════════════════════ */
function HistoryDetail({ session, onBack }) {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="ps__detail">
      <div className="ps__sidebarBack">
        <button className="ps__backBtn" onClick={onBack}>‹ Back to Sessions</button>
      </div>
      <div className={`ps__statusBar ps__statusBar--${statusCls(session.status)}`}>
        <span>STATUS: {statusLabel(session.status).toUpperCase()}</span>
        {session.status === "completed" && (
          <button className="ps__joinBtn" style={{ background: "#425f7f" }} onClick={() => setShowNotes(true)}>
            My Notes
          </button>
        )}
      </div>
      {showNotes && (
        <NotesViewModal sessionId={session.id} sessionType="private" onClose={() => setShowNotes(false)} />
      )}
      <div className="ps__detailLabel">Session Summary:</div>
      <div className="ps__detailBody">
        <div className="ps__detailLeft">
          {[
            ["Subject", session.subject],
            ["Teacher", session.teacher],
            ["Date", formatDate(session.date)],
            ["Timing", calcDurationDisplay(session.time, session.durationMinutes) || formatTime(session.time)],
            ["Duration", session.durationLabel || `${session.durationMinutes} minutes`],
            ["Type", session.sessionType === "group" ? "Group" : "One-on-One"],
            ["Status", statusLabel(session.status)],
          ].map(([k, v]) => (
            <div key={k} className="ps__detailRow">
              <span className="ps__detailKey">{k}:</span>
              <span className="ps__detailVal">{v}</span>
            </div>
          ))}
          {session.startedAt && (
            <div className="ps__detailRow">
              <span className="ps__detailKey">Started:</span>
              <span className="ps__detailVal">{new Date(session.startedAt).toLocaleString()}</span>
            </div>
          )}
          {session.endedAt && (
            <div className="ps__detailRow">
              <span className="ps__detailKey">Ended:</span>
              <span className="ps__detailVal">{new Date(session.endedAt).toLocaleString()}</span>
            </div>
          )}
          {session.startedAt && session.endedAt && (
            <div className="ps__detailRow">
              <span className="ps__detailKey">Actual Duration:</span>
              <span className="ps__detailVal">{Math.round((new Date(session.endedAt) - new Date(session.startedAt)) / 60000)} minutes</span>
            </div>
          )}
          {session.note && (
            <div className="ps__noteBlock">
              <div className="ps__detailKey">Student's Note:</div>
              <div className="ps__noteBox">{session.note}</div>
            </div>
          )}
          {session.cancelReason && (
            <div className="ps__noteBlock">
              <div className="ps__detailKey">Cancellation Reason:</div>
              <div className="ps__noteBox" style={{ borderLeft: "3px solid #dc2626" }}>{session.cancelReason}</div>
            </div>
          )}
          {session.declineReason && (
            <div className="ps__noteBlock">
              <div className="ps__detailKey">Decline Reason:</div>
              <div className="ps__noteBox" style={{ borderLeft: "3px solid #dc2626" }}>{session.declineReason}</div>
            </div>
          )}
        </div>
        <div className="ps__detailRight">
          <div className="ps__groupHeader">Participants: <strong>{session.groupStrength}</strong></div>
          <div className="ps__studentList">
            {session.students?.length > 0
              ? session.students.map((s, i) => <div key={i} className="ps__studentItem">{s}</div>)
              : <div className="ps__studentItem" style={{ opacity: 0.5 }}>No participants recorded</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCHEDULED TAB
═══════════════════════════════════════════════════════════ */
function ScheduledTab({ onEnterRoom, searchTerm = "", registerRefresh }) {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    privateSession.getSessions("scheduled").then((data) => {
      setSessions(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Register refresh callback so WebSocket can trigger it
  useEffect(() => {
    registerRefresh?.(load);
  }, [load, registerRefresh]);

  const handleConfirm = async (id) => {
    await privateSession.confirmReschedule(id);
    // A confirmed reschedule moves scheduled_date/time to the proposed
    // values server-side — a local status-only patch would leave the row
    // showing the old time until the next reload, so refetch instead.
    load();
  };
  const handleDecline = async (id) => {
    await privateSession.declineReschedule(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };
  const handleCancel = async (id, reason) => {
    await privateSession.cancelSession(id, reason);
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, status: "cancelled" } : s));
  };

  if (loading) return <LoadingState plain label="Loading sessions" />;

  const searchFilter = (items) => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((s) =>
      (s.subject || "").toLowerCase().includes(q) ||
      (s.teacher || "").toLowerCase().includes(q) ||
      (s.topic || "").toLowerCase().includes(q)
    );
  };

  const reconfirm = sessions.filter((s) => s.status === "needs_reconfirmation");
  const active = searchFilter(sessions.filter((s) =>
    ["approved", "ongoing", "needs_reconfirmation"].includes(s.status)
  ));

  if (selected) {
    // A needs_reconfirmation row opened from this tab has no join/cancel
    // action of its own — the teacher's proposed time needs an Accept/
    // Decline, which is exactly what RequestDetail (used by the Requests
    // tab for the identical status) already renders. Reuse it here instead
    // of leaving this row's click-through as a dead end with no way to
    // act on the reschedule proposal.
    if (selected.status === "needs_reconfirmation") {
      return (
        <RequestDetail
          session={selected}
          onBack={() => setSelected(null)}
          onCancel={(id, reason) => { handleCancel(id, reason); setSelected(null); }}
          onConfirmReschedule={(id) => { handleConfirm(id); setSelected(null); }}
          onDeclineReschedule={(id) => { handleDecline(id); setSelected(null); }}
        />
      );
    }
    return (
      <SessionDetail
        session={selected}
        onBack={() => setSelected(null)}
        onCancel={(id, reason) => { handleCancel(id, reason); setSelected(null); }}
        onEnterRoom={onEnterRoom}
      />
    );
  }

  return (
    <div>
      {reconfirm.map((s) => (
        <div key={s.id} className="ps__reconfirmBanner">
          <div className="ps__reconfirmIcon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div className="ps__reconfirmText">
            <strong>{s.teacher} proposed a new time for your {s.subject} session</strong>
            <p>
              Original: {formatDate(s.originalDate)}, {formatTime(s.originalTime)}<br />
              New time: <strong>{formatDate(s.rescheduledDate)}, {formatTime(s.rescheduledTime)}</strong><br />
              {s.teacherNote && <span>Note: &quot;{s.teacherNote}&quot;</span>}
            </p>
          </div>
          <div className="ps__reconfirmActions">
            <button className="ps__confirmBtn" onClick={() => handleConfirm(s.id)}>✓ Confirm</button>
            <button className="ps__declineBtn" onClick={() => handleDecline(s.id)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Decline</button>
          </div>
        </div>
      ))}
      {active.length === 0 ? (
        <section className="ac-listCard">
          <div className="ac-emptyRow">
            {searchTerm ? "No sessions match your search." : "No sessions scheduled"}
          </div>
        </section>
      ) : (
        <section className="ac-listCard ac-list">
          {active.map((s) => (
            <PrivateSessionCard
              key={s.id}
              subject={s.subject}
              topic={s.topic}
              teacher={s.teacher}
              date={formatDate(s.date)}
              time={formatTime(s.time)}
              status={s.status}
              onClick={() => setSelected(s)}
              onEnterRoom={() => onEnterRoom(s)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REQUEST CARD
═══════════════════════════════════════════════════════════ */
/* The design's Requests row carries Reject/Accept actions, because in the
   prototype this tab holds INCOMING invites. Here it holds the student's own
   OUTGOING requests awaiting a teacher's answer — there is nothing for them to
   accept — so the row keeps the design's shape but not those buttons. Opening
   the row still leads to the detail view, which is where a request can be
   withdrawn. */
function RequestedCard({ item, onClick }) {
  const open = () => onClick && onClick();
  return (
    <div
      className="ac-row"
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      }}
    >
      <div className="ac-row__when">
        <div className="ac-row__time">{formatTime(item.time)}</div>
        <div className="ac-row__day">{formatDate(item.date)}</div>
      </div>
      <div className="ac-row__divider" />
      <div className="ac-row__body">
        <div className="ac-row__meta">
          {item.subject && (
            <span className={`subj-chip subj-chip--${subjectChipSlot(item.subject)}`}>
              {item.subject}
            </span>
          )}
          <span className={`ac-tag ac-tag--${statusTone("pending")}`}>
            {statusLabel("pending")}
          </span>
          {item.groupStrength > 1 && (
            <span className="ac-when">
              {item.groupStrength} students
            </span>
          )}
        </div>
        {item.topic && <div className="ac-row__topic">{item.topic}</div>}
        <div className="ac-row__sub">{item.teacher}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REQUESTS TAB
═══════════════════════════════════════════════════════════ */
function RequestsTab({ onUnreadChange, searchTerm = "", registerRefresh, forceOpenForm, onForceOpenFormHandled }) {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // The head's "+ Request session" button (design line 1623) lives outside
  // this tab, so it asks the parent to switch here and flip this flag rather
  // than duplicating the form.
  useEffect(() => {
    if (forceOpenForm) {
      setShowForm(true);
      onForceOpenFormHandled?.();
    }
  }, [forceOpenForm, onForceOpenFormHandled]);

  const loadRequests = useCallback(() => {
    privateSession.getSessions("requests").then((data) => {
      setRequests(data);
      setLoading(false);
      onUnreadChange(data.length);
    }).catch(() => setLoading(false));
  }, [onUnreadChange]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // Register so WebSocket can trigger refresh
  useEffect(() => {
    registerRefresh?.(loadRequests);
  }, [loadRequests, registerRefresh]);

  const handleCancel = async (id, reason) => {
    await privateSession.cancelSession(id, reason);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };
  const handleConfirmReschedule = async (id) => {
    await privateSession.confirmReschedule(id);
    loadRequests();
  };
  const handleDeclineReschedule = async (id) => {
    await privateSession.declineReschedule(id);
    loadRequests();
  };
  const handleFormSubmit = async (formData) => {
    try {
      await privateSession.requestSession(formData);
      setShowForm(false);
      loadRequests();
    } catch (err) {
      showToast({ type: "error", message: err?.response?.data?.error || "Failed to submit request. Please try again." });
      throw err;
    }
  };

  if (loading) return <LoadingState plain label="Loading requests" />;
  if (showForm) return <RequestForm onBack={() => setShowForm(false)} onSubmit={handleFormSubmit} />;
  if (selected) {
    return (
      <RequestDetail
        session={selected}
        onBack={() => { setSelected(null); loadRequests(); }}
        onCancel={handleCancel}
        onConfirmReschedule={handleConfirmReschedule}
        onDeclineReschedule={handleDeclineReschedule}
      />
    );
  }

  const searchFilter = (items) => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((s) =>
      (s.subject || "").toLowerCase().includes(q) ||
      (s.teacher || "").toLowerCase().includes(q) ||
      (s.topic || "").toLowerCase().includes(q)
    );
  };

  const filteredRequests = searchFilter(requests);

  return (
    <div>
      <div className="ps__reqHeader">
        <span className="ps__reqCount">{filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}</span>
        <button className="ps__requestBtn" onClick={() => setShowForm(true)}>+ Request Private Session</button>
      </div>
      {filteredRequests.length === 0 ? (
        <section className="ac-listCard">
          <div className="ac-emptyRow">
            {searchTerm ? "No requests match your search." : "No pending requests"}
          </div>
        </section>
      ) : (
        <section className="ac-listCard ac-list">
          {filteredRequests.map((r) => (
            <RequestedCard key={r.id} item={r} onClick={() => setSelected(r)} />
          ))}
        </section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   4-STEP REQUEST FORM
═══════════════════════════════════════════════════════════ */
function RequestForm({ onBack, onSubmit }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({
    subject: "",
    subject_id: "",
    teacher: null,
    groupSize: 1,
    students: [],
    scheduledDate: "",
    timeSlot: null,
    duration: null,
    note: "",
  });

  const displayName = user?.profile?.full_name || user?.email || "Student";
  const steps = ["Teacher", "Students", "Schedule", "Summary"];

  const canNext = () => {
    if (step === 1) return !!data.teacher && !!data.subject_id;
    if (step === 2) {
      if (data.groupSize <= 1) return true;
      return data.students.every((s) => s.valid);
    }
    if (step === 3) return !!data.scheduledDate && !!data.timeSlot && !!data.duration;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        teacher_id: data.teacher.id,
        subject_id: data.subject_id,
        scheduled_date: data.scheduledDate,
        scheduled_time: data.timeSlot.value,
        duration_minutes: data.duration.value,
        session_type: data.groupSize > 1 ? "group" : "one_on_one",
        group_strength: data.groupSize,
        student_ids: data.students.filter((s) => s.valid).map((s) => s.userId),
        notes: data.note,
      });
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="ps__formWrap">
      <div className="ps__formTitle">Request a session</div>
      <div className="ps__stepper">
        {steps.map((s, i) => (
          <div key={s} className="ps__stepGroup">
            <div className={`ps__stepCircle ${step > i + 1 ? "done" : step === i + 1 ? "active" : ""}`}>
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <span className={`ps__stepLabel ${step === i + 1 ? "active" : ""}`}>{s}</span>
            {i < steps.length - 1 && <div className={`ps__stepLine ${step > i + 1 ? "done" : ""}`} />}
          </div>
        ))}
      </div>
      <div className="ps__formBody">
        {step === 1 && <Step1 data={data} setData={setData} />}
        {step === 2 && <Step2 data={data} setData={setData} displayName={displayName} />}
        {step === 3 && <Step3 data={data} setData={setData} />}
        {step === 4 && <Step4 data={data} displayName={displayName} />}
      </div>
      <div className="ps__formActions">
        <button className="ps__formBackBtn" onClick={() => (step === 1 ? onBack() : setStep(step - 1))}>
          {step === 1 ? "Cancel" : "Back"}
        </button>
        {step < 4 ? (
          <button className="ps__formNextBtn" onClick={() => setStep(step + 1)} disabled={!canNext()}>Continue</button>
        ) : (
          <button className="ps__formSubmitBtn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 1 — Subject + Teacher selection
═══════════════════════════════════════════════════════════ */
function Step1({ data, setData }) {
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Fetch subjects on mount
  useEffect(() => {
    setLoadingSubjects(true);
    privateSession.getSubjectsByCourse()
      .then((res) => {
        // Normalise to [{id, name}] regardless of API shape
        let list = [];
        if (Array.isArray(res)) {
          list = res.map((s) =>
            typeof s === "string"
              ? { id: s, name: s }
              : { id: String(s.id), name: s.name || s.subject_name || String(s) }
          );
        } else if (res && typeof res === "object") {
          Object.values(res).forEach((arr) => {
            if (Array.isArray(arr)) {
              arr.forEach((s) => list.push(
                typeof s === "string" ? { id: s, name: s } : { id: String(s.id), name: s.name || String(s) }
              ));
            }
          });
        }
        const seen = new Set();
        const unique = list.filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
        setSubjects(unique);
        // Pre-select first subject if nothing selected yet
        if (unique.length > 0 && !data.subject_id) {
          setData((prev) => ({ ...prev, subject: unique[0].name, subject_id: unique[0].id, teacher: null }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSubjects(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch teachers whenever subject_id changes
  useEffect(() => {
    if (!data.subject_id) return;
    setLoadingTeachers(true);
    setTeachers([]);
    privateSession.getTeachers(data.subject_id)
      .then((list) => setTeachers(list))
      .catch(() => {})
      .finally(() => setLoadingTeachers(false));
  }, [data.subject_id]);

  const handleSubjectChange = (e) => {
    const selected = subjects.find((s) => s.id === e.target.value);
    if (selected) {
      setData((prev) => ({ ...prev, subject: selected.name, subject_id: selected.id, teacher: null }));
    }
  };

  return (
    <div>
      <div className="ps__fieldRow" style={{ alignItems: "center" }}>
        <label className="ps__fieldLabel">Subject :</label>
        {loadingSubjects ? (
          <span style={{ fontSize: 13, color: "#6b7280" }}>Loading subjects...</span>
        ) : (
          <select className="ps__select" value={data.subject_id} onChange={handleSubjectChange}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>
      <div className="ps__sectionLabel">Teachers for {data.subject} :</div>
      {loadingTeachers ? (
        <div style={{ padding: 20, color: "#6b7280" }}>Loading teachers...</div>
      ) : teachers.length === 0 ? (
        <div style={{ padding: 20, color: "#6b7280" }}>No teachers found for this subject.</div>
      ) : (
        <div className="ps__teacherGrid">
          {teachers.map((t) => (
            <div
              key={t.id}
              className={`ps__teacherCard ${data.teacher?.id === t.id ? "selected" : ""}`}
              onClick={() => setData((prev) => ({ ...prev, teacher: t }))}
            >
              <TeacherAvatar name={t.name} size={42} />
              <div className="ps__teacherInfo">
                <div className="ps__teacherName">{t.name}</div>
                <div className="ps__teacherMeta">
                  <span>{data.subject}</span>
                  {t.rating && <Stars count={t.rating} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 2 — Group size + student autocomplete picker
═══════════════════════════════════════════════════════════ */
/* helper — trim UUID-style student IDs to a short readable form */
function shortId(id) {
  if (!id) return "";
  // If it looks like a UUID keep first 8 chars, else keep as-is (max 12)
  return id.length > 12 ? id.slice(0, 8).toUpperCase() : id;
}

function StudentPicker({ slot, subjectId, excludeUserIds, onSelect, onClear }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchStudents = async (q = "") => {
    if (!subjectId) return;
    setLoading(true);
    try {
      const list = await privateSession.getCourseStudents(subjectId, q.trim());
      setResults(list.filter((s) => !excludeUserIds.includes(s.user_id)));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce typed queries
  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchStudents(val), 250);
  };

  const handleFocus = () => {
    setOpen(true);
    if (results.length === 0 && !loading) fetchStudents(query);
  };

  const handleSelect = (student) => {
    onSelect(student);
    setQuery("");
    setOpen(false);
    setResults([]);
  };

  // ── Selected pill ──────────────────────────────────────
  if (slot.valid) {
    return (
      <div className="ps__pickerPill">
        <span className="ps__pickerPillAvatar">{slot.name.charAt(0).toUpperCase()}</span>
        <div className="ps__pickerPillInfo">
          <span className="ps__pickerPillName">{slot.name}</span>
          {slot.student_id && (
            <span className="ps__pickerPillId">{shortId(slot.student_id)}</span>
          )}
        </div>
        <button className="ps__pickerPillClear" onClick={onClear} title="Remove">✕</button>
      </div>
    );
  }

  // ── Search input + dropdown ────────────────────────────
  return (
    <div className="ps__pickerWrap" ref={wrapRef}>
      <div className={`ps__pickerInputRow ${open ? "ps__pickerInputRow--open" : ""}`}>
        <svg className="ps__pickerSearchIcon" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          className="ps__pickerInput"
          placeholder="Search by name or ID..."
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          autoComplete="off"
          spellCheck={false}
        />
        {loading
          ? <span className="ps__pickerSpinner" />
          : query && (
            <button className="ps__pickerClearQuery" onClick={() => { setQuery(""); fetchStudents(""); }}>✕</button>
          )
        }
      </div>

      {open && (
        <div className="ps__pickerDropdown">
          {loading && results.length === 0 && (
            <div className="ps__pickerLoading">
              <span className="ps__pickerSpinner" /> Searching...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="ps__pickerEmpty">
              <span className="ps__pickerEmptyIcon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
              {query ? `No students found for "${query}"` : "No other enrolled students"}
            </div>
          )}
          {results.map((s) => (
            <div
              key={s.user_id}
              className="ps__pickerOption"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
            >
              <span className="ps__pickerOptionAvatar">{s.name.charAt(0).toUpperCase()}</span>
              <div className="ps__pickerOptionInfo">
                <span className="ps__pickerOptionName">{s.name}</span>
                {s.student_id && (
                  <span className="ps__pickerOptionId">{shortId(s.student_id)}</span>
                )}
              </div>
              <span className="ps__pickerOptionAdd">+ Add</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Step2({ data, setData, displayName }) {
  const [groupInput, setGroupInput] = useState(String(data.groupSize));

  const applyGroupSize = (n) => {
    const size = Math.max(1, Math.min(10, n));
    const students = Array(Math.max(0, size - 1)).fill(null).map((_, i) =>
      data.students[i] || { name: "", userId: "", student_id: "", valid: false }
    );
    setData({ ...data, groupSize: size, students });
    setGroupInput(String(size));
  };

  const handleGroupType = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setGroupInput(raw);
    if (raw === "") return;
    const n = parseInt(raw);
    if (!isNaN(n)) applyGroupSize(n);
  };

  const handleGroupBlur = () => {
    const n = parseInt(groupInput);
    if (!n || n < 1) applyGroupSize(1);
    else if (n > 10) applyGroupSize(10);
    else applyGroupSize(n);
  };

  const handleSelect = (i, student) => {
    const students = [...data.students];
    students[i] = {
      name: student.name,
      userId: student.user_id,
      student_id: student.student_id,
      valid: true,
    };
    setData({ ...data, students });
  };

  const handleClear = (i) => {
    const students = [...data.students];
    students[i] = { name: "", userId: "", student_id: "", valid: false };
    setData({ ...data, students });
  };

  const selectedIds = data.students.filter((s) => s.valid).map((s) => s.userId);
  const filledCount = data.students.filter((s) => s.valid).length;
  const totalSlots = data.groupSize - 1;

  return (
    <div className="ps__step2Wrap">
      {/* Group size control */}
      <div className="ps__groupRow">
        <label className="ps__fieldLabel">Group Strength</label>
        <div className="ps__groupCtrl">
          <button className="ps__groupBtn" onClick={() => applyGroupSize(data.groupSize - 1)}>−</button>
          <input className="ps__groupInput" value={groupInput} onChange={handleGroupType} onBlur={handleGroupBlur} maxLength={2} />
          <button className="ps__groupBtn" onClick={() => applyGroupSize(data.groupSize + 1)}>+</button>
        </div>
      </div>

      {/* Progress hint */}
      {totalSlots > 0 && (
        <div className="ps__pickerProgress">
          <div className="ps__pickerProgressBar">
            <div
              className="ps__pickerProgressFill"
              style={{ width: `${((filledCount + 1) / data.groupSize) * 100}%` }}
            />
          </div>
          <span className="ps__pickerProgressText">
            {filledCount + 1} / {data.groupSize} students selected
          </span>
        </div>
      )}

      {/* Student slots */}
      <div className="ps__studentInputs">
        {/* Slot 1 — always the requesting student */}
        <div className="ps__studentRow">
          <span className="ps__slotNum">1</span>
          <div className="ps__pickerPill ps__pickerPill--you">
            <span className="ps__pickerPillAvatar">{(displayName || "Y").charAt(0).toUpperCase()}</span>
            <div className="ps__pickerPillInfo">
              <span className="ps__pickerPillName">{displayName}</span>
              <span className="ps__pickerPillId">You</span>
            </div>
          </div>
        </div>

        {data.students.map((s, i) => (
          <div key={i} className="ps__studentRow">
            <span className="ps__slotNum">{i + 2}</span>
            <StudentPicker
              slot={s}
              subjectId={data.subject_id}
              excludeUserIds={selectedIds}
              onSelect={(student) => handleSelect(i, student)}
              onClear={() => handleClear(i)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 3 — Date / time / duration / note
═══════════════════════════════════════════════════════════ */
function Step3({ data, setData }) {
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const minDate = today.toISOString().split("T")[0];

  return (
    <div>
      <div className="ps__fieldRow" style={{ marginBottom: 20 }}>
        <label className="ps__fieldLabel">Select Date:</label>
        <input
          type="date"
          className="ps__select"
          value={data.scheduledDate}
          min={minDate}
          onChange={(e) => setData({ ...data, scheduledDate: e.target.value })}
        />
      </div>
      <div className="ps__sectionLabel">Select Time Slot:</div>
      <div className="ps__slotBtns">
        {privateSession.TIME_SLOTS.map((t) => (
          <button
            key={t.value}
            className={`ps__slotBtn ${data.timeSlot?.value === t.value ? "selected" : ""}`}
            onClick={() => setData({ ...data, timeSlot: t })}
          >{t.label}</button>
        ))}
      </div>
      <div className="ps__sectionLabel">Select Duration:</div>
      <div className="ps__slotBtns">
        {privateSession.DURATIONS.map((d) => (
          <button
            key={d.value}
            className={`ps__slotBtn ${data.duration?.value === d.value ? "selected" : ""}`}
            onClick={() => setData({ ...data, duration: d })}
          >{d.label}</button>
        ))}
      </div>
      <div className="ps__sectionLabel">Note (Reason for the Session):</div>
      <textarea
        className="ps__noteArea"
        placeholder="Need help understanding trigonometric identities..."
        value={data.note}
        onChange={(e) => setData({ ...data, note: e.target.value })}
        rows={5}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STEP 4 — Summary
═══════════════════════════════════════════════════════════ */
function Step4({ data, displayName }) {
  const validStudents = data.students.filter((s) => s.valid);
  const allNames = [displayName, ...validStudents.map((s) => s.name)];
  const groupLabel = allNames.length > 1
    ? `${allNames[0].split(" ")[0]} + ${allNames.length - 1} others`
    : allNames[0];

  return (
    <div>
      <div className="ps__summaryLabel">Summary:</div>
      <div className="ps__summaryTable">
        {[
          ["Subject",   data.subject],
          ["Teacher",   data.teacher?.name || "—"],
          ["Date",      data.scheduledDate ? formatDate(data.scheduledDate) : "—"],
          ["Time Slot", data.timeSlot?.label || "—"],
          ["Duration",  data.duration?.label || "—"],
          ["Group",     groupLabel],
          ["Note",      data.note || "—"],
        ].map(([k, v]) => (
          <div key={k} className="ps__summaryRow">
            <span className="ps__summaryKey">{k}</span>
            <span className="ps__summaryVal">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HISTORY TAB
═══════════════════════════════════════════════════════════ */
function HistoryTab({ searchTerm = "", registerRefresh }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const loadHistory = useCallback(() => {
    privateSession.getSessions("history")
      .then((data) => { setHistory(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    registerRefresh?.(loadHistory);
  }, [loadHistory, registerRefresh]);

  const searchFilter = (items) => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter((s) =>
      (s.subject || "").toLowerCase().includes(q) ||
      (s.teacher || "").toLowerCase().includes(q) ||
      (s.topic || "").toLowerCase().includes(q)
    );
  };

  const filtered = searchFilter(filter === "all" ? history : history.filter((h) => h.status === filter));

  if (loading) return <LoadingState plain label="Loading history" />;
  if (selected) return <HistoryDetail session={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      {/* The design's History tab puts a right-aligned filter above the card
          (line 1696). Keeping the count on the left — it's useful and doesn't
          disturb the layout. */}
      <div className="ac-filterBar">
        <span className="ac-head__sub">{filtered.length} session{filtered.length !== 1 ? "s" : ""}</span>
        <select className="ac-select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter history">
          <option value="all">All History</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="teacher_no_show">Teacher No-Show</option>
          <option value="student_no_show">Student No-Show</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <section className="ac-listCard">
          <div className="ac-emptyRow">
            {searchTerm || filter !== "all"
              ? "No sessions match your search/filter."
              : "No history yet"}
          </div>
        </section>
      ) : (
        <section className="ac-listCard ac-list">
          {filtered.map((h) => {
            const open = () => setSelected(h);
            return (
              <div
                key={h.id}
                className="ac-row"
                onClick={open}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
                }}
              >
                <div className="ac-row__when">
                  <div className="ac-row__time">{formatTime(h.time)}</div>
                  <div className="ac-row__day">{formatDate(h.date)}</div>
                </div>
                <div className="ac-row__divider" />
                <div className="ac-row__body">
                  <div className="ac-row__meta">
                    {h.subject && (
                      <span className={`subj-chip subj-chip--${subjectChipSlot(h.subject)}`}>
                        {h.subject}
                      </span>
                    )}
                    <span className={`ac-tag ac-tag--${statusTone(h.status)}`}>
                      {statusLabel(h.status)}
                    </span>
                    <span className="ac-when">{h.durationLabel}</span>
                  </div>
                  {h.topic && <div className="ac-row__topic">{h.topic}</div>}
                  <div className="ac-row__sub">
                    {h.teacher}
                    {h.groupStrength
                      ? ` · ${h.groupStrength} student${h.groupStrength !== 1 ? "s" : ""}`
                      : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function PrivateSessions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("scheduled");
  const [requestsUnread, setRequestsUnread] = useState(0);
  const [searchTerm] = useState("");
  const [openRequestForm, setOpenRequestForm] = useState(false);

  // Callbacks registered by child tabs so WebSocket can trigger their refresh
  const refreshCallbacksRef = useRef({});
  const registerRefresh = (tab, fn) => { refreshCallbacksRef.current[tab] = fn; };

  // ── Global per-user WebSocket for real-time session updates ──
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;
    const token = localStorage.getItem("access") || sessionStorage.getItem("access") || "";
    const url = `${proto}://${wsHost}/ws/private-session/notify/${token ? `?token=${token}` : ""}`;
    const ws = new WebSocket(url);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type !== "session_update") return;
        const s = msg.data;

        // Refresh whichever tab(s) this session now belongs to
        const scheduledStatuses = ["approved", "ongoing", "needs_reconfirmation"];
        const requestStatuses   = ["pending"];
        const historyStatuses   = ["completed", "cancelled", "declined", "expired",
                                   "withdrawn", "teacher_no_show", "student_no_show"];

        if (scheduledStatuses.includes(s.status)) {
          refreshCallbacksRef.current["scheduled"]?.();
        } else if (requestStatuses.includes(s.status)) {
          refreshCallbacksRef.current["requests"]?.();
        } else if (historyStatuses.includes(s.status)) {
          refreshCallbacksRef.current["scheduled"]?.();
          refreshCallbacksRef.current["requests"]?.();
          refreshCallbacksRef.current["history"]?.();
        }
      } catch {}
    };

    ws.onerror = () => {};
    return () => ws.close();
  }, []);

  const handleEnterRoom = (session) => navigate(`/private-session/live/${session.id}`);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "requests") setRequestsUnread(0);
  };

  return (
    <div className="ac-screen">
      <div className="ac-head">
        <div>
          <h1 className="ac-head__title">Private Sessions</h1>
          <p className="ac-head__sub">
            One-to-one time with your teachers — booked, requested and past.
          </p>
        </div>
        {/* The design puts a green "+ Request session" in the head; it's
            student-only (teachers get no such button), and per dc.html's
            `requestPrivSession` handler (line 1623) it opens the same
            4-step request flow as the Requests tab's own button — it used
            to navigate to /teachers instead, a dead end with no request
            action on that page. */}
        <button
          type="button"
          className="ac-headBtn ac-headBtn--success"
          onClick={() => { setActiveTab("requests"); setOpenRequestForm(true); }}
        >
          + Request session
        </button>
      </div>

      {/* Underline tab bar (design line 1626) — NOT the segmented pill toggle,
          which is Live Sessions only. */}
      <div className="ac-tabs" role="tablist" aria-label="Private session view">
        {["scheduled", "requests", "history"].map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`ac-tab${activeTab === tab ? " is-active" : ""}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "requests" && requestsUnread > 0 && (
              <span className="ac-tab__count">{requestsUnread}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "scheduled" && <ScheduledTab onEnterRoom={handleEnterRoom} searchTerm={searchTerm} registerRefresh={(fn) => registerRefresh("scheduled", fn)} />}
      {activeTab === "requests"  && (
        <RequestsTab
          onUnreadChange={setRequestsUnread}
          searchTerm={searchTerm}
          registerRefresh={(fn) => registerRefresh("requests", fn)}
          forceOpenForm={openRequestForm}
          onForceOpenFormHandled={() => setOpenRequestForm(false)}
        />
      )}
      {activeTab === "history"   && <HistoryTab searchTerm={searchTerm} registerRefresh={(fn) => registerRefresh("history", fn)} />}
    </div>
  );
}
