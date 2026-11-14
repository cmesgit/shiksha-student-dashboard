// ============================================================
// STUDENT — src/pages/DashboardV2.jsx
// ============================================================
//
// The Dashboards v2 home. Spec of record:
//   design_handoff_dashboards_v2/README.md  (+ its Reality corrections)
//   source/Dashboard Home.dc.html, role="student"
//
// Shipped alongside the existing Dashboard.jsx on its own route rather than
// replacing it, so nothing regresses while the redesign is reviewed.
//
// ── Panels and where their data comes from ──────────────────────────────
//   hero   LIVE NOW ............ /dashboard/ sessions[] where live === true
//   today  merged timeline ..... sessions + assignments + private_sessions
//   b      Due soon ............ assignments[]
//   c      Subject progress .... /courses/my-batch-progress/?course=<id>
//   cal    month calendar ...... all three date-bearing collections
//   a      Continue… .......... NO ENDPOINT — honest empty state, see below
//   d      Attendance .......... DOES NOT EXIST — honest empty state
//
// ── Two panels are deliberately not fabricated ──────────────────────────
// The design mocks "Continue where you left off" (recording 24 min left,
// chapter practice 12 of 20, quiz question 7 of 15) and "Attendance"
// (92%, 23 of 25 classes, "Missed: Maths on 3 Nov"). Neither has a backend:
//
//   • VideoProgress is readable one recording at a time
//     (courses/views_progress.py GetVideoProgressView) — there is no
//     "my in-progress items" query. Chapter practice deliberately re-draws
//     its question set on every start, and mock-quiz answers are not
//     persisted server-side at all.
//   • There is no attendance percentage anywhere in the backend. The
//     LiveSessionAttendance rows are LiveKit presence telemetry for a single
//     call — summed watch seconds, no roll-call, no denominator. See
//     ATTENDANCE_TRACKING_TODO.md for why it was deferred.
//
// Both render a labelled empty state that says what is missing rather than
// a plausible-looking number. Phase B builds the endpoints; when they land,
// fill these two in and delete this note.

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { useCourse } from "../contexts/CourseContext";
import { useAuth } from "../contexts/AuthContext";
import useNotificationSocket from "../hooks/useNotificationSocket";
import { LoadingState } from "../components/StateViews";
import { PICK_PROFILE_URL } from "../config/urls";
import { subjectChipPalette, subjectInitials } from "../utils/subjectChips";
import { fmtClockTime, startsInText } from "../utils/sessionTime";
import useTheme from "../hooks/useTheme";
import CommandPalette from "../components/CommandPalette";
import "../styles/dashboardV2.css";

const REFRESH_TYPES = new Set(["ASSIGNMENT", "QUIZ", "SESSION", "LIVE_SESSION"]);

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

/* The design's four calendar dot states. `assignment-overdue` is a distinct
   red that the design's own legend omits — the shipped CalendarWidget has it
   and dropping it would lose a real signal. */
const EVENT_KINDS = {
  live: { cls: "dv2-dot-live", label: "Live" },
  assignment: { cls: "dv2-dot-assign", label: "Assignment" },
  "assignment-overdue": { cls: "dv2-dot-overdue", label: "Overdue" },
  private: { cls: "dv2-dot-private", label: "Private" },
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* ── Today timeline ──────────────────────────────────────────────────────
   The design renders classes, private sessions and assignment deadlines in
   one time-ordered column. Quizzes are deliberately absent: they carry no
   due date (a quiz stays attemptable once published), so they are not
   date-scheduled events and cannot take a position on a time axis. */
function buildToday(sessions, assignments, privateSessions, now) {
  const items = [];

  for (const s of sessions) {
    const when = parseDate(s.dateTime || s.start_time);
    if (!when || !sameDay(when, now)) continue;
    items.push({
      key: `s-${s.id}`,
      when,
      subject: s.subject,
      kind: s.live ? "Live now" : `Live class · ${startsInText(when) || "scheduled"}`,
      title: s.topic,
      person: s.teacher,
      action: s.live ? "Join" : "Remind me",
      to: `/live-sessions/${s.id}`,
      live: !!s.live,
    });
  }

  for (const p of privateSessions) {
    const when = parseDate(p.date && p.time ? `${p.date}T${p.time}` : p.date);
    if (!when || !sameDay(when, now)) continue;
    items.push({
      key: `p-${p.id}`,
      when,
      subject: p.subject,
      kind: "Private session",
      title: p.session_type || "Private session",
      person: p.teacher_name,
      action: "Details",
      to: `/private-sessions/${p.id}`,
    });
  }

  for (const a of assignments) {
    const when = parseDate(a.due);
    if (!when || !sameDay(when, now)) continue;
    items.push({
      key: `a-${a.id}`,
      when,
      subject: a.subject_name,
      kind: "Assignment due",
      title: a.title,
      // The design shows "Not started" vs "Draft saved". AssignmentSubmission
      // has a required file and no status field, so a draft is unrepresentable
      // — we show only what the serializer actually knows.
      person: a.status || null,
      action: "Open",
      to: `/assignments/${a.id}`,
    });
  }

  return items.sort((x, y) => x.when - y.when);
}

function dueLabel(due, now) {
  const d = parseDate(due);
  if (!d) return { text: "No due date", overdue: false };
  const overdue = d < now;
  if (overdue) {
    const days = Math.max(1, Math.round((now - d) / 86400000));
    return { text: `Overdue by ${days} day${days === 1 ? "" : "s"}`, overdue: true };
  }
  if (sameDay(d, now)) return { text: `Due today, ${fmtClockTime(d)}`, overdue: false };
  return {
    text: `Due ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`,
    overdue: false,
  };
}

export default function DashboardV2() {
  const navigate = useNavigate();
  const { activeCourse, loading: courseLoading } = useCourse();
  const { user } = useAuth();
  const { onEvent, unreadCount } = useNotificationSocket();
  const { theme, toggleTheme } = useTheme();

  const [data, setData] = useState(null);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = useMemo(() => new Date(), []);
  const abortRef = useRef(null);

  const fetchAll = useCallback(async ({ silent = false } = {}) => {
    if (!activeCourse) { setLoading(false); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!silent) { setLoading(true); setError(""); }
    try {
      const res = await api.get(`/dashboard/?course_id=${activeCourse.id}`, {
        signal: controller.signal,
      });
      setData(res.data);
      setError("");
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err?.response?.data?.code === "profile_required") {
        window.location.href = PICK_PROFILE_URL;
        return;
      }
      if (!silent) setError("Couldn't load your dashboard.");
      console.error("Failed to load dashboard", err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }

    // Subject progress is a SEPARATE call — it is not on /dashboard/, and it
    // takes ?course= as a query param, not a path segment. Failing it must
    // not blank the whole page, so it is caught independently.
    try {
      const p = await api.get(`/courses/my-batch-progress/?course=${activeCourse.id}`, {
        signal: controller.signal,
      });
      setProgress(Array.isArray(p.data) ? p.data : (p.data?.subjects ?? []));
    } catch (err) {
      if (!controller.signal.aborted) setProgress([]);
    }
  }, [activeCourse]);

  useEffect(() => {
    fetchAll();
    return () => abortRef.current?.abort();
  }, [fetchAll]);

  useEffect(() => {
    let t = null;
    const off = onEvent((n) => {
      if (!REFRESH_TYPES.has(n?.type)) return;
      clearTimeout(t);
      t = setTimeout(() => fetchAll({ silent: true }), 1500);
    });
    return () => { off(); clearTimeout(t); };
  }, [onEvent, fetchAll]);

  // ⌘/Ctrl-K opens the palette, Escape closes it. The listener goes on
  // `document`, not `window` — a keydown dispatched at the window does not
  // reach a window-level handler in every embedding.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const sessions = data?.sessions ?? [];
  const assignments = data?.assignments ?? [];
  const privateSessions = data?.private_sessions ?? [];

  const heroSession = useMemo(
    () => sessions.find((s) => s.live) || null,
    [sessions]
  );

  const todayItems = useMemo(
    () => buildToday(sessions, assignments, privateSessions, now),
    [sessions, assignments, privateSessions, now]
  );

  const todayClasses = todayItems.filter((i) => i.kind !== "Assignment due").length;
  const todayDeadlines = todayItems.length - todayClasses;

  const dueSoon = useMemo(() => {
    return [...assignments]
      .filter((a) => a.due)
      .sort((a, b) => new Date(a.due) - new Date(b.due))
      .slice(0, 6);
  }, [assignments]);

  // ── Calendar ──────────────────────────────────────────────────────────
  const calendar = useMemo(() => {
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = base.getFullYear(), month = base.getMonth();
    const firstDow = (base.getDay() + 6) % 7;           // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const marks = {};
    const mark = (d, kind) => {
      if (!d || d.getFullYear() !== year || d.getMonth() !== month) return;
      (marks[d.getDate()] ||= new Set()).add(kind);
    };
    sessions.forEach((s) => mark(parseDate(s.dateTime || s.start_time), "live"));
    privateSessions.forEach((p) =>
      mark(parseDate(p.date && p.time ? `${p.date}T${p.time}` : p.date), "private"));
    assignments.forEach((a) => {
      const d = parseDate(a.due);
      mark(d, d && d < now ? "assignment-overdue" : "assignment");
    });

    return { year, month, firstDow, daysInMonth, marks };
  }, [sessions, assignments, privateSessions, monthOffset, now]);

  if (courseLoading || loading) return <LoadingState />;

  if (error) {
    return (
      <div className="dv2-screen">
        <div className="dv2-retry">
          <p>{error}</p>
          <button className="dv2-btn dv2-btn-primary" onClick={() => fetchAll()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const firstName = (user?.full_name || user?.name || "").split(" ")[0];

  return (
    <div className="dv2-screen" data-dv2-role="student">
      {/* ── Topbar ─────────────────────────────────────────────────────────
          The design's topbar carries a page title + date on the left. The app
          chrome (StudentLayout's Header) ALREADY renders both, so repeating
          them here double-printed "Dashboard" and the date on screen. Only
          the two controls the chrome lacks — search and the theme toggle —
          live here; the title stays where the rest of the app puts it. */}
      <header className="dv2-topbar">
        <button
          type="button"
          className="dv2-search"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search classes, assignments, people"
        >
          <span>Search classes, assignments, people</span>
          <kbd>Ctrl K</kbd>
        </button>

        <div className="dv2-topbar-actions">
          <button
            type="button"
            className="dv2-icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            aria-pressed={theme === "dark"}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            type="button"
            className="dv2-icon-btn"
            onClick={() => navigate("/notifications")}
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          >
            🔔
            {unreadCount > 0 && <span className="dv2-badge">{unreadCount}</span>}
          </button>
        </div>
      </header>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <div className="dv2-grid">
        {/* hero */}
        <section className="dv2-panel dv2-hero" style={{ gridArea: "hero" }}>
          {heroSession ? (
            <>
              <span className="dv2-live-chip">LIVE NOW</span>
              {/* fmtClockTime takes a Date and would throw on null — a live
                  session with an unparseable start drops the line instead. */}
              {parseDate(heroSession.dateTime || heroSession.start_time) && (
                <p className="dv2-hero-meta">
                  In progress, started{" "}
                  {fmtClockTime(parseDate(heroSession.dateTime || heroSession.start_time))}
                </p>
              )}
              <h2 className="dv2-hero-title">
                {heroSession.subject} — {heroSession.topic}
              </h2>
              <p className="dv2-hero-sub">with {heroSession.teacher}</p>
              <button
                className="dv2-btn dv2-btn-primary"
                onClick={() => navigate(`/live-sessions/${heroSession.id}`)}
              >
                Join class
              </button>
            </>
          ) : (
            <>
              <h2 className="dv2-hero-title">
                {firstName ? `Good day, ${firstName}` : "Good day"}
              </h2>
              <p className="dv2-hero-sub">
                {todayItems.length
                  ? `${todayClasses} ${todayClasses === 1 ? "class" : "classes"} and ${todayDeadlines} ${todayDeadlines === 1 ? "deadline" : "deadlines"} today.`
                  : "Nothing scheduled today."}
              </p>
            </>
          )}
        </section>

        {/* today */}
        <section className="dv2-panel" style={{ gridArea: "today" }}>
          <div className="dv2-panel-head">
            <h3>Today</h3>
            <span className="dv2-panel-meta">
              {todayClasses} {todayClasses === 1 ? "class" : "classes"} · {todayDeadlines}{" "}
              {todayDeadlines === 1 ? "deadline" : "deadlines"}
            </span>
          </div>

          {todayItems.length === 0 ? (
            <p className="dv2-empty">Nothing scheduled today.</p>
          ) : (
            <ul className="dv2-timeline">
              {todayItems.map((it) => {
                const chip = subjectChipPalette(it.subject);
                return (
                  <li key={it.key} className="dv2-tl-row">
                    <time className="dv2-tl-time">{fmtClockTime(it.when)}</time>
                    <div className="dv2-tl-body">
                      <span
                        className="dv2-chip"
                        style={{ background: chip.bg, color: chip.ink }}
                      >
                        {it.subject}
                      </span>
                      <span className={`dv2-tl-kind${it.live ? " is-live" : ""}`}>
                        {it.kind}
                      </span>
                      <p className="dv2-tl-title">{it.title}</p>
                      {it.person && <p className="dv2-tl-person">{it.person}</p>}
                    </div>
                    <button
                      className={`dv2-btn ${it.live ? "dv2-btn-primary" : "dv2-btn-ghost"}`}
                      onClick={() => navigate(it.to)}
                    >
                      {it.action}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* a — Continue where you left off (no endpoint yet) */}
        <section className="dv2-panel" style={{ gridArea: "a" }}>
          <div className="dv2-panel-head"><h3>Continue where you left off</h3></div>
          <p className="dv2-empty">
            Not available yet — resuming a recording, a practice set or a quiz
            needs a progress endpoint that hasn't been built.
          </p>
        </section>

        {/* b — Due soon */}
        <section className="dv2-panel" style={{ gridArea: "b" }}>
          <div className="dv2-panel-head">
            <h3>Due soon</h3>
            <span className="dv2-panel-meta">{dueSoon.length} open</span>
          </div>
          {dueSoon.length === 0 ? (
            <p className="dv2-empty">Nothing due.</p>
          ) : (
            <ul className="dv2-list">
              {dueSoon.map((a) => {
                const chip = subjectChipPalette(a.subject_name);
                const due = dueLabel(a.due, now);
                return (
                  <li key={a.id} className="dv2-list-row">
                    <span
                      className="dv2-chip dv2-chip-sq"
                      style={{ background: chip.bg, color: chip.ink }}
                    >
                      {subjectInitials(a.subject_name)}
                    </span>
                    <div className="dv2-list-body">
                      <p className="dv2-list-title">{a.title}</p>
                      <p className={`dv2-list-meta${due.overdue ? " is-overdue" : ""}`}>
                        {due.text}
                      </p>
                    </div>
                    <button
                      className="dv2-btn dv2-btn-ghost"
                      onClick={() => navigate(`/assignments/${a.id}`)}
                    >
                      Open
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* c — Subject progress */}
        <section className="dv2-panel" style={{ gridArea: "c" }}>
          <div className="dv2-panel-head">
            <h3>Subject progress</h3>
          </div>
          {progress.length === 0 ? (
            <p className="dv2-empty">No chapter progress recorded yet.</p>
          ) : (
            <>
              <ul className="dv2-progress">
                {progress.map((s) => {
                  const total = s.chapters_total ?? 0;
                  const done = s.chapters_covered ?? 0;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <li key={s.subject_id || s.id || s.subject_name}>
                      <div className="dv2-progress-head">
                        <span>{s.subject_name || s.name}</span>
                        <b>{pct}%</b>
                      </div>
                      <div className="dv2-bar"><i style={{ width: `${pct}%` }} /></div>
                      <span className="dv2-progress-meta">
                        {done} of {total} chapters
                      </span>
                    </li>
                  );
                })}
              </ul>
              {/* Honesty note: this is the teacher's syllabus coverage for the
                  batch — build_course_progress counts Chapter.is_covered and
                  takes no student argument, so every student in the batch sees
                  the same figure. Labelling it "your progress" would be false. */}
              <p className="dv2-footnote">Chapters your teacher has covered.</p>
            </>
          )}
        </section>

        {/* d — Attendance (does not exist) */}
        <section className="dv2-panel" style={{ gridArea: "d" }}>
          <div className="dv2-panel-head"><h3>Attendance</h3></div>
          <p className="dv2-empty">
            Attendance isn't tracked yet. Joining a class is recorded, but
            there's no per-student roll-call to total up.
          </p>
        </section>

        {/* cal */}
        <section className="dv2-panel dv2-cal" style={{ gridArea: "cal" }}>
          <div className="dv2-cal-head">
            <button
              className="dv2-icon-btn"
              onClick={() => setMonthOffset((m) => m - 1)}
              aria-label="Previous month"
            >‹</button>
            <strong>{MONTHS[calendar.month]} {calendar.year}</strong>
            <button
              className="dv2-icon-btn"
              onClick={() => setMonthOffset((m) => m + 1)}
              aria-label="Next month"
            >›</button>
          </div>

          <div className="dv2-cal-grid" role="grid">
            {WEEKDAYS.map((w) => (
              <span key={w} className="dv2-cal-dow">{w}</span>
            ))}
            {Array.from({ length: calendar.firstDow }).map((_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {Array.from({ length: calendar.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const kinds = calendar.marks[day];
              const isToday =
                monthOffset === 0 && day === now.getDate();
              return (
                <span key={day} className={`dv2-cal-day${isToday ? " is-today" : ""}`}>
                  {day}
                  {kinds && (
                    <span className="dv2-cal-dots">
                      {[...kinds].map((k) => (
                        <i key={k} className={EVENT_KINDS[k].cls} />
                      ))}
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          <div className="dv2-cal-legend">
            {Object.entries(EVENT_KINDS).map(([k, v]) => (
              <span key={k}><i className={v.cls} />{v.label}</span>
            ))}
          </div>
        </section>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
