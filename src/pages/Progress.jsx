// PLACEMENT: src/pages/Progress.jsx
//
// Read-only view of the student's course progress. If the student is in a
// batch, this shows THAT batch's coverage (teachers tick chapters per batch);
// if they're not assigned to a batch yet, the backend falls back to the
// course-wide syllabus coverage and flags it, which we label accordingly.
//
// Endpoint: GET /courses/my-batch-progress/?course=<activeCourse.id>

import { useEffect, useState } from "react";
import { useCourse } from "../contexts/CourseContext";
import api from "../api/apiClient";
import PageHeader from "../components/PageHeader";
import { LoadingState, EmptyState, ErrorState } from "../components/StateViews";
import "../styles/progress.css";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "";

function Bar({ percent }) {
  return (
    <div className="prog-bar" aria-hidden>
      <div className="prog-bar__fill" style={{ width: `${Math.min(100, percent || 0)}%` }} />
    </div>
  );
}

export default function Progress() {
  const { activeCourse, loading: courseLoading } = useCourse();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (courseLoading) return;
    if (!activeCourse) { setData(null); setLoading(false); return; }

    let cancel = false;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const res = await api.get("/courses/my-batch-progress/", {
          params: { course: activeCourse.id },
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
  }, [activeCourse, courseLoading]);

  const isFallback = data && (data.batch === null || data.fallback === "course_wide");

  return (
    <div className="progressPage">
      <div className="progressHeaderBox">
        <PageHeader title="Course Progress" />
      </div>

      <div className="progressBodyBox">
        {courseLoading || loading ? (
          <LoadingState plain label="Loading progress" />
        ) : !activeCourse ? (
          <EmptyState
            plain
            icon="book"
            title="No course selected"
            message="Enrol in a course to follow how much of the syllabus your teachers have covered."
            action={{ label: "Browse courses", to: "/browse-courses", icon: "search" }}
          />
        ) : failed ? (
          <ErrorState
            plain
            title="Couldn't load progress"
            message="Please try again in a moment."
          />
        ) : !data || (data.subjects || []).length === 0 ? (
          <EmptyState
            plain
            icon="book"
            title="Nothing to track yet"
            message="Once your teachers start marking chapters as covered, your progress will show up here."
          />
        ) : (
          <>
            <div className="prog-context">
              {isFallback ? (
                <span className="prog-tag prog-tag--muted">Course syllabus</span>
              ) : (
                <span className="prog-tag">
                  {data.batch?.name}
                  {data.batch?.code ? ` · ${data.batch.code}` : ""}
                </span>
              )}
              {isFallback && (
                <span className="prog-context-note">
                  You’re not in a specific batch yet — showing the overall course syllabus.
                </span>
              )}
            </div>

            <div className="prog-overall">
              <div className="prog-overall-ring" style={{ "--pct": `${data.percent}%` }}>
                <span className="prog-overall-pct">{data.percent}%</span>
              </div>
              <div className="prog-overall-meta">
                <strong>{data.chapters_done} of {data.chapters_total} chapters covered</strong>
                <span className="prog-muted">{data.chapters_left} left</span>
                <Bar percent={data.percent} />
              </div>
            </div>

            <div className="prog-subjects">
              {data.subjects.map((s) => (
                <section className="prog-subject" key={s.id}>
                  <div className="prog-subject-head">
                    <span className="prog-subject-name">{s.name}</span>
                    <span className="prog-muted">{s.chapters_done}/{s.chapters_total} · {s.percent}%</span>
                  </div>
                  <Bar percent={s.percent} />

                  {s.chapters.length === 0 ? (
                    <p className="prog-muted prog-indent">No chapters yet.</p>
                  ) : (
                    <ul className="prog-chapters">
                      {s.chapters.map((c) => (
                        <li key={c.id} className={`prog-chapter${c.is_covered ? " covered" : ""}`}>
                          <span className="prog-tick" aria-hidden>{c.is_covered ? "✓" : "○"}</span>
                          <span className="prog-chapter-title">{c.title}</span>
                          {c.is_covered && c.covered_at && (
                            <span className="prog-date">{fmtDate(c.covered_at)}</span>
                          )}
                          {c.note ? <span className="prog-note">“{c.note}”</span> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
