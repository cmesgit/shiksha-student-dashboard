import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/apiClient";
import { useCourse } from "../contexts/CourseContext";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import { subjectChipSlot } from "../utils/subjectChips";
import "../styles/academyCommon.css";
import "../styles/assignmentPending.css";

const STATUS_FILTERS = ["All", "Due", "Overdue", "Submitted"];

const fmtDue = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "";

export default function SubjectsAssignments() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const { subjects } = useCourse();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    if (!subjectId) return;

    async function fetchAssignments() {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/assignments/subject/${subjectId}/`);
        setAssignments(res.data || []);
      } catch (err) {
        console.error("Assignment fetch error:", err);
        setError("Failed to load assignments.");
      } finally {
        setLoading(false);
      }
    }

    fetchAssignments();
  }, [subjectId]);

  // Reset the status filter whenever the student jumps to a different
  // subject's assignment list.
  useEffect(() => {
    setStatusFilter("All");
  }, [subjectId]);

  const now = Date.now();

  const rows = useMemo(() => {
    return assignments
      .map((a) => {
        const isSubmitted = a.status === "SUBMITTED";
        const isOverdue = !isSubmitted && a.due_date && new Date(a.due_date).getTime() < now;
        const stKey = isSubmitted ? "submitted" : isOverdue ? "overdue" : "due";
        return {
          ...a,
          stKey,
          stLabel:
            stKey === "submitted"
              ? "Submitted"
              : stKey === "overdue"
              ? "Overdue"
              : `Due ${fmtDue(a.due_date)}`,
        };
      })
      .filter((a) => statusFilter === "All" || a.stKey === statusFilter.toLowerCase());
  }, [assignments, statusFilter, now]);

  const currentSubjectName =
    subjects?.find((s) => String(s.id) === String(subjectId))?.name ||
    assignments[0]?.subject ||
    "";

  if (loading) return <LoadingState label="Loading assignments" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="ac-page">
      <button type="button" className="asg-back" onClick={() => navigate("/assignments")}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Assignments
      </button>

      <div className="ac-page__head">
        <h1 className="ac-page__title">Assignments</h1>
        <p className="ac-page__sub">
          {currentSubjectName ? `${currentSubjectName} · ` : ""}
          Everything due, overdue and already submitted.
        </p>
      </div>

      <div className="asg-filterRow">
        <div className="asg-pills">
          <button
            type="button"
            className="asg-pill"
            onClick={() => navigate("/assignments")}
          >
            All
          </button>
          {(subjects || []).map((s) => (
            <button
              key={s.id}
              type="button"
              className={`asg-pill ${String(s.id) === String(subjectId) ? "asg-pill--active" : ""}`}
              onClick={() => navigate(`/subjects/${s.id}/assignments`)}
            >
              {s.name}
            </button>
          ))}
        </div>

        <select
          className="asg-statusSelect"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <section className="asg-listCard">
        <div className="asg-list">
          {rows.length === 0 && (
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
          )}

          {rows.map((a) => (
            <div key={a.id} className="asg-row">
              <div className="asg-row__main">
                <div className="asg-row__tags">
                  <span className={`asg-chip asg-chip--${subjectChipSlot(a.subject)}`}>
                    {a.subject}
                  </span>
                  <span className={`asg-statusChip asg-statusChip--${a.stKey}`}>
                    {a.stLabel}
                  </span>
                </div>
                <div className="asg-row__title">{a.title}</div>
                {a.teacher && <div className="asg-row__meta">{a.teacher}</div>}
              </div>
              <button
                type="button"
                className="asg-openBtn"
                onClick={() => navigate(`/subjects/${subjectId}/assignments/${a.id}`)}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
