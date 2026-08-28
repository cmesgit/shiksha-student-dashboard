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
import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckSquare,
  FiFileText,
  FiInbox,
  FiLock,
  FiVideo,
} from "react-icons/fi";
import useNotificationSocket from "../hooks/useNotificationSocket";
import { useCourse } from "../contexts/CourseContext";
import useNotificationNavigator from "../shared/useNotificationNavigator";
import { LoadingState } from "./StateViews";

// Where the "N new in <other track>" peek sends you. Deliberately a track
// LANDING route, not a deep link: the peek knows only a count, not which
// notification, so it opens that track's home and lets the now-rescoped
// bell show the rows.
// Both tracks' home is "/" — the dashboard renders Academy or Skill Dev
// depending on activeTrack (see SD_NAV's own Dashboard entry, which also
// points at "/"). "/skill-dev" was NOT a route: the app defines
// /skill-dev/sessions, /explore, /courses, /reviews… but nothing at the bare
// prefix, and neither dashboard app has a catch-all — so the peek rendered a
// completely blank page.
const TRACK_HOME = {
  academy: "/",
  skill: "/",
};

const TRACK_LABEL = {
  academy: "Academy",
  skill: "Skill Dev",
};

const TYPE_ICONS = {
  ASSIGNMENT:      FiFileText,
  QUIZ:            FiCheckSquare,
  SESSION:         FiVideo,
  SUBMISSION:      FiInbox,
  PRIVATE_SESSION: FiLock,
  MATERIAL:        FiBookOpen,
};

/* Left-border + icon tint per notification type. */
const FALLBACK_COLOR = "#6b7280";
const TYPE_COLORS = {
  ASSIGNMENT:      "#f59e0b",
  QUIZ:            "#8b5cf6",
  SESSION:         "#ef4444",
  SUBMISSION:      "#2563eb",
  PRIVATE_SESSION: "#015865",
  MATERIAL:        "#0d9488",
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

  const { activeTrack, setTrack } = useCourse();
  const otherTrack = activeTrack === "skill" ? "academy" : "skill";

  const {
    notifications,
    unreadCount,
    crossTrackUnread,
    loading,
    markAllRead,
    markOneRead,
    clearNotifications,
  } = useNotificationSocket({ track: activeTrack });

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

  // Routing (and the track persistence that makes a cross-track jump
  // stick) lives in useNotificationNavigator, shared with the Comm Center
  // list so the two surfaces can't drift apart again.
  const { goTracked: navTracked, openLink } = useNotificationNavigator();
  const goTracked = (path) => { navTracked(path); setOpen(false); };

  const handleNotifClick = (notif) => {
    const { type, subject_id, id, object_id, is_private_session, is_group_session, is_skill_session, link_url } = notif;
    if (id) markOneRead(id);

    // Notifications from the notifications app (counseling.*, forum.*, and
    // future verbs) carry a link_url — trust it for in-app routing before
    // falling through to the older per-type logic below. Chat links are a
    // bare conversation path (/chat/<id>) that doesn't match any route —
    // ChatPanel opens a conversation via router state, not a URL param.
    if (link_url && link_url.startsWith("/")) {
      if (openLink(link_url)) { setOpen(false); return; }
    }

    // Live session (scheduled or "now LIVE") notifications carry the real
    // LiveSession id as object_id (activity/signals.py's session_created,
    // or livestream/views.py's go-live push) — route straight into it
    // instead of the bare list.
    if (type === "SESSION" && !is_group_session && !is_private_session && !is_skill_session && object_id) {
      goTracked(`/live/${object_id}`);
      return;
    }

    // Private session notifications always go to /private-sessions
    // regardless of which side (student or teacher) — the page handles both.
    if (is_private_session || type === "PRIVATE_SESSION") {
      goTracked("/private-sessions");
      return;
    }

    // Group session notifications (sent with type === "SESSION" + the
    // is_group_session flag from group_session_views._notify_user) must route to
    // the Group Sessions page, not /live-sessions.
    if (is_group_session) {
      goTracked("/group-sessions");
      return;
    }

    // Skill-Dev (1-on-1 expert) session notifications — confirm/decline/
    // cancel/complete/reschedule all carry this flag. subject_id is the
    // SkillSession id (see skills/notifications.push_skill_bell); `id` here
    // is the Activity row id and does NOT match /skill-dev/sessions/:id.
    if (is_skill_session) {
      goTracked(subject_id ? `/skill-dev/sessions/${subject_id}` : "/skill-dev/sessions");
      return;
    }

    // Per-type routing. Always navigate somewhere — falling through to a
    // silent setOpen(false) was the source of the "click does nothing"
    // bug equivalent to the teacher's blank-page bug. Mirror the teacher
    // bell's "every click leads to a real page" guarantee.
    if (subject_id) {
      if (type === "ASSIGNMENT")      goTracked(`/subjects/${subject_id}/assignments`);
      else if (type === "QUIZ")       goTracked(`/subjects/quiz/${subject_id}`);
      else if (type === "SUBMISSION") goTracked(`/subjects/${subject_id}/assignments`);
      else if (type === "SESSION")    goTracked(`/live-sessions`);
      // Fallback only. Activity rows now carry link_url, so a MATERIAL row
      // normally routes via openLink above with the ?course= the server
      // computed — which is what lets the Study Material screen switch course
      // before filtering. This branch still matters for rows written BEFORE
      // that column existed, which have a blank link and would otherwise be
      // unclickable. Such a row can still land on the wrong course's list;
      // StudyMaterialList detects a subject that isn't in the active course
      // and says so, rather than the old "No material for this subject".
      else if (type === "MATERIAL")   goTracked(`/study-material/list/${subject_id}`);
      else                            goTracked(`/subjects/${subject_id}`);
      return;
    } else {
      // No subject_id — best-effort defaults so the click is never a no-op.
      const fallback = {
        ASSIGNMENT: "/assignments",
        QUIZ:       "/subjects/quiz",
        SUBMISSION: "/assignments",
        SESSION:    "/live-sessions",
        MATERIAL:   "/study-material",
      };
      goTracked(fallback[type] || "/");
    }
  };

  // Derive display type — backend sends SESSION with is_private_session flag
  const getDisplayType = (notif) =>
    notif.is_private_session ? "PRIVATE_SESSION" : notif.type;

  // Skill-Dev bookings (confirmed/declined/reschedule/completed) are calendar
  // events, not a live video call — reserve 🎥 for actual join-now live/group
  // sessions so the icon matches the event.
  const IconFor = (notif) =>
    notif.is_skill_session ? FiCalendar : (TYPE_ICONS[getDisplayType(notif)] || FiBell);

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell-btn" onClick={handleOpen} data-tour="header.notifications">
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
        {/* The badge above is TRACK-SCOPED, so an unread notification in the
            other track produced no signal at all on the closed bell — the
            "N new in <track>" peek inside the dropdown was undiscoverable
            unless you already thought to open it. This dot says "there is
            something in the other track" without faking an in-track count. */}
        {crossTrackUnread > 0 && (
          <span className="notif-bell-crossdot" title={`${crossTrackUnread} new in ${TRACK_LABEL[otherTrack]}`} />
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
                const Icon = IconFor(notif);
                return (
                  <div
                    key={notif.id || i}
                    className={`notif-bell-item ${!notif.is_read ? "notif-bell-item--unread" : ""}`}
                    onClick={() => handleNotifClick(notif)}
                    style={{
                      borderLeft: `3px solid ${TYPE_COLORS[displayType] || FALLBACK_COLOR}`,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      className="notif-bell-icon"
                      style={{ color: TYPE_COLORS[displayType] || FALLBACK_COLOR }}
                    >
                      <Icon aria-hidden="true" />
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

          {/* Cross-track peek. The bell is scoped to the active track, so
              without this a learner sitting in Academy would never learn
              their Skill Dev session was confirmed. Rendered only when the
              other track actually has unread rows — an always-present row
              would be noise. */}
          {crossTrackUnread > 0 && (
            <button
              className="notif-bell-crosstrack"
              // setTrack EXPLICITLY, don't rely on goTracked: that derives the
              // destination track from the path, and "/" is track-neutral, so
              // it would navigate home while leaving the user in the track
              // they were already in — the opposite of what this button says.
              onClick={() => {
                setTrack(otherTrack);
                navigate(TRACK_HOME[otherTrack]);
                setOpen(false);
              }}
            >
              <span className="notif-bell-crosstrack__icon">↪</span>
              {crossTrackUnread} new in {TRACK_LABEL[otherTrack]}
            </button>
          )}

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
