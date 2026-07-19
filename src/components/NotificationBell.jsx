// ============================================================
// STUDENT-DASHBOARD — src/components/NotificationBell.jsx
//
// NOTE: this file and the teacher dashboard's NotificationBell.jsx
// share the same render markup but have INTENTIONALLY DIVERGENT
// click handlers, because the student app routes live at root
// (e.g. /group-sessions) while the teacher app is mounted under
// /teacher (e.g. /teacher/group-sessions). If you change handler
// behaviour here, mirror the equivalent change in
// shiksha-teacher-dashboard/src/components/NotificationBell.jsx.
// ============================================================

import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoNotificationsOutline, IoNotificationsSharp } from "react-icons/io5";
import useNotificationSocket from "../hooks/useNotificationSocket";
import { LoadingState } from "./StateViews";

const TYPE_ICONS = {
  ASSIGNMENT:      "📝",
  QUIZ:            "📊",
  SESSION:         "🎥",
  SUBMISSION:      "📬",
  PRIVATE_SESSION: "🔒",
};

const TYPE_COLORS = {
  ASSIGNMENT:      "#f59e0b",
  QUIZ:            "#8b5cf6",
  SESSION:         "#ef4444",
  SUBMISSION:      "#2563eb",
  PRIVATE_SESSION: "#015865",
};

function timeAgo(isoString) {
  if (!isoString) return "";
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    loading,
    markAllRead,
    markOneRead,
    clearNotifications,
  } = useNotificationSocket();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open && unreadCount > 0) markAllRead();
  };

  const handleNotifClick = (notif) => {
    const { type, subject_id, id, is_private_session, is_group_session, is_skill_session, link_url } = notif;
    if (id) markOneRead(id);

    // Notifications from the notifications app (counseling.*, forum.*, and
    // future verbs) carry a link_url — trust it for in-app routing before
    // falling through to the older per-type logic below.
    if (link_url && link_url.startsWith("/")) {
      navigate(link_url);
      setOpen(false);
      return;
    }

    // Private session notifications always go to /private-sessions
    // regardless of which side (student or teacher) — the page handles both.
    if (is_private_session || type === "PRIVATE_SESSION") {
      navigate("/private-sessions");
      setOpen(false);
      return;
    }

    // Group session notifications (sent with type === "SESSION" + the
    // is_group_session flag from group_session_views._notify_user) must route to
    // the Group Sessions page, not /live-sessions.
    if (is_group_session) {
      navigate("/group-sessions");
      setOpen(false);
      return;
    }

    // Skill-Dev (1-on-1 expert) session notifications — confirm/decline/
    // cancel/complete/reschedule all carry this flag.
    if (is_skill_session) {
      navigate(id ? `/skill-dev/sessions/${id}` : "/skill-dev/sessions");
      setOpen(false);
      return;
    }

    // Per-type routing. Always navigate somewhere — falling through to a
    // silent setOpen(false) was the source of the "click does nothing"
    // bug equivalent to the teacher's blank-page bug. Mirror the teacher
    // bell's "every click leads to a real page" guarantee.
    if (subject_id) {
      if (type === "ASSIGNMENT")      navigate(`/subjects/${subject_id}/assignments`);
      else if (type === "QUIZ")       navigate(`/subjects/quiz/${subject_id}`);
      else if (type === "SUBMISSION") navigate(`/subjects/${subject_id}/assignments`);
      else if (type === "SESSION")    navigate(`/live-sessions`);
      else                            navigate(`/subjects/${subject_id}`);
    } else {
      // No subject_id — best-effort defaults so the click is never a no-op.
      const fallback = {
        ASSIGNMENT: "/assignments",
        QUIZ:       "/subjects/quiz",
        SUBMISSION: "/assignments",
        SESSION:    "/live-sessions",
      };
      navigate(fallback[type] || "/");
    }
    setOpen(false);
  };

  // Derive display type — backend sends SESSION with is_private_session flag
  const getDisplayType = (notif) =>
    notif.is_private_session ? "PRIVATE_SESSION" : notif.type;

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell-btn" onClick={handleOpen}>
        {unreadCount > 0 ? (
          <IoNotificationsSharp size={22} color="#f59e0b" />
        ) : (
          <IoNotificationsOutline size={22} />
        )}
        {unreadCount > 0 && (
          <span className="notif-bell-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-bell-dropdown">
          <div className="notif-bell-header">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button className="notif-clear-btn" onClick={clearNotifications}>
                Clear
              </button>
            )}
          </div>

          <div className="notif-bell-list">
            {loading ? (
              <LoadingState plain label="Loading" />
            ) : notifications.length === 0 ? (
              <div className="notif-bell-empty">No notifications</div>
            ) : (
              notifications.map((notif, i) => {
                const displayType = getDisplayType(notif);
                return (
                  <div
                    key={notif.id || i}
                    className={`notif-bell-item ${!notif.is_read ? "notif-bell-item--unread" : ""}`}
                    onClick={() => handleNotifClick(notif)}
                    style={{
                      borderLeft: `3px solid ${TYPE_COLORS[displayType] || "#6b7280"}`,
                      cursor: "pointer",
                    }}
                  >
                    <span className="notif-bell-icon" style={{ fontSize: 16 }}>
                      {TYPE_ICONS[displayType] || "🔔"}
                    </span>
                    <div className="notif-bell-content">
                      <p className="notif-bell-title">{notif.title}</p>
                      {notif.subject_name && (
                        <p className="notif-bell-subject">{notif.subject_name}</p>
                      )}
                      <p className="notif-bell-time">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <span className="notif-bell-dot" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <button
            className="notif-bell-seeall"
            onClick={() => { setOpen(false); navigate("/chat?view=notifications"); }}
          >
            See all in Communication Center
          </button>
        </div>
      )}
    </div>
  );
}
