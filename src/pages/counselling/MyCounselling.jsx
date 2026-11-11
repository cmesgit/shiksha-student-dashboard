// PLACEMENT: src/pages/counselling/MyCounselling.jsx   (NEW FILE — student dashboard app)
//
// "My Counselling" — the post-booking half of the counselling
// experience (booking + discovery live on the landing site funnel).
//
//   • Upcoming — confirmed sessions: counsellor, date/time, meeting
//     link (Join button lights up once the counsellor adds it),
//     pre-session assessment status chip, cancel (ConfirmDialog).
//   • Past — completed / cancelled / no-show history.
//   • Reports — published session reports (summary, recommendations,
//     next steps). Drafts never appear here — the backend only
//     returns published ones.
//
// Deep links (match the backend's notification link_urls):
//   /counseling/appointments/<id>  → opens with that card expanded
//   /counseling/reports            → opens the Reports tab

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import { useAuth } from "../../contexts/AuthContext";
import { cancelAppointment, getAppointments, getReports, getGuideProgressList, getCounsellingIntake, getCounsellingNotifications } from "../../api/counsellingService";
import ReviewWidget from "./ReviewWidget";
import RescheduleDialog from "./RescheduleDialog";
import { HOME_URL } from "../../config/urls";
import CounsellingNotifications from "./CounsellingNotifications";
import CounsellingHome from "./CounsellingHome";
import "../../styles/counselling.css";

const fmtWhen = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

const STATUS_META = {
  pending: ["Pending", "mc-chip--amber"],
  confirmed: ["Confirmed", "mc-chip--green"],
  completed: ["Completed", "mc-chip--grey"],
  cancelled: ["Cancelled", "mc-chip--red"],
  no_show:   ["Missed", "mc-chip--red"],
  rejected: ["Declined", "mc-chip--red"],
};

const assessmentMeta = (a) => {
  if (!a.has_assessment) return [null, null];
  return a.assessment_submitted
    ? ["Assessment shared", "mc-chip--green"]
    : ["Assessment pending", "mc-chip--amber"];
};

export default function MyCounselling({ initialTab = "home" }) {
  const { id: focusId } = useParams(); // /counseling/appointments/:id
  const navigate = useNavigate();
  const { activeProfile, user } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [upcoming, setUpcoming] = useState(null);
  const [past, setPast] = useState(null);
  const [reports, setReports] = useState(null);
  const [progress, setProgress] = useState(null);
  const [intake, setIntake] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cancelling, setCancelling] = useState(null);
  const [rescheduling, setRescheduling] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [historyFilter, setHistoryFilter] = useState("completed");
  const [sort, setSort] = useState("soonest");

  const load = () => {
    getAppointments()
      .then((d) => {
        const all = d.results || [];
        const now = new Date();
        setUpcoming(all.filter((a) => ["pending", "confirmed"].includes(a.status) && new Date(a.scheduled_at) >= now)
          .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)));
        setPast(all.filter((a) => ["completed", "cancelled", "no_show", "rejected"].includes(a.status)));
      })
      .catch(() => { setUpcoming([]); setPast([]); setError("Couldn't load your sessions — please refresh."); });
    getReports().then((d) => setReports(d.results || [])).catch(() => setReports([]));
    getGuideProgressList().then((d) => setProgress(d.results || [])).catch(() => setProgress([]));
    getCounsellingIntake().then(setIntake).catch(() => setIntake(null));
  };
  useEffect(load, [activeProfile?.id]);
  useEffect(() => {
    const identity = activeProfile?.id ? `L:${activeProfile.id}` : undefined;
    getCounsellingNotifications({ identity, unread: 1, page_size: 1 })
      .then((data) => setUnreadCount(data.count || 0))
      .catch(() => setUnreadCount(0));
  }, [activeProfile?.id]);
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  // A notification deep link to a past/report item should land on the right tab
  useEffect(() => {
    if (!focusId || !upcoming || !past) return;
    if (upcoming.some((a) => String(a.id) === String(focusId))) setTab("upcoming");
    else if (past.some((a) => String(a.id) === String(focusId))) setTab("past");
  }, [focusId, upcoming, past]);

  const askCancel = (appt) => setCancelling(appt);
  const doCancel = async (reason) => {
    if (!cancelling) return;
    try {
      await cancelAppointment(cancelling.id, reason);
      setCancelling(null);
      load();
    } catch { setError("Couldn't cancel — please try again."); }
  };

  // Patch one appointment in both lists rather than reloading. A full
  // refetch re-renders SessionList, which collapses the open card the
  // student is in the middle of rating.
  const patchAppointment = (updated) => {
    const swap = (list) => (list || []).map((a) => (a.id === updated.id ? { ...a, ...updated } : a));
    setUpcoming((l) => (l === null ? l : swap(l)));
    setPast((l) => (l === null ? l : swap(l)));
  };

  const shown = (list) => {
    if (!list) return null;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) =>
      `${a.counselor?.display_name} ${a.learner?.display_name} ${a.student_note}`.toLowerCase().includes(q)
    );
  };

  const bookUrl = `${HOME_URL}/counselling/counsellors`;
  const rail = [
    ["home", "Home", "/counseling"],
    ["matches", "Find counsellors", bookUrl],
    ["path", "Career report", `${HOME_URL}/counselling/path`],
    ["wizard", "Profile wizard", `${HOME_URL}/counselling/profile`],
    ["spark", "Spark Finder", `${HOME_URL}/counselling/spark`],
    ["library", "Resource library", `${HOME_URL}/counselling/guides`],
    ["notifications", "Notifications", "/counseling/notifications"],
    ["upcoming", "My sessions", "/counseling/appointments"],
    ["past", "Session history", "/counseling/history"],
  ];

  const sessionList = shown(upcoming)?.filter((a) => sessionFilter === "all" || a.status === sessionFilter)
    .sort((a, b) => (sort === "soonest" ? 1 : -1) * (new Date(a.scheduled_at) - new Date(b.scheduled_at))) ?? null;
  const historyList = shown(past)?.filter((a) => historyFilter === "completed" ? a.status === "completed" : a.status !== "completed")
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)) ?? null;
  const homeSessions = (rows) => rows?.filter((a) =>
    !activeProfile?.id || String(a.learner?.id) === String(activeProfile.id)) ?? rows;

  return (
    <div className="mc-page">
      <PageHeader title="My Counselling" onSearch={setSearch} />

      <div className="mc-shell">
        <nav className="mc-rail" aria-label="Counselling">
          {rail.map(([key, label, href]) => href.startsWith("http") ?
            <a key={key} href={href} className={tab === key ? "mc-rail-link on" : "mc-rail-link"}>{label} ↗</a> :
            <Link key={key} to={href} onClick={() => setTab(key)} className={tab === key ? "mc-rail-link on" : "mc-rail-link"}>
              {label}{key === "notifications" && unreadCount > 0 && <span className="mc-rail-count">{unreadCount}</span>}
            </Link>)}
        </nav>
        <div className="mc-main">

      {tab === "home" && <CounsellingHome
        profile={activeProfile} user={user} intake={intake} upcoming={homeSessions(upcoming)}
        past={homeSessions(past)} progress={progress} bookUrl={bookUrl} />}

      {tab === "notifications" && <CounsellingNotifications identity={activeProfile?.id ? `L:${activeProfile.id}` : undefined}
        onUnreadChange={setUnreadCount} />}

      {["upcoming", "past", "reports"].includes(tab) && <div className="mc-tabs">
        {[["upcoming", "Upcoming"], ["past", "Past sessions"], ["reports", "My reports"]].map(([k, label]) => (
          <button key={k} className={`mc-tab${tab === k ? " mc-tab--on" : ""}`} onClick={() => setTab(k)}>
            {label}
            {k === "upcoming" && upcoming?.length > 0 && <span className="mc-tab-count">{upcoming.length}</span>}
            {k === "reports" && reports?.length > 0 && <span className="mc-tab-count">{reports.length}</span>}
          </button>
        ))}
        <a className="mc-book-link" href={bookUrl}>+ Book a new session</a>
      </div>}

      {error && <div className="mc-error">{error}</div>}

      {tab === "upcoming" && (
        <>
        <div className="mc-list-controls">
          <div className="mc-tabs" role="tablist" aria-label="Session status">
            {[["all", "All"], ["confirmed", "Confirmed"], ["pending", "Pending"]].map(([key, label]) =>
              <button key={key} role="tab" aria-selected={sessionFilter === key} className={`mc-tab${sessionFilter === key ? " mc-tab--on" : ""}`}
                onClick={() => setSessionFilter(key)}>{label}</button>)}
          </div>
          <select className="mc-sort" aria-label="Sort sessions" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="soonest">Soonest first</option><option value="latest">Latest first</option>
          </select>
        </div>
        <SessionList
          key={`upcoming-${focusId || "list"}`}
          onReschedule={setRescheduling}
          list={sessionList}
          focusId={focusId}
          onCancel={askCancel}
          onOpenAssessment={(a) => navigate(`/counseling/appointments/${a.id}/assessment`)}
          empty={
            <>
              <div className="mc-empty-title">No upcoming sessions</div>
              Get matched with a counsellor and pick a slot on the main site.
              <div style={{ marginTop: 14 }}>
                <a className="mc-btn" href={bookUrl}>Find my counsellor →</a>
              </div>
            </>
          }
        />
        </>
      )}

      {tab === "past" && (
        <>
        <div className="mc-tabs" role="tablist" aria-label="Session history status">
          {[["completed", "Completed"], ["cancelled", "Cancelled & declined"]].map(([key, label]) =>
            <button key={key} role="tab" aria-selected={historyFilter === key} className={`mc-tab${historyFilter === key ? " mc-tab--on" : ""}`}
              onClick={() => setHistoryFilter(key)}>{label}</button>)}
        </div>
        <SessionList
          key={`past-${focusId || "list"}`}
          onReviewSaved={patchAppointment}
          list={historyList}
          focusId={focusId}
          past
          empty={<><div className="mc-empty-title">No past sessions yet</div>Your session history will appear here.</>}
        />
        </>
      )}

      {tab === "reports" && <ReportsList list={shown(reports)} />}

      {rescheduling && (
        <RescheduleDialog
          appointment={rescheduling}
          onClose={() => setRescheduling(null)}
          onDone={(updated) => { patchAppointment(updated); setRescheduling(null); }}
        />
      )}

      {cancelling && <CancelDialog appointment={cancelling} onClose={() => setCancelling(null)} onConfirm={doCancel} />}
        </div>
      </div>
    </div>
  );
}

/* ── session cards ── */

function SessionList({ list, focusId, past = false, onCancel, onOpenAssessment,
                      onReschedule, onReviewSaved, empty }) {
  const [openId, setOpenId] = useState(focusId ? Number(focusId) : null);

  if (list === null) return <div className="mc-skel" style={{ height: 150 }} />;
  if (list.length === 0) return <div className="mc-empty">{empty}</div>;

  return (
    <div className="mc-list">
      {list.map((a) => {
        const [statusLabel, statusCls] = STATUS_META[a.status] || [a.status, "mc-chip--grey"];
        const [assessLabel, assessCls] = assessmentMeta(a);
        const open = openId === a.id;
        const soon = !past && a.meeting_link;
        return (
          <div key={a.id} className={`mc-card${open ? " mc-card--open" : ""}`} id={`appt-${a.id}`}>
            <button className="mc-card-head" onClick={() => setOpenId(open ? null : a.id)}>
              <div className="mc-avatar">{(a.counselor?.display_name || "?").slice(0, 1)}</div>
              <div className="mc-card-main">
                <div className="mc-card-title">{a.counselor?.display_name}</div>
                <div className="mc-card-sub">
                  {fmtWhen(a.scheduled_at)} · {a.duration_minutes} min
                  {a.learner?.display_name ? ` · for ${a.learner.display_name}` : ""}
                </div>
              </div>
              <span className={`mc-chip ${statusCls}`}>{statusLabel}</span>
              <span className="mc-caret">{open ? "▾" : "▸"}</span>
            </button>

            {open && (
              <div className="mc-card-body">
                {a.student_note && (
                  <div className="mc-note">"{a.student_note}"</div>
                )}
                {a.status === "cancelled" && a.cancel_reason && (
                  <div className="mc-note mc-note--cancel">Cancelled: {a.cancel_reason}</div>
                )}
                <div className="mc-row-chips">
                  {assessLabel && !past && <span className={`mc-chip ${assessCls}`}>{assessLabel}</span>}
                  {a.has_report && <span className="mc-chip mc-chip--green">Report published</span>}
                </div>
                <div className="mc-actions">
                  {!past && ["confirmed", "pending"].includes(a.status) && (
                    <>
                      {a.status === "pending" ? <span className="mc-chip mc-chip--amber">Awaiting counsellor approval</span> : soon ? (
                        <a className="mc-btn" href={a.meeting_link} target="_blank" rel="noreferrer">
                          Join session
                        </a>
                      ) : (
                        <span className="mc-btn mc-btn--disabled" title="Your counsellor adds this before the session">
                          Meeting link coming soon
                        </span>
                      )}
                      {a.status === "confirmed" && a.has_assessment && !a.assessment_submitted && (
                        <button className="mc-btn mc-btn--outline" onClick={() => onOpenAssessment(a)}>
                          Complete assessment
                        </button>
                      )}
                      <button className="mc-btn mc-btn--outline" onClick={() => onReschedule(a)}>
                        Reschedule
                      </button>
                      <button className="mc-btn mc-btn--danger" onClick={() => onCancel(a)}>
                        Cancel
                      </button>
                    </>
                  )}
                  {past && a.has_report && (
                    <Link className="mc-btn mc-btn--outline" to="/counseling/reports">
                      View report
                    </Link>
                  )}
                </div>

                {/* Rating is offered only on a COMPLETED session — the
                    endpoint refuses anything else, so showing it on a
                    cancelled or no-show card would be a dead control. */}
                {past && a.status === "completed" && onReviewSaved && (
                  <ReviewWidget appointment={a} onSaved={onReviewSaved} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── reports ── */

function ReportsList({ list }) {
  if (list === null) return <div className="mc-skel" style={{ height: 150 }} />;
  if (list.length === 0) {
    return (
      <div className="mc-empty">
        <div className="mc-empty-title">No reports yet</div>
        After a session, your counsellor writes up a summary with
        recommendations and next steps — it appears here the moment it's
        published (you'll get a notification and an email too).
      </div>
    );
  }
  return (
    <div className="mc-list">
      {list.map((r) => (
        <div key={r.id} className="mc-card mc-card--open">
          <div className="mc-card-head" style={{ cursor: "default" }}>
            <div className="mc-avatar">{(r.counselor_name || "?").slice(0, 1)}</div>
            <div className="mc-card-main">
              <div className="mc-card-title">Session report — {r.counselor_name}</div>
              <div className="mc-card-sub">
                Session on {fmtWhen(r.appointment_at)}
                {r.learner?.display_name ? ` · for ${r.learner.display_name}` : ""}
                {r.published_at ? ` · published ${new Date(r.published_at).toLocaleDateString("en-IN")}` : ""}
              </div>
            </div>
          </div>
          <div className="mc-card-body">
            {r.summary && <ReportSection title="Summary" text={r.summary} />}
            {r.recommendations && <ReportSection title="Recommendations" text={r.recommendations} />}
            {r.next_steps && <ReportSection title="Next steps" text={r.next_steps} />}
            {r.attachment_url && (
              <a className="mc-btn mc-btn--outline" href={r.attachment_url} target="_blank" rel="noreferrer">
                Download attachment
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const ReportSection = ({ title, text }) => (
  <div className="mc-report-sec">
    <div className="mc-report-label">{title}</div>
    <p className="mc-report-text">{text}</p>
  </div>
);

function CancelDialog({ appointment, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try { await onConfirm(reason.trim()); } finally { setBusy(false); }
  };
  return <div className="rs-mask" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="rs-dialog" role="dialog" aria-modal="true" aria-labelledby="mc-cancel-title">
      <div className="rs-head"><div><h2 className="rs-title" id="mc-cancel-title">Cancel this session?</h2>
        <p className="rs-sub">{appointment.counselor?.display_name} will be notified and the slot will open for others.</p></div>
        <button className="rs-x" onClick={onClose} aria-label="Close">×</button></div>
      <div className="rs-body"><label className="mc-label" htmlFor="mc-cancel-reason">Reason for cancelling</label>
        <textarea id="mc-cancel-reason" className="mc-textarea" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Briefly explain why you need to cancel" maxLength={300} /></div>
      <div className="rs-foot"><button className="mc-btn mc-btn--outline" onClick={onClose}>Keep session</button>
        <button className="mc-btn mc-btn--danger" disabled={!reason.trim() || busy} onClick={submit}>
          {busy ? "Cancelling…" : "Cancel session"}</button></div>
    </div>
  </div>;
}
