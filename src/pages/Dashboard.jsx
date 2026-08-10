// ============================================================
// STUDENT — src/pages/Dashboard.jsx  (FULL REPLACEMENT)
// ============================================================
//
// WHAT CHANGED vs the previous version
// ────────────────────────────────────
// 1. PROFILE-TRUE DATA. The backend /dashboard/ is now scoped to the
//    JWT's active learner profile and finally honors ?course_id= —
//    this page sends it as before, aborts in-flight requests on
//    course switch (no more stale-course race overwriting the fresh
//    one), and handles the new responses:
//       409 profile_required → route to the profile picker
//       error                → retry card instead of a silent shell
// 2. ONE NOTIFICATION SOURCE. data.notifications + the WS list used
//    to be merged with JSON.stringify keys → duplicates + ghosts that
//    404ed on mark-read. The singleton useNotificationSocket store
//    (server-isolated per profile) is the only source now.
// 3. CANONICAL TYPES end-to-end: the notification filter and the
//    schedule filter compare against the UPPERCASE vocabulary the
//    normalized hook emits — both filters match real data for the
//    first time, and "Private Session" (always in the calendar
//    legend) is finally selectable in the schedule filter.
// 4. HONEST "UPCOMING". The old fallback silently substituted ALL
//    future sessions when this week had none, under a header that
//    says "(Remaining classes)". Sessions now mean what the header
//    says; an empty week shows the designed empty state.
// 5. LIVE REVALIDATION. An ASSIGNMENT/QUIZ/SESSION push while the
//    page is open triggers a debounced silent refetch.
// 6. Dead code removed: the mobile "schedule" tab case was
//    unreachable (TopSliderTabs never offers it; the Calendar tab
//    already stacks the schedule beneath the grid).
//
// Layout, class names and child components are unchanged — this is a
// rewiring, not a redesign.

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SessionCard from "../components/SessionCard";
import AssignmentCard from "../components/AssignmentCard";
import QuizCard from "../components/QuizCard";
import NotificationCard from "../components/NotificationCard";
import DropdownMenu from "../components/DropdownMenu";
import TopSliderTabs from "../components/TopSliderTabs";
import NavIcon from "../components/NavIcon";
import SkillDevStudentSection from "../components/SkillDevStudentSection";
import AcademyEmptyState from "../components/AcademyEmptyState";
import { LoadingState } from "../components/StateViews";
import api from "../api/apiClient";
import { useCourse } from "../contexts/CourseContext";
import { useAuth } from "../contexts/AuthContext";
import useNotificationSocket from "../hooks/useNotificationSocket";
import { PICK_PROFILE_URL } from "../config/urls";
import { subjectChipPalette } from "../utils/subjectChips";
import { fmtClockTime, dayLabel, startsInText } from "../utils/sessionTime";
import "../styles/dashboard.css";

const DATE_FORMAT = { day: "2-digit", month: "short", year: "numeric" };

// Quizzes have no due date (product decision — a quiz stays attemptable
// indefinitely once published), so they're not date-scheduled events: no
// calendar dots, no schedule-rail entries. They still get their own
// Assignments/Quizzes toggle in the right rail, unfiltered by date.
const EVENT_COLORS = {
  assignment: "#57D982",
  "live-session": "#38bdf8",
  "private-session": "#FF8A65",
};

const SCHEDULE_TYPE_LABELS = {
  "live-session": "Live Session",
  assignment: "Assignment",
  "private-session": "Private Session",
};

// Filter option lists — canonical values, one source of truth.
const NOTIF_OPTIONS = [
  { value: "All", label: "All" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "SESSION", label: "Live Session" },
  { value: "QUIZ", label: "Quiz" },
];

const SCHEDULE_OPTIONS = [
  { value: "All", label: "All" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "SESSION", label: "Live Session" },
  { value: "PRIVATE_SESSION", label: "Private Session" },
];

const SCHEDULE_FILTER_MAP = {
  ASSIGNMENT: "assignment",
  SESSION: "live-session",
  PRIVATE_SESSION: "private-session",
};

// WS types that mean "your academy slices changed".
const REFRESH_TYPES = new Set(["ASSIGNMENT", "QUIZ", "SESSION"]);

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", DATE_FORMAT);
}

function toDateKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// `live` is the backend's authoritative signal (LiveSession.status, or the
// scheduled window as a fallback — see DashboardSessionSerializer.get_live)
// — the SAME field LiveSessions.jsx's rows trust. Deriving "is this live"
// from clock math here too would let this chip disagree with the rest of
// the app for a session that's overdue but never actually started.
function heroStatus(session) {
  if (session.live) return { chip: "LIVE NOW", relative: "In progress" };
  const start = new Date(session.dateTime);
  if (Number.isNaN(start.getTime())) return { chip: "NEXT CLASS", relative: "" };
  const diffMins = Math.round((start - new Date()) / 60000);
  if (diffMins <= 0) return { chip: "NEXT CLASS", relative: "Starting soon" };
  if (diffMins < 60) return { chip: "NEXT CLASS", relative: `Starts in ${diffMins}m` };
  const hours = Math.floor(diffMins / 60);
  return { chip: "NEXT CLASS", relative: hours < 24 ? `Starts in ${hours}h` : `Starts in ${Math.floor(hours / 24)}d` };
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function Dashboard() {
  const { activeCourse, activeTrack, subjects } = useCourse();
  const { user, activeProfile } = useAuth();
  const navigate = useNavigate();

  // Page heading (design dc.html lines 2123–2124): a time-derived greeting
  // plus a line naming the course and its subjects.
  const greetName =
    activeProfile?.display_name || user?.name || user?.full_name || user?.username ||
    (user?.email ? user.email.split("@")[0] : "") || "";
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const courseLabel = useMemo(() => {
    if (!activeCourse?.title) return "";
    const names = (subjects || []).map((s) => s.name || s.title).filter(Boolean);
    // "Class 10 · Science & Maths" — list subjects only when it stays readable.
    if (names.length && names.length <= 3) {
      const list =
        names.length === 1
          ? names[0]
          : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
      return `${activeCourse.title} · ${list}`;
    }
    return activeCourse.title;
  }, [activeCourse, subjects]);

  const [selectedDate, setSelectedDate] = useState(null);
  const [assignmentFilter, setAssignmentFilter] = useState("due");
  const [notificationFilter, setNotificationFilter] = useState("All");
  const [scheduleFilter, setScheduleFilter] = useState("All");
  const [activeMobileTab, setActiveMobileTab] = useState("sessions");
  // Desktop right-rail tab: which list the merged Assignments/Quizzes card shows.
  const [rightRailTab, setRightRailTab] = useState("assignments");

  const today = new Date();
  const [currMonth, setCurrMonth] = useState(today.getMonth());
  const [currYear, setCurrYear] = useState(today.getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const years = Array.from({ length: 81 }, (_, i) => 1970 + i);

  const daysInMonth = new Date(currYear, currMonth + 1, 0).getDate();
  const firstDayIdx = new Date(currYear, currMonth, 1).getDay();
  const startOffset = firstDayIdx === 0 ? 6 : firstDayIdx - 1;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { notifications, markOneRead, onEvent } = useNotificationSocket();

  // ── fetch (abortable, race-safe across course switches) ──────────
  const abortRef = useRef(null);
  const fetchDashboard = useCallback(async ({ silent = false } = {}) => {
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
        window.location.href = PICK_PROFILE_URL;   // token lost its profile
        return;
      }
      if (!silent) setError("Couldn't load your dashboard.");
      console.error("Failed to load dashboard", err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [activeCourse]);

  useEffect(() => {
    fetchDashboard();
    return () => abortRef.current?.abort();
  }, [fetchDashboard]);

  // Debounced silent refetch when a relevant push lands.
  useEffect(() => {
    let t = null;
    const off = onEvent((n) => {
      if (!REFRESH_TYPES.has(n?.type)) return;
      clearTimeout(t);
      t = setTimeout(() => fetchDashboard({ silent: true }), 1500);
    });
    return () => { off(); clearTimeout(t); };
  }, [onEvent, fetchDashboard]);

  // Honest slices — no all_sessions masquerading as "this week".
  const sessions = data?.sessions ?? [];
  const allSessions = data?.all_sessions ?? [];
  const assignments = data?.assignments ?? [];
  const quizzes = data?.quizzes ?? [];
  const privateSessions = data?.private_sessions ?? [];

  // Hero "next class" — the soonest upcoming/live session this week.
  // `sessions` is only filtered server-side to "not before today", so it can
  // still contain an already-finished same-day class — exclude anything
  // that's neither live nor still ahead of its end_time before picking the
  // earliest, or a finished morning class would win the sort and get shown
  // as the hero with a dead join link.
  const heroSession = useMemo(() => {
    const now = new Date();
    const candidates = sessions.filter(
      (s) => s.live || !s.end_time || new Date(s.end_time) > now
    );
    if (!candidates.length) return null;
    return [...candidates].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))[0];
  }, [sessions]);

  const goToPrevMonth = () => {
    if (currMonth === 0) { setCurrMonth(11); setCurrYear((y) => y - 1); }
    else setCurrMonth((m) => m - 1);
  };

  const goToNextMonth = () => {
    if (currMonth === 11) { setCurrMonth(0); setCurrYear((y) => y + 1); }
    else setCurrMonth((m) => m + 1);
  };

  const renderSessionCard = (s, idx) => {
    const sessionTime = new Date(s.dateTime);
    const validTime = !Number.isNaN(sessionTime.getTime());
    const { bg: chipBg, ink: chipColor } = subjectChipPalette(s.subject);

    return (
      <SessionCard
        key={s.id || idx}
        id={s.id}
        subject={s.subject}
        topic={s.topic}
        teacher={s.teacher}
        time={validTime ? fmtClockTime(sessionTime) : ""}
        dayLabel={validTime ? dayLabel(sessionTime) : ""}
        startsInText={validTime ? startsInText(sessionTime) : ""}
        isLive={!!s.live}
        chipBg={chipBg}
        chipColor={chipColor}
      />
    );
  };

  const calendarEvents = useMemo(() => {
    const map = {};
    const add = (dateStr, type) => {
      const key = toDateKey(dateStr);
      if (!key) return;
      if (!map[key]) map[key] = [];
      if (!map[key].includes(type)) map[key].push(type);
    };
    assignments.forEach((a) => add(a.due, "assignment"));
    privateSessions.forEach((p) => add(p.date, "private-session"));
    allSessions.forEach((s) => add(s.dateTime, "live-session"));
    return map;
  }, [assignments, privateSessions, allSessions]);

  const scheduleItems = useMemo(() => {
    const items = [];

    allSessions.forEach((s) =>
      items.push({
        id: `session-${s.id}`,
        type: "live-session",
        title: `${s.subject} - ${s.topic}`,
        date: s.dateTime,
        teacher: s.teacher,
        subject: s.subject,
        link: `/live/${s.id}`,
      })
    );

    assignments.forEach((a) =>
      items.push({
        id: `assignment-${a.id}`,
        type: "assignment",
        title: a.title,
        date: a.due,
        teacher: a.teacher,
        subject: a.subject_name || "",
        link: a.subject_id ? `/subjects/${a.subject_id}/assignments` : null,
      })
    );

    privateSessions.forEach((ps) =>
      items.push({
        id: `private-${ps.id}`,
        type: "private-session",
        title: ps.subject,
        date: ps.date,
        teacher: ps.teacher_name,
        subject: ps.subject,
        link: `/private-sessions`,
      })
    );

    items.sort((a, b) => new Date(a.date) - new Date(b.date));
    return items;
  }, [allSessions, assignments, privateSessions]);

  // Notifications come pre-isolated (profile-scoped) and pre-normalized
  // (canonical UPPERCASE type) from the singleton hook.
  const filteredNotifications =
    notificationFilter === "All"
      ? notifications
      : notifications.filter((n) => n.type === notificationFilter);

  const filteredAssignments = useMemo(() => {
    const now = new Date();
    return assignments.filter((a) => {
      if (!a.due) return assignmentFilter === "due";
      const dueDate = new Date(a.due);
      if (Number.isNaN(dueDate.getTime())) return assignmentFilter === "due";
      return assignmentFilter === "due" ? dueDate >= now : dueDate < now;
    });
  }, [assignments, assignmentFilter]);

  const filteredSchedule = scheduleItems.filter((item) => {
    if (selectedDate) {
      const itemDate = new Date(item.date);
      const selDate = new Date(selectedDate.year, selectedDate.month, selectedDate.day);
      if (!isSameDay(itemDate, selDate)) return false;
    }
    if (scheduleFilter !== "All") {
      const mapped = SCHEDULE_FILTER_MAP[scheduleFilter] || scheduleFilter;
      if (item.type !== mapped) return false;
    }
    return true;
  });

  const handleDateClick = (day) => {
    if (
      selectedDate &&
      selectedDate.day === day &&
      selectedDate.month === currMonth &&
      selectedDate.year === currYear
    ) {
      setSelectedDate(null);
    } else {
      setSelectedDate({ day, month: currMonth, year: currYear });
    }
  };

  const renderCalendarGrid = () => {
    const totalDateCells = 42;
    const trailingBlanks = totalDateCells - (startOffset + daysInMonth);

    return (
      <>
        <div className="calendarHeader">
          <button type="button" className="calNavBtn" onClick={goToPrevMonth}>
            &#8249;
          </button>

          <div className="calendarHeader__mid">
            <select
              className="calendarSelect"
              value={currMonth}
              onChange={(e) => setCurrMonth(parseInt(e.target.value, 10))}
            >
              {months.map((m, i) => (
                <option key={m} value={i}>{m.substring(0, 3)}</option>
              ))}
            </select>

            <select
              className="calendarSelect"
              value={currYear}
              onChange={(e) => setCurrYear(parseInt(e.target.value, 10))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button type="button" className="calNavBtn" onClick={goToNextMonth}>
            &#8250;
          </button>
        </div>

        <div className="calendarGrid">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <div key={d} className="calDayName">{d}</div>
          ))}

          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-start-${i}`} className="calDate calDate--blank" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;

            const isToday =
              day === today.getDate() &&
              currMonth === today.getMonth() &&
              currYear === today.getFullYear();

            const isSelected =
              selectedDate &&
              selectedDate.day === day &&
              selectedDate.month === currMonth &&
              selectedDate.year === currYear;

            const dateKey = `${currYear}-${String(currMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            const dayEvents = calendarEvents[dateKey] || [];
            const visibleEvents = dayEvents.slice(0, 4);

            return (
              <button
                key={day}
                type="button"
                className={`calDate ${isToday ? "calToday" : ""} ${
                  isSelected ? "calSelected" : ""
                } ${dayEvents.length ? "calDate--hasEvents" : ""}`}
                onClick={() => handleDateClick(day)}
              >
                <span className="calDate__num">{day}</span>

                <span className="calDate__dots">
                  {visibleEvents.map((type, index) => (
                    <span
                      key={`${type}-${index}`}
                      className="calDate__dot"
                      style={{ background: EVENT_COLORS[type] }}
                    />
                  ))}
                </span>
              </button>
            );
          })}

          {Array.from({ length: trailingBlanks }).map((_, i) => (
            <div key={`empty-end-${i}`} className="calDate calDate--blank" />
          ))}
        </div>

        <div className="calLegend">
          <span className="calLegend__item">
            <span className="calLegend__dot" style={{ background: EVENT_COLORS.assignment }} />
            Assignment
          </span>
          <span className="calLegend__item">
            <span className="calLegend__dot" style={{ background: EVENT_COLORS["live-session"] }} />
            Live Session
          </span>
          <span className="calLegend__item">
            <span className="calLegend__dot" style={{ background: EVENT_COLORS["private-session"] }} />
            Private Session
          </span>
        </div>
      </>
    );
  };

  const renderScheduleItem = (item, idx) => {
    const typeClass =
      item.type === "live-session"
        ? "livesessions"
        : item.type === "assignment"
          ? "assignments"
          : item.type === "private-session"
            ? "privatesession"
            : "";

    return (
      <div
        key={item.id || idx}
        className={`scheduleItem scheduleItem--${typeClass}`}
        onClick={() => { if (item.link) navigate(item.link); }}
        style={item.link ? { cursor: "pointer" } : {}}
      >
        <div className="scheduleItem__header">
          <p className="scheduleDate">{formatDate(item.date)}</p>
          <span className={`scheduleBadge scheduleBadge--${typeClass}`}>
            {SCHEDULE_TYPE_LABELS[item.type] || item.type}
          </span>
        </div>
        <p className="scheduleTitle">{item.title}</p>
        <p className="scheduleSub">{item.subject}</p>
        <p className="scheduleSub">{item.teacher}</p>
      </div>
    );
  };

  const renderMobileSection = () => {
    switch (activeMobileTab) {
      case "sessions":
        return (
          <div className="mobileSectionContent">
            {sessions.map((s, idx) => renderSessionCard(s, idx))}
            {sessions.length === 0 && (
              <div className="emptyState">No upcoming live sessions</div>
            )}
          </div>
        );

      case "calendar":
        return (
          <div className="mobileCalendarScheduleStack">
            <div className="mobileCalendarCard">{renderCalendarGrid()}</div>

            <div className="mobileScheduleCard">
              <div className="mobileScheduleHeader">
                <h3>
                  Schedule
                  {selectedDate && (
                    <span className="selectedDateText">
                      —{" "}
                      {new Date(
                        selectedDate.year,
                        selectedDate.month,
                        selectedDate.day
                      ).toLocaleDateString("en-GB", DATE_FORMAT)}
                    </span>
                  )}
                </h3>

                <DropdownMenu
                  value={scheduleFilter}
                  onChange={setScheduleFilter}
                  options={SCHEDULE_OPTIONS}
                />
              </div>

              <div className="mobileSectionContent">
                {filteredSchedule.map((item, idx) => renderScheduleItem(item, idx))}
                {filteredSchedule.length === 0 && (
                  <div className="emptyState">No schedule</div>
                )}
              </div>
            </div>
          </div>
        );

      case "assign":
        return (
          <div className="mobileSectionContent">
            {assignments.map((a, idx) => (
              <AssignmentCard key={a.id || idx} {...a} />
            ))}
            {assignments.length === 0 && (
              <div className="emptyState">No assignments</div>
            )}
          </div>
        );

      case "quiz":
        return (
          <div className="mobileSectionContent">
            {quizzes.map((q) => (
              <QuizCard
                key={q.id}
                title={q.title}
                teacher={q.teacher}
                deadline={q.subject_name || ""}
                isCompleted={false}
                inProgress={false}
                onClick={() =>
                  navigate(q.subject_id ? `/subjects/quiz/${q.subject_id}` : "/subjects/quiz")
                }
              />
            ))}
            {quizzes.length === 0 && <div className="emptyState">No quizzes</div>}
          </div>
        );

      case "notify":
        return (
          <>
            <div className="mobileSectionTopAction">
              <DropdownMenu
                value={notificationFilter}
                onChange={setNotificationFilter}
                options={NOTIF_OPTIONS}
              />
            </div>
            <div className="mobileSectionContent">
              {filteredNotifications.map((n) => (
                <NotificationCard key={n.id} notification={n} onRead={markOneRead} />
              ))}
              {filteredNotifications.length === 0 && (
                <div className="emptyState">No notifications</div>
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  // ── Skill Dev track — render the skill home instead ───────────────
  if (activeTrack === "skill") {
    return (
      <div style={{ height: "100%", background: "var(--page-bg, #eef1f2)", display: "flex", overflow: "hidden" }}>
        <SkillDevStudentSection data={data} />
      </div>
    );
  }

  if (loading) return <LoadingState label="Loading dashboard" />;

  if (!activeCourse) {
    // No Academy enrolment on THIS profile — onboarding placeholder.
    return <AcademyEmptyState variant="dashboard" />;
  }

  if (error) {
    return (
      <div className="dashboardShell" style={{ padding: 20 }}>
        <div className="dashboardCard" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 18 }}>
          <p style={{ margin: 0 }}>{error}</p>
          <button
            type="button"
            className="assignmentToggle__btn assignmentToggle__btn--active"
            onClick={() => fetchDashboard()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const _now = new Date();
  const _pendingAssignments = assignments.filter((a) => {
    const d = a.dueDate || a.due ? new Date(a.dueDate || a.due) : null;
    return !d || Number.isNaN(d.getTime()) || d >= _now;
  }).length;
  // Backend may not have landed quiz_avg_pct yet on every deploy — default to
  // null (renders as "—") rather than throwing on a transitional response.
  const quizAvgPct = data?.quiz_avg_pct ?? null;
  const statCards = [
    { icon: "video", iconBg: "#e6f4f6", iconColor: "#13899b", value: sessions.length,               label: "Classes this week" },
    { icon: "file",  iconBg: "#ecf8ee", iconColor: "#2f9d42", value: _pendingAssignments,            label: "Assignments due" },
    { icon: "trend", iconBg: "#e8edfb", iconColor: "#1d4ed8", value: quizAvgPct != null ? `${quizAvgPct}%` : "—", label: "Average quiz score" },
    { icon: "help",  iconBg: "#f3e8ff", iconColor: "#7c3aed", value: quizzes.length,                 label: "Quizzes available" },
  ];

  return (
    <div className="dashboardShell">
      {/* Page heading — the design's H1 (dc.html line 2123). This used to be a
          greeting in the header; the header now shows the page title + date on
          every page, so the greeting lives here where the design puts it. */}
      <header className="dashGreet">
        <h1 className="dashGreet__title">
          {greetName ? `${timeGreeting}, ${greetName}` : timeGreeting} 👋
        </h1>
        <p className="dashGreet__sub">
          {courseLabel ? (
            <>Here's what's happening in <strong>{courseLabel}</strong> this week.</>
          ) : (
            <>Here's what's happening this week.</>
          )}
        </p>
      </header>

      <div className="desktopOnly">
        <div className="dashStatRow">
          {statCards.map((st) => (
            <div className="dashStat" key={st.label}>
              <div className="dashStat__icon" style={{ background: st.iconBg, color: st.iconColor }}>
                <NavIcon name={st.icon} size={18} color={st.iconColor} />
              </div>
              <div>
                <div className="dashStat__value">{st.value}</div>
                <div className="dashStat__label">{st.label}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="dashboardMain">
          <div className="dashboardLeft">
            {heroSession && (() => {
              const { chip, relative } = heroStatus(heroSession);
              return (
                <section className="dashHero">
                  <div className="dashHero__main">
                    <span className={`dashHero__chip dashHero__chip--${chip === "LIVE NOW" ? "live" : "next"}`}>
                      {chip}
                    </span>
                    <span className="dashHero__relative">{relative}</span>
                    <h3 className="dashHero__topic">{heroSession.subject} — {heroSession.topic}</h3>
                    <p className="dashHero__teacher">with {heroSession.teacher}</p>
                  </div>
                  <button
                    type="button"
                    className="dashHero__cta"
                    onClick={() => navigate(`/live/${heroSession.id}`)}
                  >
                    {chip === "LIVE NOW" ? "Join class" : "Set reminder"}
                  </button>
                </section>
              );
            })()}

            <section className="dashboardCard dashboardCard--live">
              <div className="cardHeader liveHeader">
                <h3>Upcoming Live Sessions</h3>
                <p className="sessionCountText">
                  {sessions.length} {sessions.length === 1 ? "Class" : "Classes"} this week
                </p>
              </div>

              {sessions.length > 0 ? (
                <div className="liveCardsRow">
                  {sessions.map((s, idx) => renderSessionCard(s, idx))}
                </div>
              ) : (
                <div className="liveEmptyState">
                  <div className="liveEmptyState__icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M8 2V5M16 2V5M3 9H21M5 5H19C20.1046 5 21 5.89543 21 7V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V7C3 5.89543 3.89543 5 5 5ZM12 13V17M10 15H14"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="liveEmptyState__content">
                    <p className="liveEmptyState__title">No upcoming live sessions this week</p>
                    <p className="liveEmptyState__text">Relax and prepare for your next class!</p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="dashboardRight">
            <section className="dashboardCard dashboardCard--assignments">
              <div className="cardHeader">
                <div className="assignmentToggle" role="tablist" aria-label="Assignments or Quizzes">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightRailTab === "assignments"}
                    className={`assignmentToggle__btn ${
                      rightRailTab === "assignments" ? "assignmentToggle__btn--active" : ""
                    }`}
                    onClick={() => setRightRailTab("assignments")}
                  >
                    Assignments
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightRailTab === "quizzes"}
                    className={`assignmentToggle__btn ${
                      rightRailTab === "quizzes" ? "assignmentToggle__btn--active" : ""
                    }`}
                    onClick={() => setRightRailTab("quizzes")}
                  >
                    Quizzes
                  </button>
                </div>

                {/* Quizzes have no due date, so the Due/Over Due toggle only
                    applies to the Assignments tab. */}
                {rightRailTab === "assignments" && (
                  <div className="assignmentToggle">
                    <button
                      type="button"
                      className={`assignmentToggle__btn ${
                        assignmentFilter === "due" ? "assignmentToggle__btn--active" : ""
                      }`}
                      onClick={() => setAssignmentFilter("due")}
                    >
                      Due
                    </button>

                    <button
                      type="button"
                      className={`assignmentToggle__btn ${
                        assignmentFilter === "overdue" ? "assignmentToggle__btn--active" : ""
                      }`}
                      onClick={() => setAssignmentFilter("overdue")}
                    >
                      Over Due
                    </button>
                  </div>
                )}
              </div>

              <div className="cardBodyScroll">
                {rightRailTab === "assignments" ? (
                  <>
                    {filteredAssignments.map((a, idx) => (
                      <AssignmentCard key={a.id || idx} {...a} />
                    ))}

                    {filteredAssignments.length === 0 && (
                      <div className="emptyState">
                        {assignmentFilter === "due" ? "No assignments due" : "No overdue assignments"}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {quizzes.map((q, idx) => (
                      <QuizCard
                        key={q.id || idx}
                        title={q.title}
                        teacher={q.teacher}
                        deadline={q.subject_name || ""}
                        isCompleted={false}
                        inProgress={false}
                        onClick={() =>
                          navigate(q.subject_id ? `/subjects/quiz/${q.subject_id}` : "/subjects/quiz")
                        }
                      />
                    ))}

                    {quizzes.length === 0 && (
                      <div className="emptyState">No quizzes available</div>
                    )}
                  </>
                )}
              </div>
            </section>

            <section className="dashboardCard dashboardCard--calendar">{renderCalendarGrid()}</section>
          </div>
        </div>
      </div>

      <div className="mobileOnly">
        <div className="topSliderTabs">
          <TopSliderTabs active={activeMobileTab} setActive={setActiveMobileTab} />
        </div>
        <div className="mobileSectionBody">{renderMobileSection()}</div>
      </div>
    </div>
  );
}
