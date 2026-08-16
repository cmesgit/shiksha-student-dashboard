// src/pages/SubjectsAssignments.jsx
// ──────────────────────────────────────────────────────────────────────────
// Academy "Assignments" — one flat, filterable list of every assignment
// across the learner's subjects. Matches the design handoff's Assignments
// screen (Academy Dashboard.dc.html lines 1731–1774): a subject-pill filter
// row on the left, a status select (All / Due / Overdue / Submitted) pushed to
// the right margin, then one list card of rows.
//
// There is deliberately NO subject-picker step any more. The design shows this
// screen reached straight from the nav, so `pages/AssignmentsSubjects.jsx` (the
// picker) is gone and `/assignments` lands here.
//
// Data: ONE request — GET /assignments/courses/:courseId/ returns every
// assignment across the course's subjects. That endpoint is also stricter than
// the per-subject one this screen used to fan out over: it enforces the active
// subscription AND batch isolation (course-wide assignments plus this learner's
// own batch), so the fan-out was showing other batches' work.
//
// It needs `subject_id` on each row to build the pills and the row links; that
// field is a recent addition to AssignmentListSerializer. Until the backend
// carrying it is deployed we fall back to the old per-subject fan-out, so this
// screen works against both old and new API builds.
//
// The route still accepts an optional :subjectId so older deep links keep
// working — it just preselects that subject's pill instead of scoping the fetch.
// ──────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/apiClient";
import { useCourse } from "../contexts/CourseContext";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import { subjectChipSlot } from "../utils/subjectChips";
import "../styles/academyCommon.css";
import "../styles/academyScreens.css";

const STATUS_FILTERS = ["All", "Due", "Overdue", "Submitted"];

// Status → shared .ac-tag--* variant.
const STATUS_TONE = { due: "success", overdue: "danger", submitted: "info", graded: "success" };

const fmtDue = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "";

// Same convention as StudyMaterialList/Subjects/Progress: the assignment
// endpoints don't carry a teacher name (AssignmentListSerializer has no such
// field), but the subject object from CourseContext does via `.teachers[]` —
// so the row's meta line is built from that, not from a field the API never
// sends.
const teacherLabelFor = (subject) =>
  subject?.teachers?.length
    ? subject.teachers.map((t) => t.name).join(", ")
    : "No teacher assigned";

export default function SubjectsAssignments() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const { activeCourse, subjects } = useCourse();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  // "" = All subjects. Seeded from the route so a deep link preselects.
  const [subjectFilter, setSubjectFilter] = useState(subjectId ? String(subjectId) : "");

  useEffect(() => {
    setSubjectFilter(subjectId ? String(subjectId) : "");
  }, [subjectId]);

  useEffect(() => {
    const list = subjects || [];
    if (!activeCourse || list.length === 0) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Legacy path: one request per subject, flattened client-side. Only used
    // when the batched endpoint isn't available yet (see below).
    async function fetchPerSubject() {
      const perSubject = await Promise.all(
        list.map((s) =>
          api
            .get(`/assignments/subject/${s.id}/`)
            .then((res) =>
              (res.data || []).map((a) => ({
                ...a,
                subjectId: s.id,
                subjectName: a.subject || s.name,
              }))
            )
            // A subject that fails degrades to empty rather than rejecting the
            // whole screen.
            .catch(() => [])
        )
      );
      return perSubject.flat();
    }

    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        // This route already exists on every backend, so an HTTP error from it
        // is REAL (403 = subscription expired) and must surface — falling back
        // to the per-subject fan-out on a 403 would quietly bypass the
        // subscription gate, since that endpoint doesn't check it. The only
        // fallback case is an older build that answers without subject_id.
        const res = await api.get(`/assignments/courses/${activeCourse.id}/`);
        const data = res.data || [];
        const rows =
          data.length && data.every((a) => !a.subject_id)
            ? await fetchPerSubject()
            : data.map((a) => ({
                ...a,
                subjectId: a.subject_id,
                subjectName: a.subject_name,
              }));
        if (cancelled) return;
        setAssignments(rows);
      } catch (err) {
        if (cancelled) return;
        console.error("Assignment fetch error:", err);
        setError("Failed to load assignments.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [activeCourse, subjects]);

  const now = Date.now();

  const bySubjectId = useMemo(
    () => new Map((subjects || []).map((s) => [String(s.id), s])),
    [subjects]
  );

  // Decorate once: status key, chip label, and the design's meta line (just
  // the teacher name — the due date already lives in the status chip, so
  // repeating it in the meta line would just duplicate it).
  const decorated = useMemo(
    () =>
      assignments.map((a) => {
        const isGraded = a.status === "GRADED";
        const isSubmitted = a.status === "SUBMITTED" || isGraded;
        const isOverdue =
          !isSubmitted && a.due_date && new Date(a.due_date).getTime() < now;
        const stKey = isGraded ? "graded" : isSubmitted ? "submitted" : isOverdue ? "overdue" : "due";
        const subject = bySubjectId.get(String(a.subjectId));
        return {
          ...a,
          stKey,
          stLabel:
            stKey === "graded"
              ? `Graded ${a.marks_obtained}/${a.max_marks}`
              : stKey === "submitted"
              ? "Submitted"
              : stKey === "overdue"
              ? "Overdue"
              : `Due ${fmtDue(a.due_date)}`,
          meta: teacherLabelFor(subject),
        };
      }),
    [assignments, now, bySubjectId]
  );

  // Only offer a pill for subjects that actually have an assignment.
  const subjectsWithWork = useMemo(() => {
    const ids = new Set(decorated.map((a) => String(a.subjectId)));
    return (subjects || []).filter((s) => ids.has(String(s.id)));
  }, [subjects, decorated]);

  const rows = useMemo(
    () =>
      decorated
        .filter((a) => !subjectFilter || String(a.subjectId) === subjectFilter)
        .filter((a) => statusFilter === "All" || a.stKey === statusFilter.toLowerCase())
        .sort((a, b) => {
          // Soonest due first; undated last.
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        }),
    [decorated, subjectFilter, statusFilter]
  );

  if (loading) return <div className="ac-screen"><LoadingState label="Loading assignments" /></div>;
  if (error) return <div className="ac-screen"><ErrorState message={error} /></div>;

  return (
    <div className="ac-screen">
      <div className="ac-head">
        <div>
          <h1 className="ac-head__title">Assignments</h1>
          <p className="ac-head__sub">Everything due, overdue and already submitted.</p>
        </div>
      </div>

      <div className="ac-filterBar">
        <div className="ac-pills">
          <button
            type="button"
            className={`ac-pill${subjectFilter === "" ? " is-active" : ""}`}
            onClick={() => setSubjectFilter("")}
          >
            All
          </button>
          {subjectsWithWork.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`ac-pill${subjectFilter === String(s.id) ? " is-active" : ""}`}
              onClick={() => setSubjectFilter(String(s.id))}
            >
              {s.name}
            </button>
          ))}
        </div>

        <select
          className="ac-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <section className="ac-listCard">
        <div className="ac-list">
          {rows.length === 0 ? (
            <EmptyState
              plain
              icon="file"
              title="Nothing here"
              message={
                statusFilter === "All"
                  ? "You're all caught up. New assignments will appear here when your teacher sets them."
                  : `No ${statusFilter.toLowerCase()} assignments right now.`
              }
            />
          ) : (
            rows.map((a) => (
              <div key={a.id} className="ac-row ac-row--tall">
                <div className="ac-row__body">
                  <div className="ac-row__meta">
                    <span className={`subj-chip subj-chip--${subjectChipSlot(a.subjectName)}`}>
                      {a.subjectName}
                    </span>
                    <span className={`ac-tag ac-tag--${STATUS_TONE[a.stKey]}`}>
                      {a.stLabel}
                    </span>
                  </div>
                  <div className="ac-row__topic">{a.title}</div>
                  {a.meta && <div className="ac-row__sub">{a.meta}</div>}
                </div>
                <button
                  type="button"
                  className="ac-btn"
                  onClick={() => navigate(`/subjects/${a.subjectId}/assignments/${a.id}`)}
                >
                  {a.stKey === "submitted" ? "Feedback" : "Open"}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
