import React from "react";
import { useNavigate } from "react-router-dom";
import { Fragment, useState, useEffect, useRef, useMemo } from "react";
import { useCourse } from "../contexts/CourseContext";
import api from "../api/apiClient";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import "../styles/academyScreens.css";
import useNotificationSocket from "../hooks/useNotificationSocket";
import { subjectChipSlot } from "../utils/subjectChips";
import { fmtClockTime, dayLabel, startsInText } from "../utils/sessionTime";
import AcademyRail from "../components/academy/AcademyRail";
import NotesViewModal from "../components/live/NotesViewModal";

function computeStatus(session) {
  const now = Date.now();
  const end = new Date(session.end_time).getTime();
  const start = new Date(session.start_time).getTime();
  if (session.status === "CANCELLED") return "CANCELLED";
  if (session.status === "COMPLETED") return "COMPLETED";
  if (now >= end) return "COMPLETED";
  if (session.status === "PAUSED" && !session.teacher_left_at) return "PAUSED";
  if (session.teacher_left_at) {
    const mins = (now - new Date(session.teacher_left_at).getTime()) / 60000;
    if (mins <= 10) return "RECONNECTING";
    if (mins <= 60) return "PAUSED";
    return "COMPLETED";
  }
  if (session.status === "LIVE") return "LIVE";
  if (now < start) return "SCHEDULED";
  return "WAITING_FOR_TEACHER";
}

function computeCanJoin(session) {
  const now = Date.now();
  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  if (session.status === "CANCELLED") return false;
  if (now >= end) return false;
  if (session.status === "COMPLETED") return false;
  if (session.teacher_left_at) {
    const mins = (now - new Date(session.teacher_left_at).getTime()) / 60000;
    if (mins > 60) return false;
  }
  return now >= start - 15 * 60000;
}

// Statuses that still belong on the "Upcoming" tab (anything not finished/cancelled).
const UPCOMING_STATUSES = new Set([
  "LIVE",
  "PAUSED",
  "RECONNECTING",
  "SCHEDULED",
  "WAITING_FOR_TEACHER",
]);

// Only covers the statuses actually rendered through the tag branch below
// (PAUSED / RECONNECTING / WAITING_FOR_TEACHER / CANCELLED — SCHEDULED, LIVE,
// and COMPLETED each render their own treatment). `tone` picks an .ac-tag--*
// variant from the shared vocabulary, so the colours stay in tokens.css.
const STATUS_CONFIG = {
  PAUSED:              { label: "Paused",        tone: "warning" },
  RECONNECTING:        { label: "Reconnecting",  tone: "warning" },
  WAITING_FOR_TEACHER: { label: "Starting soon", tone: "info" },
  CANCELLED:           { label: "Cancelled",     tone: "danger" },
};

function getLiveDuration(startTime) {
  const now = Date.now();
  const start = new Date(startTime).getTime();

  const diffMinutes = Math.floor((now - start) / 60000);

  if (diffMinutes < 60) {
    return `${diffMinutes} min live`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  return `${hours}h ${mins}m live`;
}

function LiveSessionRow({ session, tick, onJoin, onOpenRecording, onOpenNotes }) {
  void tick;

  const status = computeStatus(session);
  const canJoin = computeCanJoin(session);
  const start = new Date(session.start_time);
  // Hash by name (not id) so this matches the colour SubjectCard shows for
  // the same subject elsewhere — SubjectCard hashes subject.name too.
  const chipSlot = subjectChipSlot(session.subject_name || session.subject_id);
  const teacherName = session.teacher_name || session.teacher_full_name || session.teacher;

  let metaNode;
  if (status === "SCHEDULED") {
    metaNode = <span className="ac-when">starts {startsInText(start)}</span>;
  } else if (status === "LIVE") {
    metaNode = (
      <span className="ac-tag ac-tag--live">
        Live now · {getLiveDuration(session.start_time)}
      </span>
    );
  } else if (status === "COMPLETED") {
    metaNode = <span className="ac-when">ended</span>;
  } else {
    const cfg = STATUS_CONFIG[status];
    metaNode = <span className={`ac-tag ac-tag--${cfg.tone}`}>{cfg.label}</span>;
  }

  let disabled = false;
  let handleClick = () => onJoin(session);
  let btnText = "Join";
  let btnVariant = "primary";

  if (status === "CANCELLED") {
    btnText = "Cancelled";
    btnVariant = "outline";
    disabled = true;
    handleClick = undefined;
  } else if (status !== "COMPLETED") {
    disabled = !canJoin;
  }

  return (
    <div className="ac-row">
      <div className="ac-row__when">
        <div className="ac-row__time">{fmtClockTime(start)}</div>
        <div className="ac-row__day">{dayLabel(start)}</div>
      </div>
      <div className="ac-row__divider" />
      <div className="ac-row__body">
        <div className="ac-row__meta">
          <span className={`subj-chip subj-chip--${chipSlot}`}>
            {session.subject_name}
          </span>
          {metaNode}
        </div>
        <div className="ac-row__topic">{session.title}</div>
        <div className="ac-row__sub">{teacherName}</div>
      </div>
      {status === "COMPLETED" ? (
        <div className="ac-row__actions">
          <button
            type="button"
            className="ac-btn"
            onClick={() => onOpenRecording(session)}
          >
            Recording
          </button>
          <button
            type="button"
            className="ac-btn"
            onClick={() => onOpenNotes(session)}
          >
            Notes
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={btnVariant === "primary" ? "ac-btn ac-btn--primary" : "ac-btn"}
          disabled={disabled}
          onClick={handleClick}
        >
          {btnText}
        </button>
      )}
    </div>
  );
}

export default function LiveSessions() {
  const navigate = useNavigate();
  const { activeCourse } = useCourse();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState("upcoming");
  const [pastSearch, setPastSearch] = useState("");
  // Rail only. `null` means "not answered yet or the call failed", which the
  // card renders as an honest unknown rather than as "you have no recordings".
  const [recentRecordings, setRecentRecordings] = useState(null);
  const [pastSort, setPastSort] = useState("newest");
  const [notesSession, setNotesSession] = useState(null);
  const wsRef = useRef(null);
  const { notifications } = useNotificationSocket();

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const latest = notifications[0];
    if (latest?.data?.type === "live_session" && activeCourse) {
      api.get("/livestream/student/sessions/?course_id=" + activeCourse.id)
        .then(res => setSessions(res.data.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))))
        .catch(console.error);
    }
  }, [notifications, activeCourse]);

  useEffect(() => {
    if (!activeCourse) { setSessions([]); setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true); setError(null);
      try {
        // Sessions only — the design's Sessions screen carries no subject
        // filter, so the /subjects/ call this used to make had no consumer.
        const sRes = await api.get(
          "/livestream/student/sessions/?course_id=" + activeCourse.id
        );
        setSessions(sRes.data.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
      } catch { setError("Unable to load sessions."); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [activeCourse]);

  useEffect(() => {
    if (!activeCourse) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;
    const ws = new WebSocket(proto + "://" + wsHost + "/ws/course-sessions/" + activeCourse.id + "/");
    wsRef.current = ws;
    ws.onmessage = (e) => {
      let msg; try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type !== "session_list_update") return;
      setSessions((prev) => {
        const updated = msg.data;
        const exists = prev.find((s) => s.id === updated.id);
        if (!exists) return [...prev, updated].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        return prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s));
      });
    };
    ws.onerror = () => {};
    return () => { ws.close(); wsRef.current = null; };
  }, [activeCourse]);

  const statusPriority = {
    LIVE: 1,
    WAITING_FOR_TEACHER: 2,
    RECONNECTING: 2,
    PAUSED: 2,
    SCHEDULED: 3,
    COMPLETED: 4,
    CANCELLED: 5,
  };

  const upcomingRows = sessions
    .filter((s) => UPCOMING_STATUSES.has(computeStatus(s)))
    .sort((a, b) => {
      const diff = statusPriority[computeStatus(a)] - statusPriority[computeStatus(b)];
      if (diff !== 0) return diff;
      return new Date(a.start_time) - new Date(b.start_time);
    });

  const pastRows = sessions
    .filter((s) => !UPCOMING_STATUSES.has(computeStatus(s)))
    .filter((s) => {
      if (!pastSearch.trim()) return true;
      const term = pastSearch.trim().toLowerCase();
      const haystack = [s.title, s.subject_name, s.teacher_name || s.teacher_full_name || s.teacher]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    })
    .sort((a, b) => {
      const diff = new Date(b.start_time) - new Date(a.start_time);
      return pastSort === "newest" ? diff : -diff;
    });

  const rows = tab === "upcoming" ? upcomingRows : pastRows;
  // Unfiltered, for the tab badge — see the Past button above.
  const pastTotal = sessions.filter((s) => !UPCOMING_STATUSES.has(computeStatus(s))).length;

  // ── Day grouping ────────────────────────────────────────────────────────
  // Mirrors the teacher screen's A3c grouping, which the student list never
  // got. Grouping follows the ACTIVE SORT in first-appearance order, not a
  // date order: upcomingRows sorts by status first so a LIVE class floats to
  // the top, and re-sorting by day here would silently drop it below a
  // scheduled one. Headings are suppressed when there is only one group.
  // Rail only, and deliberately not folded into the sessions fetch: a rail
  // card is not worth failing the screen for. Needs the student-wide
  // recordings endpoint added alongside this — the per-subject one would mean
  // one request per subject just to fill a side card.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/courses/student/recordings/all/?limit=3");
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        if (!cancelled) setRecentRecordings(data);
      } catch (err) {
        console.error("Failed to load recordings for the rail:", err);
        if (!cancelled) setRecentRecordings(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dayGroups = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const headingFor = (dt) => {
      const d0 = new Date(dt);
      d0.setHours(0, 0, 0, 0);
      const diff = Math.round((d0 - startOfToday) / 86400000);
      if (diff === 0) return "Today";
      if (diff === 1) return "Tomorrow";
      if (diff === -1) return "Yesterday";
      if (diff > 1 && diff <= 7) return "Later this week";
      if (diff < -1 && diff >= -7) return "Earlier this week";
      return dt.toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      });
    };

    const order = [];
    const byHeading = new Map();
    for (const s of rows) {
      const dt = new Date(s.start_time);
      const key = Number.isNaN(dt.getTime()) ? "Scheduled" : headingFor(dt);
      if (!byHeading.has(key)) { byHeading.set(key, []); order.push(key); }
      byHeading.get(key).push(s);
    }
    return order.map((label) => ({ label, items: byHeading.get(label) }));
  }, [rows]);

  // ── Right rail ──────────────────────────────────────────────────────────
  // Spec: Academy Lists.dc.html, role=student screen=live — "Live now",
  // "This week", "Latest recordings".
  //
  // The design's second "This week" stat is "Attended so far — 2 of 2".
  // ATTENDANCE DOES NOT EXIST in this backend: no model, field, endpoint or
  // aggregate. LiveSessionAttendance is LiveKit room-presence telemetry for a
  // single call, with no roll-call, denominator or "attended" threshold. It
  // renders as an explicit unknown rather than an invented number.
  const railItems = useMemo(() => {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const inThisWeek = (s) => {
      const t = new Date(s.start_time).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    };

    // ── 1. Live now / Next class ──
    const next = upcomingRows[0];
    let callout = null;
    if (next) {
      const isLive = computeStatus(next) === "LIVE";
      const who = next.teacher_name || next.teacher_full_name || next.teacher || null;
      const startedAt = new Date(next.start_time);
      const parts = [];
      if (isLive) {
        // NOT startsInText() — that formats a FUTURE gap and returns the
        // literal "in progress" once the start time has passed, so stripping
        // its "in " prefix produced "started progress ago". An elapsed
        // duration needs its own formatter.
        const mins = Math.max(0, Math.round((Date.now() - startedAt.getTime()) / 60000));
        const ago = mins < 1 ? "just now"
          : mins < 60 ? `${mins} minute${mins === 1 ? "" : "s"} ago`
          : `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
        parts.push(who ? `${who} started ${ago}` : `This class started ${ago}`);
        parts.push("You can still join.");
      } else {
        if (who) parts.push(who);
        parts.push(`Starts ${startsInText(startedAt)}.`);
        // The button below is disabled until T−15m. A muted button with no
        // reason reads as broken, so say what the rule is — same honesty note
        // the teacher rail carries for its own (different) timing rule.
        if (!computeCanJoin(next)) {
          parts.push("You can join from 15 minutes before it starts.");
        }
      }
      callout = {
        kind: "callout",
        tone: isLive ? "teal" : "info",
        kicker: isLive ? "Live now" : "Next class",
        // "Physics: Refraction through a prism" in the design. Don't double
        // up when the title already names its subject — real titles often do
        // ("Chemistry — Chapter 1"), and "Chemistry: Chemistry — Chapter 1"
        // reads as a rendering bug. Same guard courseLabel() uses.
        title: (next.subject_name && !(next.title || "").includes(next.subject_name))
          ? `${next.subject_name}: ${next.title}`
          : next.title,
        text: parts.join(". ").replace(/\.\./g, "."),
        btn: {
          label: isLive ? "Join class" : "Open class",
          onClick: () => handleJoin(next),
          // computeCanJoin already encodes the learner rule the server
          // enforces, T−15m included. Unlike the TEACHER rail, this really
          // does gate on the clock: a student is refused entry before then,
          // so an always-on button would promise a state the server denies.
          disabled: !computeCanJoin(next),
        },
      };
    }

    // ── 2. This week ──
    const weekSessions = sessions.filter(
      (s) => inThisWeek(s) && computeStatus(s) !== "CANCELLED"
    );
    const upcomingThisWeek = upcomingRows.filter(inThisWeek);
    const thisWeek = {
      kind: "card",
      title: "This week",
      kv: [
        { k: "Classes scheduled", v: String(weekSessions.length) },
        {
          k: "Attended so far",
          unavailable: true,
          reason: "Attendance isn't tracked yet, so this can't be calculated.",
        },
        upcomingThisWeek.length
          ? { k: "Next class", v: fmtClockTime(new Date(upcomingThisWeek[0].start_time)) }
          : { k: "Next class", v: "—" },
      ],
    };

    // ── 3. Latest recordings ──
    const latest = {
      kind: "card",
      title: "Latest recordings",
      rows: (recentRecordings || []).map((r) => ({
        key: r.id,
        lead: (r.subject_name || "?").slice(0, 2),
        tone: "teal",
        title: r.title,
        sub: [
          r.session_date ? dayLabel(new Date(r.session_date)) + " " + new Date(r.session_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null,
          r.effective_duration_seconds
            ? `${Math.round(r.effective_duration_seconds / 60)} min`
            : null,
        ].filter(Boolean).join(" · "),
        action: {
          label: "Watch",
          onClick: () => navigate(`/recordings/${r.id}`),
        },
      })),
      empty: recentRecordings === null
        ? "Couldn't load your recordings."
        : "No recordings have been published yet.",
    };

    return [callout, thisWeek, latest];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, upcomingRows, recentRecordings, tick, navigate]);


  const handleJoin = (session) => {
    navigate(`/live/${session.id}`);
  };

  const handleOpenRecording = (session) => {
    navigate(`/subjects/recordings/${session.subject_id}`);
  };

  const handleOpenNotes = (session) => {
    setNotesSession(session);
  };

  if (loading) return <div className="ac-screen"><LoadingState label="Loading live sessions" /></div>;
  if (error)   return <div className="ac-screen"><ErrorState message={error} /></div>;

  return (
    <div className="ac-screen">
      <div className="ac-head">
        <div>
          <h1 className="ac-head__title">Live Sessions</h1>
          <p className="ac-head__sub">All scheduled live classes for your batch.</p>
        </div>
        <div className="ac-head__actions">
          {/* Upcoming/Past is the segmented pill toggle here — Private and
              Group Sessions use the underline tab bar instead. */}
          <div className="ac-seg">
            <button
              type="button"
              className={`ac-seg__btn${tab === "upcoming" ? " is-active" : ""}`}
              onClick={() => setTab("upcoming")}
            >
              Upcoming
              <span className="ac-seg__count">{upcomingRows.length}</span>
            </button>
            <button
              type="button"
              className={`ac-seg__btn${tab === "past" ? " is-active" : ""}`}
              onClick={() => setTab("past")}
            >
              Past
              {/* The PAST count is deliberately the UNFILTERED total: pastRows
                  has the search term applied, so using it would make the tab
                  label count down as the learner types. A tab count answers
                  "how much is in here", not "how much matches". */}
              <span className="ac-seg__count">{pastTotal}</span>
            </button>
          </div>
        </div>
      </div>

      {tab === "past" && (
        <div className="ac-searchRow">
          <input
            type="text"
            className="ac-searchInput"
            placeholder="Search past sessions…"
            value={pastSearch}
            onChange={(e) => setPastSearch(e.target.value)}
          />
          <select
            className="ac-select"
            value={pastSort}
            onChange={(e) => setPastSort(e.target.value)}
            aria-label="Sort past sessions"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      )}

      <div className="ac-railLayout">
      <section className="ac-listCard">
        {!activeCourse ? (
          <EmptyState
            plain
            icon="video"
            title="No course selected"
            message="Enrol in a course to see its live sessions."
            action={{ label: "Browse courses", to: "/browse-courses", icon: "search" }}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            plain
            icon="video"
            title={
              tab === "past"
                ? pastSearch.trim() ? "No sessions match your search" : "No past sessions yet"
                : "No live sessions scheduled"
            }
            message={
              tab === "past"
                ? "Completed and cancelled sessions will show up here."
                : "When your teacher schedules a class, it'll show up here with a join button."
            }
          />
        ) : (
          <div className="ac-list">
            {dayGroups.map((group) => (
              <Fragment key={group.label}>
                {/* One group means the heading says nothing the list doesn't
                    already — skip it rather than print a lone "Today". */}
                {dayGroups.length > 1 && (
                  <div className="ac-dayHead">
                    <span>{group.label}</span>
                    <span className="ac-dayCount">{group.items.length}</span>
                  </div>
                )}
                {group.items.map((s) => (
                  <LiveSessionRow
                    key={s.id}
                    session={s}
                    tick={tick}
                    onJoin={handleJoin}
                    onOpenRecording={handleOpenRecording}
                    onOpenNotes={handleOpenNotes}
                  />
                ))}
              </Fragment>
            ))}
          </div>
        )}
      </section>

      {/* Derived from the SAME `sessions` the list uses, so it stays correct
          without its own refetch. Suppressed on the Past tab: every card
          answers a question about what is coming up, which a historical view
          does not ask. */}
      {activeCourse && tab === "upcoming" && <AcademyRail items={railItems} />}
      </div>

      {notesSession && (
        <NotesViewModal
          sessionId={notesSession.id}
          onClose={() => setNotesSession(null)}
        />
      )}
    </div>
  );
}
