// PLACEMENT: src/pages/Progress.jsx
//
// Read-only view of a course's progress. If the student is in a batch, this
// shows THAT batch's coverage (teachers tick chapters per batch); if they're
// not assigned to a batch yet, the backend falls back to the course-wide
// syllabus coverage. The fallback still renders fine here — we no longer
// call it out with a separate banner, per the design handoff.
//
// Routed at both:
//   /progress                          (sidebar nav item — falls back to
//                                        CourseContext's active course)
//   /my-courses/:courseId/progress     (linked from MyCourseDetail's
//                                        "Progress" card) so it always shows
//                                        the course being viewed — NOT
//                                        CourseContext's globally active
//                                        course, which can differ if the
//                                        student has more than one enrolment.
//
// Endpoint: GET /courses/my-batch-progress/?course=<courseId>
// Response now also carries a top-level `stats` object (quiz_avg_pct,
// quizzes_completed, live_hours, assignments_done) rendered as the stat-card
// row up top; `stats` is optional so this still renders (with "—"/0
// fallbacks) against an older backend that hasn't landed it yet.
//
// Layout matches the Academy design system's Progress screen: a 4-up stat
// row, then a single "Syllabus Progress" card listing one row per subject
// (name, percent, bar, chapters-covered + teacher meta). There is no ring/
// donut summary, no batch context banner, and no expandable per-chapter
// checklist on this screen — that detail lives on the teacher side.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCourse } from "../contexts/CourseContext";
import api from "../api/apiClient";
import NavIcon from "../components/NavIcon";
import { LoadingState, EmptyState, ErrorState } from "../components/StateViews";
import "../styles/academyCommon.css";
import "../styles/progress.css";

// The `my-batch-progress` subjects array doesn't carry a teacher field today
// (verified against courses/batch_progress.py's build_batch_progress /
// build_course_progress on the backend — subject payload is just id/name/
// order/chapters_total/chapters_done/percent/chapters). Other pages that
// show "chapters · teacher" (SubjectCard.jsx, SubjectDetails.jsx) source it
// from a `teachers` array on a *different* endpoint's subject object, so we
// try the same shapes here defensively in case the backend adds it under
// one of these names, falling back to the same "No teacher assigned" copy
// those pages use when nothing is present.
function subjectTeacherLabel(s) {
  if (s.teacher_name) return s.teacher_name;
  if (typeof s.teacher === "string" && s.teacher) return s.teacher;
  if (s.teachers?.length) return s.teachers.map((t) => t.name).join(", ");
  return "No teacher assigned";
}

function StatCard({ icon, iconBg, iconColor, value, label }) {
  return (
    <div className="progStat">
      <div className="progStat__icon" style={{ background: iconBg, color: iconColor }}>
        <NavIcon name={icon} size={18} color={iconColor} />
      </div>
      <div>
        <div className={`progStat__value${value === "—" ? " progStat__value--empty" : ""}`}>{value}</div>
        <div className="progStat__label">{label}</div>
      </div>
    </div>
  );
}

function SubjectRow({ subject }) {
  const pct = subject.percent || 0;
  return (
    <div className="progSubjectRow">
      <div className="progSubjectRow__head">
        <span className="progSubjectRow__name">{subject.name}</span>
        <span className="progSubjectRow__pct">{pct}%</span>
      </div>
      <div className="progSubjectRow__track">
        <div className="progSubjectRow__fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="progSubjectRow__meta">
        {subject.chapters_done}/{subject.chapters_total} chapters · {subjectTeacherLabel(subject)}
      </div>
    </div>
  );
}

export default function Progress() {
  const { courseId } = useParams();
  const { courses, activeCourse, loading: courseLoading } = useCourse();

  // Routed with a courseId → show THAT course, regardless of which one is
  // globally "active". Reached with no param (the sidebar nav item) → fall
  // back to activeCourse.
  const course = courseId
    ? courses?.find((c) => c.id === courseId)
    : activeCourse;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (courseLoading) return;
    if (!course) { setData(null); setLoading(false); return; }

    let cancel = false;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const res = await api.get("/courses/my-batch-progress/", {
          params: { course: course.id },
        });
        if (!cancel) setData(res.data);
      } catch (err) {
        console.error("Failed to load progress", err);
        if (!cancel) setFailed(true);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [course, courseLoading]);

  const stats = data?.stats || {};

  return (
    <div className="ac-page progressPage">
      <div className="ac-page__head">
        <h1 className="ac-page__title">Progress</h1>
        <p className="ac-page__sub">Your learning summary across all subjects.</p>
      </div>

      {courseLoading || loading ? (
        <LoadingState label="Loading progress" />
      ) : !course ? (
        <EmptyState
          icon="book"
          title="Course not found"
          message="You're not enrolled in this course, or it no longer exists."
          action={{ label: "My courses", to: "/my-courses", icon: "search" }}
        />
      ) : failed ? (
        <ErrorState
          title="Couldn't load progress"
          message="Please try again in a moment."
        />
      ) : !data || (data.subjects || []).length === 0 ? (
        <EmptyState
          icon="book"
          title="Nothing to track yet"
          message="Once your teachers start marking chapters as covered, your progress will show up here."
        />
      ) : (
        <>
          <div className="progStatRow">
            <StatCard
              icon="trend"
              iconBg="#e8edfb"
              iconColor="#1d4ed8"
              value={stats.quiz_avg_pct != null ? `${stats.quiz_avg_pct}%` : "—"}
              label="Average quiz score"
            />
            <StatCard
              icon="help"
              iconBg="#e6f4f6"
              iconColor="#13899b"
              value={stats.quizzes_completed ?? 0}
              label="Quizzes completed"
            />
            <StatCard
              icon="video"
              iconBg="#ecf8ee"
              iconColor="#2f9d42"
              value={`${stats.live_hours ?? 0}h`}
              label="Live class hours"
            />
            <StatCard
              icon="file"
              iconBg="#f3e8ff"
              iconColor="#7c3aed"
              value={stats.assignments_done ?? 0}
              label="Assignments done"
            />
          </div>

          <section className="progSyllabusCard">
            <h3 className="progSyllabusCard__title">Syllabus Progress</h3>
            <div className="progSubjectList">
              {data.subjects.map((s) => (
                <SubjectRow key={s.id} subject={s} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
