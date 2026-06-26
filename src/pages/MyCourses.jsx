// src/pages/MyCourses.jsx
// ──────────────────────────────────────────────────────────────────────────
// "My Courses" — the Academy-side list of the learner's enrolled courses.
//
// Data comes from CourseContext, which fetches /courses/my/. Each course
// carries a `subscription` block (starts_at / expires_at / status / is_active
// / days_remaining) or `null` when the enrollment has no subscription row yet
// ("Free access"). Cards link to the existing /my-courses/:courseId detail.
// ──────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../contexts/CourseContext";
import PageHeader from "../components/PageHeader";
import { ACADEMY_BROWSE_URL } from "../config/urls";
import "../styles/myCourses.css";

const DATE_FORMAT = { day: "2-digit", month: "short", year: "numeric" };
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", DATE_FORMAT) : "";

function statusOf(sub) {
  if (!sub) return { key: "free", label: "Free access" };
  return sub.is_active
    ? { key: "active", label: "Active" }
    : { key: "expired", label: "Expired" };
}

export default function MyCourses() {
  const { courses, loading } = useCourse();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses || [];
    return (courses || []).filter((c) =>
      [c.title, c.board?.name, c.stream_name]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [courses, query]);

  if (loading) {
    return <div className="myCourses__state">Loading your courses…</div>;
  }

  return (
    <div className="myCourses">
      <PageHeader title="My Courses" onSearch={setQuery} />

      {!courses || courses.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="myCourses__state">No courses match “{query}”.</div>
      ) : (
        <div className="myCourses__grid">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }) {
  const sub = course.subscription;
  const status = statusOf(sub);
  const board = course.board?.name;
  const stream = course.stream_name;

  return (
    <Link to={`/my-courses/${course.id}`} className="myCourses__card">
      <div className="myCourses__cardTop">
        <h3 className="myCourses__cardTitle">{course.title}</h3>
        <span className={`myCourses__badge myCourses__badge--${status.key}`}>
          {status.label}
        </span>
      </div>

      {(board || stream) && (
        <div className="myCourses__chips">
          {board && <span className="myCourses__chip">{board}</span>}
          {stream && <span className="myCourses__chip">{stream}</span>}
        </div>
      )}

      <div className="myCourses__sub">
        {sub ? (
          <>
            {sub.is_active && (
              <p className="myCourses__subLine">
                <span className="myCourses__days">{sub.days_remaining}</span>
                <span className="myCourses__daysLabel">
                  day{sub.days_remaining === 1 ? "" : "s"} remaining
                </span>
              </p>
            )}
            <p className="myCourses__dates">
              {formatDate(sub.starts_at) && <>Started {formatDate(sub.starts_at)} · </>}
              {sub.is_active ? "Expires" : "Expired"} {formatDate(sub.expires_at)}
            </p>
          </>
        ) : (
          <p className="myCourses__dates myCourses__dates--free">
            Free access — no subscription needed right now.
          </p>
        )}
      </div>

      <span className="myCourses__cta">View course →</span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="myCourses__empty">
      <h3 className="myCourses__emptyTitle">You haven't enrolled in any courses yet</h3>
      <p className="myCourses__emptyText">
        Browse the catalog to find a class for your board and grade, then enroll
        to see it here.
      </p>
      <a
        className="myCourses__browseBtn"
        href={ACADEMY_BROWSE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Browse courses
      </a>
    </div>
  );
}
