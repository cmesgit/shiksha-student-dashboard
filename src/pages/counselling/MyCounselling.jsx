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
import ConfirmDialog from "../../components/ConfirmDialog";
import { cancelAppointment, getAppointments, getReports } from "../../api/counsellingService";
import { HOME_URL } from "../../config/urls";
import "../../styles/counselling.css";

const fmtWhen = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

const STATUS_META = {
  confirmed: ["Confirmed", "mc-chip--green"],
  completed: ["Completed", "mc-chip--grey"],
  cancelled: ["Cancelled", "mc-chip--red"],
  no_show:   ["Missed", "mc-chip--red"],
};

const assessmentMeta = (a) => {
  if (!a.has_assessment) return [null, null];
  return a.assessment_submitted
    ? ["Assessment shared", "mc-chip--green"]
    : ["Assessment pending", "mc-chip--amber"];
};

export default function MyCounselling({ initialTab = "upcoming" }) {
  const { id: focusId } = useParams(); // /counseling/appointments/:id
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);
  const [upcoming, setUpcoming] = useState(null);
  const [past, setPast] = useState(null);
  const [reports, setReports] = useState(null);
  const [dlg, setDlg] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    getAppointments({ upcoming: 1 })
      .then((d) => setUpcoming(d.results || []))
      .catch(() => setError("Couldn't load your sessions — please refresh."));
    getAppointments()
      .then((d) => setPast((d.results || []).filter((a) => a.status !== "confirmed" || new Date(a.scheduled_at) < new Date())))
      .catch(() => {});
    getReports().then((d) => setReports(d.results || [])).catch(() => setReports([]));
  };
  useEffect(load, []);

  // A notification deep link to a past/report item should land on the right tab
  useEffect(() => {
    if (!focusId || !upcoming || !past) return;
    if (upcoming.some((a) => String(a.id) === String(focusId))) setTab("upcoming");
    else if (past.some((a) => String(a.id) === String(focusId))) setTab("past");
  }, [focusId, upcoming, past]);

  const askCancel = (appt) => setDlg({
    title: "Cancel this session?",
    message: `${appt.counselor?.display_name} will be notified. The slot opens up for other students.`,
    confirmLabel: "Yes, cancel session",
    danger: true,
    onConfirm: async () => {
      setDlg(null);
      try {
        await cancelAppointment(appt.id);
        load();
      } catch {
        setError("Couldn't cancel — please try again.");
      }
    },
  });

  const shown = (list) => {
    if (!list) return null;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) =>
      `${a.counselor?.display_name} ${a.learner?.display_name} ${a.student_note}`.toLowerCase().includes(q)
    );
  };

  const bookUrl = `${HOME_URL}/counselling/counsellors`;

  return (
    <div className="mc-page">
      <PageHeader title="My Counselling" onSearch={setSearch} />

      <div className="mc-tabs">
        {[["upcoming", "Upcoming"], ["past", "Past sessions"], ["reports", "My reports"]].map(([k, label]) => (
          <button key={k} className={`mc-tab${tab === k ? " mc-tab--on" : ""}`} onClick={() => setTab(k)}>
            {label}
            {k === "upcoming" && upcoming?.length > 0 && <span className="mc-tab-count">{upcoming.length}</span>}
            {k === "reports" && reports?.length > 0 && <span className="mc-tab-count">{reports.length}</span>}
          </button>
        ))}
        <a className="mc-book-link" href={bookUrl}>+ Book a new session</a>
      </div>

      {error && <div className="mc-error">{error}</div>}

      {tab === "upcoming" && (
        <SessionList
          list={shown(upcoming)}
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
      )}

      {tab === "past" && (
        <SessionList
          list={shown(past)}
          focusId={focusId}
          past
          empty={<><div className="mc-empty-title">No past sessions yet</div>Your session history will appear here.</>}
        />
      )}

      {tab === "reports" && <ReportsList list={shown(reports)} />}

      <ConfirmDialog dialog={dlg} onClose={() => setDlg(null)} />
    </div>
  );
}

/* ── session cards ── */

function SessionList({ list, focusId, past = false, onCancel, onOpenAssessment, empty }) {
  const [openId, setOpenId] = useState(focusId ? Number(focusId) : null);
  useEffect(() => { if (focusId) setOpenId(Number(focusId)); }, [focusId]);

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
                  {!past && a.status === "confirmed" && (
                    <>
                      {soon ? (
                        <a className="mc-btn" href={a.meeting_link} target="_blank" rel="noreferrer">
                          Join session
                        </a>
                      ) : (
                        <span className="mc-btn mc-btn--disabled" title="Your counsellor adds this before the session">
                          Meeting link coming soon
                        </span>
                      )}
                      {a.has_assessment && !a.assessment_submitted && (
                        <button className="mc-btn mc-btn--outline" onClick={() => onOpenAssessment(a)}>
                          Complete assessment
                        </button>
                      )}
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
