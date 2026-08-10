// src/pages/BrowseCourses.jsx
// ──────────────────────────────────────────────────────────────────────────
// Academy "Browse Courses" — an in-dashboard shop that pulls real courses from
// the database (GET /courses/catalog/) instead of redirecting to the marketing
// site. Learners can filter by board, search, and enrol in one tap while the
// platform is free. Courses they already hold show an "Enrolled" state.
//
// States handled: loading (skeletons), error (retry banner), empty (friendly
// placeholder), and results. No raw text anywhere.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { getCourseCatalog } from "../api/catalog";
import useEnroll from "../hooks/useEnroll";
import CourseShopCard from "../components/CourseShopCard";
import CoursePaymentModal from "../components/CoursePaymentModal";
import Skeleton from "../components/Skeleton";
import { extractError } from "../shared/extractError";
import "../styles/academyCommon.css";
import "../styles/browseCourses.css";

// A few known category slugs get a proper acronym label; anything else falls
// back to a title-cased version of the slug so new categories never render
// as a raw dash-separated string.
const CATEGORY_LABELS = {
  neet: "NEET", upsc: "UPSC", jee: "IIT-JEE", ssc: "SSC · Banking",
  defence: "Defence", ca: "CA", olympiad: "Olympiad",
};
const categoryLabel = (slug) =>
  CATEGORY_LABELS[slug] || slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

function SkeletonCard() {
  return (
    <div className="ac-card shop-skel">
      <Skeleton variant="chip" />
      <Skeleton variant="title" />
      <Skeleton variant="line" width="80%" />
      <Skeleton variant="line" width="95%" />
      <div className="shop-skel__foot">
        <Skeleton variant="pill" width="60px" />
        <Skeleton variant="btn" width="110px" />
      </div>
    </div>
  );
}

export default function BrowseCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [board, setBoard] = useState("all");
  const [stream, setStream] = useState("all");
  const [category, setCategory] = useState("all");

  const { enroll, busyId, error: enrolError, setError: setEnrolError, collectsMoney, config } = useEnroll();

  const [toast, setToast] = useState("");
  const [payCourse, setPayCourse] = useState(null);   // course awaiting in-app payment
  const toastTimer = useRef(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCourseCatalog();
      setCourses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(extractError(e) || "Couldn't load courses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => clearTimeout(toastTimer.current);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  const handleEnrol = async (course) => {
    const res = await enroll(course, {
      onEnrolled: (c) => {
        // Reflect ownership right away so the card flips to "Enrolled" without
        // waiting for a catalog re-fetch.
        setCourses((prev) =>
          prev.map((x) => (x.id === c.id ? { ...x, is_enrolled: true } : x))
        );
        showToast(`You're enrolled in ${c.title}.`);
      },
      onNeedsPayment: (c) => setPayCourse(c),
    });
    if (res?.needsPayment) setPayCourse(course);
  };

  // Manual-proof payment submitted → mark the card as pending admin approval.
  const handlePaymentSubmitted = (c) => {
    setCourses((prev) =>
      prev.map((x) => (x.id === c.id ? { ...x, request_pending: true } : x))
    );
    showToast("Payment submitted — pending approval.");
  };

  // Filter options are derived from the catalog itself, so new boards and
  // streams appear automatically as courses are added — no code changes needed.
  const boards = useMemo(() => {
    const map = new Map();
    for (const c of courses) {
      if (c.board?.id) map.set(c.board.id, c.board.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [courses]);

  const streams = useMemo(() => {
    const map = new Map();
    for (const c of courses) {
      const s = c.stream || (c.stream_name ? { id: c.stream_name, name: c.stream_name } : null);
      if (s?.id) map.set(s.id, s.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [courses]);

  const categories = useMemo(() => {
    const slugs = new Set();
    for (const c of courses) (c.category_slugs || []).forEach((s) => slugs.add(s));
    return [...slugs].map((slug) => ({ slug, label: categoryLabel(slug) }));
  }, [courses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const streamIdOf = (c) => c.stream?.id || c.stream_name || null;
    const matched = courses.filter((c) => {
      if (board !== "all" && c.board?.id !== board) return false;
      if (stream !== "all" && streamIdOf(c) !== stream) return false;
      if (category !== "all" && !(c.category_slugs || []).includes(category)) return false;
      if (!q) return true;
      return [c.title, c.description, c.board?.name, c.stream_name, c.lead_teacher]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q));
    });
    // Still-available courses first, already-enrolled ones last (stable sort
    // keeps the API's board/title order within each group).
    return matched
      .map((c, i) => [c, i])
      .sort((a, b) => (a[0].is_enrolled ? 1 : 0) - (b[0].is_enrolled ? 1 : 0) || a[1] - b[1])
      .map(([c]) => c);
  }, [courses, query, board, stream, category]);

  return (
    <div className="ac-page">
      <div className="ac-page__head">
        <h1 className="ac-page__title">Browse courses</h1>
        <p className="ac-page__sub">
          Explore the classes your institution offers and enrol to start learning.
        </p>
      </div>

      {(error || enrolError) && (
        <div className="ac-banner ac-banner--error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            {error || enrolError}{" "}
            {error ? (
              <button
                type="button"
                onClick={load}
                style={{ background: "none", border: "none", color: "#991b1b", fontWeight: 700, textDecoration: "underline", cursor: "pointer", padding: 0 }}
              >
                Try again
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEnrolError("")}
                style={{ background: "none", border: "none", color: "#991b1b", fontWeight: 700, textDecoration: "underline", cursor: "pointer", padding: 0 }}
              >
                Dismiss
              </button>
            )}
          </span>
        </div>
      )}

      {/* Toolbar — hidden while the first load is in flight to avoid layout jitter */}
      {!loading && !error && courses.length > 0 && (
        <div className="shop-toolbar">
          <div className="shop-search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses…"
              aria-label="Search courses"
            />
          </div>

          {boards.length > 1 && (
            <div className="shop-facet">
              <span className="shop-facet__label">Board</span>
              <div className="shop-facet__row">
                <button className={`shop-chip${board === "all" ? " is-active" : ""}`} onClick={() => setBoard("all")}>All</button>
                {boards.map((b) => (
                  <button key={b.id} className={`shop-chip${board === b.id ? " is-active" : ""}`} onClick={() => setBoard(b.id)}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {streams.length > 1 && (
            <div className="shop-facet">
              <span className="shop-facet__label">Stream</span>
              <div className="shop-facet__row">
                <button className={`shop-chip${stream === "all" ? " is-active" : ""}`} onClick={() => setStream("all")}>All</button>
                {streams.map((s) => (
                  <button key={s.id} className={`shop-chip${stream === s.id ? " is-active" : ""}`} onClick={() => setStream(s.id)}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {categories.length > 1 && (
            <div className="shop-facet">
              <span className="shop-facet__label">Category</span>
              <div className="shop-facet__row">
                <button className={`shop-chip${category === "all" ? " is-active" : ""}`} onClick={() => setCategory("all")}>All</button>
                {categories.map((c) => (
                  <button key={c.slug} className={`shop-chip${category === c.slug ? " is-active" : ""}`} onClick={() => setCategory(c.slug)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="ac-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? null : courses.length === 0 ? (
        <div className="ac-empty">
          <div className="ac-empty__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <h2 className="ac-empty__title">No courses published yet</h2>
          <p className="ac-empty__text">
            Your institution hasn't opened any courses for enrolment yet. Check
            back soon — new classes will show up here the moment they go live.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ac-empty">
          <div className="ac-empty__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h2 className="ac-empty__title">Nothing matches that</h2>
          <p className="ac-empty__text">Try a different search term or clear the filters.</p>
          <button className="ac-empty__cta" onClick={() => { setQuery(""); setBoard("all"); setStream("all"); setCategory("all"); }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="ac-grid">
          {filtered.map((c) => (
            <CourseShopCard
              key={c.id}
              course={c}
              busy={busyId === c.id}
              collectsMoney={collectsMoney}
              onEnrol={handleEnrol}
            />
          ))}
        </div>
      )}

      <div className={`shop-toast${toast ? " is-show" : ""}`} role="status" aria-live="polite">
        <span className="shop-toast__dot" />
        {toast}
      </div>

      {payCourse && (
        <CoursePaymentModal
          course={payCourse}
          config={config}
          onClose={() => setPayCourse(null)}
          onSubmitted={handlePaymentSubmitted}
        />
      )}
    </div>
  );
}
