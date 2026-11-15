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

import { Fragment, useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api/apiClient";
import { useCourse } from "../contexts/CourseContext";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import { subjectChipSlot } from "../utils/subjectChips";
import AcademyRail from "../components/academy/AcademyRail";
import "../styles/academyCommon.css";
import "../styles/academyScreens.css";

// "Graded" was missing, and that made the whole dropdown look broken. The
// decorator emits FOUR status keys (due / overdue / submitted / graded) but
// only three had an option, so a graded assignment matched nothing and was
// invisible under every filter except All — which is exactly the reported
// symptom of "Submitted shows nothing".
const STATUS_FILTERS = ["All", "Due", "Overdue", "Submitted", "Graded"];

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
  const [searchParams] = useSearchParams();
  const wantedCourseId = searchParams.get("course");
  const { activeCourse, subjects, courses, selectCourse } = useCourse();

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
    if (!wantedCourseId || String(activeCourse?.id) === wantedCourseId) return;
    if ((courses || []).some((course) => String(course.id) === wantedCourseId)) selectCourse(wantedCourseId);
    // selectCourse is recreated by CourseProvider on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedCourseId, activeCourse?.id, courses]);

  useEffect(() => {
    if (wantedCourseId && String(activeCourse?.id) !== wantedCourseId &&
        (courses || []).some((course) => String(course.id) === wantedCourseId)) return;
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
  }, [activeCourse, subjects, courses, wantedCourseId]);

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
        // "Submitted" is a SUPERSET of "Graded" — graded work has, by
        // definition, been submitted, and a learner picking "Submitted"
        // means "everything I've turned in". "Graded" then narrows to the
        // marked ones. The decorator splits the two apart for the status
        // chip's label; the filter must put them back together.
        .filter((a) => {
          if (statusFilter === "All") return true;
          const want = statusFilter.toLowerCase();
          if (want === "submitted") return a.stKey === "submitted" || a.stKey === "graded";
          return a.stKey === want;
        })
        .sort((a, b) => {
          // Soonest due first; undated last.
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        }),
    [decorated, subjectFilter, statusFilter]
  );

  // The design's segmented control carries a count per state
  // (Academy Lists.dc.html: [['All','9'],['Due','3'],['Overdue','1'],
  // ['Submitted','2'],['Graded','3']]). Counts are computed BEFORE the status
  // filter is applied but AFTER the subject filter — otherwise picking
  // "Overdue" would zero every other tab and the control becomes a one-way
  // door, the same trap the admin Teachers facets hit.
  const statusCounts = useMemo(() => {
    const inSubject = decorated.filter(
      (a) => !subjectFilter || String(a.subjectId) === subjectFilter
    );
    const n = (want) =>
      want === "all"
        ? inSubject.length
        : want === "submitted"
          ? inSubject.filter((a) => a.stKey === "submitted" || a.stKey === "graded").length
          : inSubject.filter((a) => a.stKey === want).length;
    return Object.fromEntries(STATUS_FILTERS.map((f) => [f, n(f.toLowerCase())]));
  }, [decorated, subjectFilter]);

  // "To do" / "Turned in" — the design's two sections. stKey is exclusive, so
  // anything submitted or graded is turned in and everything else is still
  // owed. Empty sections are dropped rather than printed as "Turned in 0",
  // which reads as a reproach.
  const sections = useMemo(() => {
    const todo = rows.filter((a) => a.stKey === "due" || a.stKey === "overdue");
    const done = rows.filter((a) => a.stKey === "submitted" || a.stKey === "graded");
    const out = [];
    if (todo.length) out.push({ key: "todo", label: "To do", count: `${todo.length} open`, items: todo });
    if (done.length) out.push({ key: "done", label: "Turned in", count: String(done.length), items: done });
    return out;
  }, [rows]);

  // ── Right rail ──────────────────────────────────────────────────────────
  // Spec: Academy Lists.dc.html, role=student screen=assignments.
  const railItems = useMemo(() => {
    const owed = rows.filter((a) => a.stKey === "due" || a.stKey === "overdue");

    // ── 1. Most urgent ──
    // Overdue first, then soonest due. `rows` is already sorted by due date,
    // so the first overdue row IS the most overdue.
    const urgent = owed.find((a) => a.stKey === "overdue") || owed[0];
    const callout = urgent ? {
      kind: "callout",
      tone: urgent.stKey === "overdue" ? "danger" : "warning",
      kicker: "Most urgent",
      title: urgent.title,
      // "Late submissions are still accepted" is TRUE here and worth saying:
      // SubmitAssignmentView has no due-date gate, and the teacher's roster
      // labels a late row "Late" rather than refusing it. Only claimed for
      // work that is actually overdue.
      text: [
        [urgent.subjectName, urgent.due_date ? `due ${fmtDue(urgent.due_date)}` : null]
          .filter(Boolean).join(", ") + ".",
        urgent.stKey === "overdue" ? "Late submissions are still accepted." : null,
      ].filter(Boolean).join(" "),
      btn: {
        label: "Open assignment",
        onClick: () => urgent.subjectId &&
          navigate(`/subjects/${urgent.subjectId}/assignments/${urgent.id}`),
        disabled: !urgent.subjectId,
      },
    } : null;

    // ── 2. At a glance ──
    const weekEnd = new Date();
    weekEnd.setHours(23, 59, 59, 999);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const dueThisWeek = owed.filter(
      (a) => a.due_date && new Date(a.due_date) <= weekEnd
    ).length;
    const waiting = rows.filter((a) => a.stKey === "submitted").length;

    const graded = rows.filter(
      (a) => a.stKey === "graded" &&
        typeof a.marks_obtained === "number" && a.max_marks
    );
    const avg = graded.length
      ? Math.round(
          (graded.reduce((n, a) => n + a.marks_obtained / a.max_marks, 0) / graded.length) * 100
        )
      : null;

    const glance = {
      kind: "card",
      title: "At a glance",
      kv: [
        { k: "Overdue", v: String(rows.filter((a) => a.stKey === "overdue").length),
          tone: rows.some((a) => a.stKey === "overdue") ? "danger" : undefined },
        { k: "Due this week", v: String(dueThisWeek), tone: dueThisWeek > 0 ? "warning" : undefined },
        { k: "Waiting for marks", v: String(waiting) },
        avg === null
          // Averaging nothing is 0%, which reads as "you scored zero".
          ? { k: "Average marks", unavailable: true,
              reason: "Nothing has been marked yet." }
          // Averaged as a RATIO per assignment, not raw marks: a 10-mark and
          // a 100-mark assignment must weigh the same. Same trap as the quiz
          // rail's average_score.
          : { k: "Average marks", v: `${avg}%`, tone: avg >= 70 ? "success" : avg >= 50 ? "warning" : "danger" },
      ],
    };

    return [callout, glance];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, navigate]);

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

        {/* The design specifies a segmented control WITH counts, not a
            <select>. A select hides every option until opened, so the learner
            could not see at a glance that one thing was overdue — which is
            the single most useful number on this screen. */}
        <div className="ac-seg" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`ac-seg__btn${statusFilter === f ? " is-active" : ""}`}
              onClick={() => setStatusFilter(f)}
              aria-pressed={statusFilter === f}
            >
              {f}
              <span className="ac-seg__count">{statusCounts[f] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ac-railLayout">
      <section className="ac-listCard">
        <div className="ac-list ac-list--twoCol">
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
            sections.map((sec) => (
              <Fragment key={sec.key}>
                {/* One section means the heading says nothing the list does
                    not already — skip it rather than print a lone "To do". */}
                {sections.length > 1 && (
                  <div className="ac-sectionHead ac-sectionHead--full">
                    <span>{sec.label}</span>
                    <span className="ac-sectionCount">{sec.count}</span>
                  </div>
                )}
                {sec.items.map((a) => (
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
                  // Guard subjectId. The legacy fan-out fallback only fires
                  // when EVERY row lacks subject_id, so a MIXED response left
                  // individual rows undefined — and template-interpolating
                  // that produced a literal "/subjects/undefined/assignments/…"
                  // URL. It rendered (the detail page keys off the assignment
                  // id) but poisoned everything downstream: the breadcrumb
                  // read "Subjects › Undefined › Assignments", and the detail
                  // page's Back link fed "undefined" straight back in, since
                  // the STRING "undefined" is truthy.
                  disabled={!a.subjectId}
                  onClick={() => {
                    if (!a.subjectId) return;
                    navigate(`/subjects/${a.subjectId}/assignments/${a.id}`);
                  }}
                >
                  {/* "graded", not "submitted". stKey is exclusive — a graded
                      assignment never has stKey "submitted" — so the old test
                      promised Feedback in the ONE state where none can exist
                      yet, and said "Open" once the feedback was actually
                      there. */}
                  {a.stKey === "graded" ? "Feedback" : "Open"}
                </button>
              </div>
                ))}
              </Fragment>
            ))
          )}
        </div>
      </section>

      {/* Derived from the SAME `rows` the list renders, so the rail follows
          the active subject and status filters. */}
      <AcademyRail items={railItems} />
      </div>
    </div>
  );
}
