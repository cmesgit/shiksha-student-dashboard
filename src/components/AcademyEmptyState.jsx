// src/components/AcademyEmptyState.jsx
// ──────────────────────────────────────────────────────────────────────────
// The placeholder shown to a learner who has no Academy course yet — on the
// Dashboard (no active course) and in My Courses (nothing enrolled). Instead of
// raw "No course selected" text or a redirect to the marketing homepage, it
// gives a friendly hero, an in-app "Browse courses" CTA, and a live preview of
// a few real courses pulled from the database (a shop-like invitation to act).
//
// Degrades gracefully: if the catalog is empty or fails to load, it falls back
// to the hero + CTA alone, never a broken or empty region.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCourseCatalog } from "../api/catalog";
import useEnroll from "../hooks/useEnroll";
import CourseShopCard from "./CourseShopCard";
import Skeleton from "./Skeleton";
import "../styles/academyCommon.css";
import "../styles/browseCourses.css";

const COPY = {
  dashboard: {
    title: "Your Academy is ready when you are",
    text: "Enrol in a class to unlock your dashboard — live sessions, assignments, quizzes, and study material all appear here once you're in.",
  },
  myCourses: {
    title: "You haven't enrolled in any courses yet",
    text: "Pick a class for your board and grade to get started. Everything you enrol in shows up here.",
  },
};

function PreviewSkeleton() {
  return (
    <div className="ac-card shop-skel">
      <Skeleton variant="chip" />
      <Skeleton variant="title" />
      <Skeleton variant="line" width="90%" />
      <div className="shop-skel__foot">
        <Skeleton variant="pill" width="56px" />
        <Skeleton variant="btn" width="104px" />
      </div>
    </div>
  );
}

export default function AcademyEmptyState({ variant = "dashboard" }) {
  const navigate = useNavigate();
  const copy = COPY[variant] || COPY.dashboard;

  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const { enroll, busyId, collectsMoney } = useEnroll();

  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    getCourseCatalog()
      .then((data) => {
        if (!alive) return;
        const open = (Array.isArray(data) ? data : []).filter((c) => !c.is_enrolled);
        setPreview(open.slice(0, 3));
      })
      .catch(() => alive && setPreview([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  };

  const handleEnrol = async (course) => {
    const res = await enroll(course, {
      onEnrolled: (c) => showToast(`You're enrolled in ${c.title}.`),
    });
    if (res?.redirected) showToast("Opening checkout in a new tab…");
  };

  const hasPreview = loading || preview.length > 0;

  return (
    <div className="ac-page">
      <div className="ac-empty">
        <div className="ac-empty__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <h2 className="ac-empty__title">{copy.title}</h2>
        <p className="ac-empty__text">{copy.text}</p>
        <button type="button" className="ac-empty__cta" onClick={() => navigate("/browse-courses")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Browse courses
        </button>
      </div>

      {hasPreview && (
        <div style={{ maxWidth: 980, margin: "8px auto 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-display, "Montserrat", system-ui, sans-serif)',
                fontSize: 14,
                fontWeight: 800,
                color: "var(--ink, #1a2c33)",
                margin: 0,
              }}
            >
              Available for you
            </h3>
            <button
              type="button"
              onClick={() => navigate("/browse-courses")}
              style={{
                background: "none",
                border: "none",
                color: "var(--academy, #425f7f)",
                fontFamily: 'var(--font-body, "Poppins", system-ui, sans-serif)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              View all →
            </button>
          </div>

          <div className="ac-grid">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <PreviewSkeleton key={i} />)
              : preview.map((c) => (
                  <CourseShopCard
                    key={c.id}
                    course={c}
                    busy={busyId === c.id}
                    collectsMoney={collectsMoney}
                    onEnrol={handleEnrol}
                  />
                ))}
          </div>
        </div>
      )}

      <div className={`shop-toast${toast ? " is-show" : ""}`} role="status" aria-live="polite">
        <span className="shop-toast__dot" />
        {toast}
      </div>
    </div>
  );
}
