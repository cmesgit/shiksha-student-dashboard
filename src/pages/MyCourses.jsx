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

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCourse } from "../contexts/CourseContext";
import AcademyEmptyState from "../components/AcademyEmptyState";
import Skeleton from "../components/Skeleton";
import api from "../api/apiClient";
import { courseQualifier } from "../utils/courseKind";
import { formatPrice } from "../api/catalog";
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
  const { courses, loading, selectCourse, activeCourse } = useCourse();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [view, setView] = useState("mine"); // "mine" | "account"
  const [accountSummary, setAccountSummary] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState(false);

  // `accountLoading` must NOT be a dependency, and must not be part of the
  // guard. It used to be both, which made this effect cancel its own request
  // every single time:
  //
  //   1. runs, guard passes, calls setAccountLoading(true)
  //   2. accountLoading is a dep → the effect re-runs
  //   3. the FIRST run's cleanup fires, setting cancelled = true
  //   4. the re-run hits `|| accountLoading` and returns immediately
  //   5. the original request resolves, but every setState is behind
  //      `if (!cancelled)` — so the data is thrown away AND
  //      setAccountLoading(false) never runs
  //
  // accountLoading was therefore stuck true forever and the "All profiles"
  // tab showed loading skeletons that never resolved. Keying only on `view`
  // and `accountSummary` is enough: once the data lands the guard stops any
  // refetch, and the re-run that data triggers cancels a request that has
  // already completed.
  useEffect(() => {
    if (view !== "account" || accountSummary) return;
    let cancelled = false;
    (async () => {
      setAccountLoading(true);
      setAccountError(false);
      try {
        const res = await api.get("/accounts/profiles/enrollments/");
        if (!cancelled) setAccountSummary(res.data || []);
      } catch {
        if (!cancelled) setAccountError(true);
      } finally {
        if (!cancelled) setAccountLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [view, accountSummary]);

  // Switch the whole dashboard's active-course context to the clicked course,
  // then drop the learner into that course's subjects. This is the
  // context-switcher behaviour: everything scoped to activeCourse (subjects,
  // live sessions, study material…) follows the selection.
  const switchToCourse = (courseId) => {
    selectCourse(courseId);
    navigate("/subjects");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses || [];
    return (courses || []).filter((c) =>
      [c.title, courseQualifier(c), c.stream_name]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [courses, query]);

  const viewToggle = (
    <div className="mc-view-toggle" role="tablist" aria-label="My courses view">
      <button
        type="button"
        role="tab"
        aria-selected={view === "mine"}
        className={`mc-view-toggle__btn${view === "mine" ? " is-active" : ""}`}
        onClick={() => setView("mine")}
      >
        This profile
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === "account"}
        className={`mc-view-toggle__btn${view === "account" ? " is-active" : ""}`}
        onClick={() => setView("account")}
      >
        All profiles
      </button>
    </div>
  );

  const head = (
    <div className="ac-page__head">
      <div className="ac-page__headRow">
        <div>
          <h1 className="ac-page__title">My courses</h1>
          <p className="ac-page__sub">
            {view === "account"
              ? "Every profile on this account, and the courses each one holds."
              : "Everything you're enrolled in, in one place."}
          </p>
        </div>
        <Link to="/browse-courses" className="ac-linkbtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Browse courses
        </Link>
      </div>
      {viewToggle}
    </div>
  );

  if (view === "account") {
    return (
      <div className="ac-page">
        {head}
        {accountLoading ? (
          <div className="ac-grid">
            {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : accountError ? (
          <div className="ac-empty">
            <h2 className="ac-empty__title">Couldn't load this</h2>
            <p className="ac-empty__text">Something went wrong fetching your account's profiles.</p>
          </div>
        ) : !accountSummary || accountSummary.length === 0 ? (
          <div className="ac-empty">
            <h2 className="ac-empty__title">No profiles yet</h2>
          </div>
        ) : (
          <div className="mc-account-list">
            {accountSummary.map((row) => (
              <div className="mc-account-row" key={row.profile.id}>
                <div className="mc-account-row__profile">
                  <span className="mc-account-row__avatar">
                    {row.profile.avatar_type === "image" ? (
                      <img src={row.profile.avatar} alt="" />
                    ) : (
                      row.profile.avatar || "🙂"
                    )}
                  </span>
                  <span className="mc-account-row__name">{row.profile.display_name}</span>
                </div>
                {row.courses.length === 0 ? (
                  <p className="mc-account-row__empty">No active courses.</p>
                ) : (
                  <div className="mc-account-row__courses">
                    {row.courses.map((c) => (
                      <span className="mc-card__pill" key={c.id}>{c.title}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ac-page">
        {head}
        <div className="ac-grid">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="ac-page">
        {head}
        <AcademyEmptyState variant="myCourses" />
      </div>
    );
  }

  return (
    <div className="ac-page">
      {head}

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
            <CourseCard
              key={course.id}
              course={course}
              isActive={activeCourse?.id === course.id}
              onSelect={() => switchToCourse(course.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, isActive, onSelect }) {
  const sub = course.subscription;
  const status = statusOf(sub);
  // Board for a school course; "Competitive exam" for an exam, which has
  // none by design. Previously the pill just vanished for exams.
  const qualifier = courseQualifier(course);
  const stream = course.stream_name;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`mc-card mc-card--switch${isActive ? " mc-card--current" : ""}`}
      aria-pressed={isActive}
    >
      <div className="mc-card__top">
        <div className="mc-card__pills">
          {qualifier && <span className="mc-card__pill">{qualifier}</span>}
          {stream && <span className="mc-card__pill">{stream}</span>}
        </div>
        <span className={`mc-card__badge mc-card__badge--${status.key}`}>{status.label}</span>
      </div>

      <h3 className="mc-card__title">{course.title}</h3>
      <p className="mc-card__price">{formatPrice(course.price)}</p>

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

      <div className="mc-card__foot">
        <span className="mc-card__cta">
          {isActive ? "Current course ✓" : "Switch to this course →"}
        </span>
        <Link
          to={`/my-courses/${course.id}`}
          className="mc-card__details"
          onClick={(e) => e.stopPropagation()}
        >
          View details
        </Link>
      </div>
    </div>
  );
}
