import React from "react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useCourse } from "../contexts/CourseContext";
import api from "../api/apiClient";
import PageHeader from "../components/PageHeader";
import "../styles/liveSessions.css";
import useNotificationSocket from "../hooks/useNotificationSocket";

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

const STATUS_CONFIG = {
  LIVE: {
    label: "LIVE",
    color: "#fff",
    bg: "#ef4444",
  },

  PAUSED: {
    label: "PAUSED",
    color: "#fff",
    bg: "#f59e0b",
  },

  RECONNECTING: {
    label: "RECONNECTING",
    color: "#fff",
    bg: "#f59e0b",
  },

  SCHEDULED: {
    label: "UPCOMING",
    color: "#fff",
    bg: "#10b981",
  },

  WAITING_FOR_TEACHER: {
    label: "STARTING",
    color: "#fff",
    bg: "#3b82f6",
  },

  COMPLETED: {
    label: "COMPLETED",
    color: "#fff",
    bg: "#9ca3af",
  },

  CANCELLED: {
    label: "CANCELLED",
    color: "#fff",
    bg: "#6b7280",
  },
};

function LiveCard({ session, onClick, tick }) {
  void tick;

  const status = computeStatus(session);
  const canJoin = computeCanJoin(session);

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.SCHEDULED;

  const start = new Date(session.start_time);
  const end = new Date(session.end_time);

  const timeStr = start.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const endStr = end.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const isClickable =
    status === "LIVE" ||
    status === "WAITING_FOR_TEACHER" ||
    status === "RECONNECTING" ||
    status === "PAUSED";

  return (
    <div
      className={`liveCardNew ${status.toLowerCase()} ${
        !isClickable ? "liveCardNew--disabled" : ""
      }`}
      onClick={() => {
        if (isClickable) {
          onClick(session);
        }
      }}
      role="button"
      tabIndex={isClickable ? 0 : -1}
      onKeyDown={(e) => {
        if (e.key === "Enter" && isClickable) {
          onClick(session);
        }
      }}
    >
      <div className="liveCardNew__banner">
        <img
          src={
            session.thumbnail ||
            "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600"
          }
          alt={session.title}
          className="liveCardNew__cover"
        />

        <div className="liveCardNew__teacherAvatar">
          <img
            src={
              session.teacher_image ||
              session.teacher_avatar ||
              "https://i.pravatar.cc/100?img=5"
            }
            alt="Teacher"
          />
        </div>

        <span
          className="liveCardNew__badge"
          style={{
            background: cfg.bg,
            color: cfg.color,
          }}
        >
          {cfg.label}
        </span>
      </div>

      <div className="liveCardNew__content">
        <h3>{session.subject_name || session.title}</h3>

        <p>
          {session.teacher_name ||
            session.teacher_full_name ||
            session.teacher ||
            "Teacher"}
        </p>

        <div className="liveCardNew__time">
          {timeStr} - {endStr}
        </div>
      </div>
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

  const filtered = selectedSubject
  ? sessions.filter(
      (s) => String(s.subject_id) === String(selectedSubject)
    )
  : sessions;

  if (loading) return <div className="liveSessionsPage"><div style={{padding:20,color:"#6b7280"}}>Loading sessions...</div></div>;
  if (error)   return <div className="liveSessionsPage"><div style={{padding:20,color:"red"}}>{error}</div></div>;

  return (
    <div className="liveSessionsPage">
      <div className="liveSessionsHeaderBox">
        <PageHeader title={activeCourse ? "Live Sessions" : "Live Sessions"} />
        <select className="liveSubjectFilter" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
        </select>
      </div>
      <div className="liveSessionsBodyBox">
        {!activeCourse ? (
          <p style={{color:"#9ca3af",textAlign:"center",padding:"40px 0"}}>Please select a course.</p>
        ) : filtered.length === 0 ? (
          <p style={{color:"#9ca3af",textAlign:"center",padding:"40px 0"}}>No live sessions available.</p>
        ) : (
          <div className="liveGrid">
            {filtered.map((s) => (
              <LiveCard key={s.id} session={s} tick={tick} onClick={(session) => navigate("/live/" + session.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
