import React from "react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useCourse } from "../contexts/CourseContext";
import api from "../api/apiClient";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import "../styles/liveSessions.css";
import useNotificationSocket from "../hooks/useNotificationSocket";
import { subjectChipPalette } from "../utils/subjectChips";
import { fmtClockTime, dayLabel, startsInText } from "../utils/sessionTime";

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

const STATUS_CONFIG = {
  LIVE: {
    label: "Live now",
    color: "#fff",
    bg: "#ef4444",
  },

  PAUSED: {
    label: "Paused",
    color: "#fff",
    bg: "#f59e0b",
  },

  RECONNECTING: {
    label: "Reconnecting",
    color: "#fff",
    bg: "#f59e0b",
  },

  SCHEDULED: {
    label: "Upcoming",
    color: "#fff",
    bg: "#10b981",
  },

  WAITING_FOR_TEACHER: {
    label: "Starting soon",
    color: "#fff",
    bg: "#3b82f6",
  },

  COMPLETED: {
    label: "Completed",
    color: "#fff",
    bg: "#9ca3af",
  },

  CANCELLED: {
    label: "Cancelled",
    color: "#fff",
    bg: "#6b7280",
  },
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

function LiveSessionRow({ session, tick, onJoin, onOpenRecording }) {
  void tick;

  const status = computeStatus(session);
  const canJoin = computeCanJoin(session);
  const start = new Date(session.start_time);
  // Hash by name (not id) so this matches the colour SubjectCard shows for
  // the same subject elsewhere — SubjectCard hashes subject.name too.
  const chip = subjectChipPalette(session.subject_name || session.subject_id);
  const teacherName = session.teacher_name || session.teacher_full_name || session.teacher;

  let metaNode;
  if (status === "SCHEDULED") {
    metaNode = <span className="liveSessionRow__meta-text">starts {startsInText(start)}</span>;
  } else if (status === "LIVE") {
    metaNode = (
      <span className="liveSessionRow__meta-text liveSessionRow__meta-text--live">
        🔴 {getLiveDuration(session.start_time)}
      </span>
    );
  } else if (status === "COMPLETED") {
    metaNode = <span className="liveSessionRow__meta-text">ended</span>;
  } else {
    const cfg = STATUS_CONFIG[status];
    metaNode = (
      <span
        className="liveSessionRow__statusPill"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        {cfg.label}
      </span>
    );
  }

  let btnText = "Join";
  let btnVariant = "primary";
  let disabled = false;
  let handleClick = () => onJoin(session);

  if (status === "COMPLETED") {
    btnText = "Recording";
    btnVariant = "outline";
    handleClick = () => onOpenRecording(session);
  } else if (status === "CANCELLED") {
    btnText = "Cancelled";
    btnVariant = "outline";
    disabled = true;
    handleClick = undefined;
  } else {
    disabled = !canJoin;
  }

  return (
    <div className="liveSessionRow">
      <div className="liveSessionRow__time">
        <strong>{fmtClockTime(start)}</strong>
        <span className="liveSessionRow__day">{dayLabel(start)}</span>
      </div>
      <div className="liveSessionRow__divider" />
      <div className="liveSessionRow__body">
        <div className="liveSessionRow__metaRow">
          <span
            className="liveSessionRow__chip"
            style={{ background: chip.bg, color: chip.ink }}
          >
            {session.subject_name}
          </span>
          {metaNode}
        </div>
        <div className="liveSessionRow__topic">{session.title}</div>
        <div className="liveSessionRow__teacher">{teacherName}</div>
      </div>
      <button
        type="button"
        className={`liveSessionRow__btn liveSessionRow__btn--${btnVariant}`}
        disabled={disabled}
        onClick={handleClick}
      >
        {btnText}
      </button>
    </div>
  );
}

export default function LiveSessions() {
  const navigate = useNavigate();
  const { activeCourse } = useCourse();
  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState("upcoming");
  const [pastSearch, setPastSearch] = useState("");
  const [pastSort, setPastSort] = useState("newest");
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
    if (!activeCourse) { setSessions([]); setSubjects([]); setLoading(false); return; }
    const fetchData = async () => {
      setLoading(true); setError(null);
      try {
        const [sRes, subRes] = await Promise.all([
          api.get("/livestream/student/sessions/?course_id=" + activeCourse.id),
          api.get("/courses/" + activeCourse.id + "/subjects/"),
        ]);
        setSessions(sRes.data.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
        setSubjects(subRes.data);
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

  const bySubject = selectedSubject
    ? sessions.filter((s) => String(s.subject_id) === String(selectedSubject))
    : sessions;

  const upcomingRows = bySubject
    .filter((s) => UPCOMING_STATUSES.has(computeStatus(s)))
    .sort((a, b) => {
      const diff = statusPriority[computeStatus(a)] - statusPriority[computeStatus(b)];
      if (diff !== 0) return diff;
      return new Date(a.start_time) - new Date(b.start_time);
    });

  const pastRows = bySubject
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

  const handleJoin = (session) => {
    navigate(`/live/${session.id}`);
  };

  const handleOpenRecording = (session) => {
    navigate(`/subjects/recordings/${session.subject_id}`);
  };

  if (loading) return <div className="liveSessionsPage"><LoadingState label="Loading live sessions" /></div>;
  if (error)   return <div className="liveSessionsPage"><ErrorState message={error} /></div>;

  return (
    <div className="liveSessionsPage">
      <div className="liveSessionsPage__head">
        <div>
          <h1 className="liveSessionsPage__title">Live Sessions</h1>
          <p className="liveSessionsPage__sub">All scheduled live classes for your batch.</p>
        </div>
        <div className="liveSessionsPage__controls">
          {subjects.length > 0 && (
            <select
              className="liveSessionsPage__subjectFilter"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
            </select>
          )}
          <div className="liveSessionsTabs">
            <button
              type="button"
              className={`liveSessionsTabs__btn${tab === "upcoming" ? " is-active" : ""}`}
              onClick={() => setTab("upcoming")}
            >
              Upcoming
            </button>
            <button
              type="button"
              className={`liveSessionsTabs__btn${tab === "past" ? " is-active" : ""}`}
              onClick={() => setTab("past")}
            >
              Past
            </button>
          </div>
        </div>
      </div>

      {tab === "past" && (
        <div className="liveSessionsSearchBar">
          <input
            type="text"
            className="liveSessionsSearchBar__input"
            placeholder="Search past sessions…"
            value={pastSearch}
            onChange={(e) => setPastSearch(e.target.value)}
          />
          <select
            className="liveSessionsSearchBar__sort"
            value={pastSort}
            onChange={(e) => setPastSort(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      )}

      <section className="liveSessionsListCard">
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
                : selectedSubject ? "No live sessions for this subject" : "No live sessions scheduled"
            }
            message={
              tab === "past"
                ? "Completed and cancelled sessions will show up here."
                : "When your teacher schedules a class, it'll show up here with a join button."
            }
          />
        ) : (
          <div className="liveSessionsList">
            {rows.map((s) => (
              <LiveSessionRow
                key={s.id}
                session={s}
                tick={tick}
                onJoin={handleJoin}
                onOpenRecording={handleOpenRecording}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
