// src/pages/MyCourses.jsx
// ──────────────────────────────────────────────────────────────────────────
// Academy "My Courses" — the learner's enrolled courses. Data comes from
// CourseContext (/courses/my/). Each course carries a `subscription` block
// (starts_at / expires_at / status / is_active / days_remaining) or null when
// the enrollment has no subscription row yet ("Free access").
//
// Empty state no longer redirects to the marketing site — it renders the
// in-dashboard AcademyEmptyState (hero + Browse Courses CTA + live shop
// preview). Loading shows skeleton cards, never raw "Loading…" text. Styled
// with the shared Claude tokens (slate #425f7f).
// ──────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCourse } from "../contexts/CourseContext";
import AcademyEmptyState from "../components/AcademyEmptyState";
import Skeleton from "../components/Skeleton";
import "../styles/academyCommon.css";
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

function SkeletonCard() {
  return (
    <div className="mc-card">
      <Skeleton variant="chip" width="72px" />
      <Skeleton variant="title" style={{ marginTop: 12 }} />
      <Skeleton variant="line" width="70%" style={{ marginTop: 10 }} />
      <Skeleton variant="line" width="90%" style={{ marginTop: 16 }} />
    </div>
  );
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
    return (
      <div className="ac-page">
        <div className="ac-page__head">
          <h1 className="ac-page__title">My courses</h1>
          <p className="ac-page__sub">Everything you're enrolled in, in one place.</p>
        </div>
        <div className="ac-grid">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return <AcademyEmptyState variant="myCourses" />;
  }

  return (
    <div className="ac-page">
      <div className="ac-page__head">
        <div className="ac-page__headRow">
          <div>
            <h1 className="ac-page__title">My courses</h1>
            <p className="ac-page__sub">Everything you're enrolled in, in one place.</p>
          </div>
          <Link to="/browse-courses" className="ac-linkbtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Browse courses
          </Link>
        </div>
      </div>

      <div className="shop-toolbar">
        <div className="shop-search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your courses…"
            aria-label="Search your courses"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="ac-empty">
          <h2 className="ac-empty__title">Nothing matches that</h2>
          <p className="ac-empty__text">Try a different search term.</p>
          <button className="ac-empty__cta" onClick={() => setQuery("")}>Clear search</button>
        </div>
      ) : (
        <div className="ac-grid">
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
    <Link to={`/my-courses/${course.id}`} className="mc-card">
      <div className="mc-card__top">
        <div className="mc-card__pills">
          {board && <span className="mc-card__pill">{board}</span>}
          {stream && <span className="mc-card__pill">{stream}</span>}
        </div>
        <span className={`mc-card__badge mc-card__badge--${status.key}`}>{status.label}</span>
      </div>

      <h3 className="mc-card__title">{course.title}</h3>

      <div className="mc-card__sub">
        {sub ? (
          <>
            {sub.is_active && (
              <p className="mc-card__days">
                <span className="mc-card__daysNum">{sub.days_remaining}</span>
                <span className="mc-card__daysLabel">
                  day{sub.days_remaining === 1 ? "" : "s"} remaining
                </span>
              </p>
            )}
            <p className="mc-card__dates">
              {formatDate(sub.starts_at) && <>Started {formatDate(sub.starts_at)} · </>}
              {sub.is_active ? "Expires" : "Expired"} {formatDate(sub.expires_at)}
            </p>
          </>
        ) : (
          <p className="mc-card__dates mc-card__dates--free">
            Free access — no subscription needed right now.
          </p>
        )}
      </div>

      <span className="mc-card__cta">View course →</span>
    </Link>
  );
}
