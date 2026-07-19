/**
 * AssignmentsSubjects.jsx — top-level "Assignments" landing.
 *
 * The Academy Dashboard.html sidebar promotes Assignments to a first-class
 * nav item. Assignments live per subject, so this picker lists the active
 * course's subjects (with pending/completed counts) and fans out to the
 * existing per-subject list at /subjects/:subjectId/assignments — the same
 * pattern SubjectsQuiz uses for quizzes. Replaces the old /subjects redirect.
 */
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCourse } from "../contexts/CourseContext";
import api from "../api/apiClient";
import SubjectCard from "../components/SubjectCard";
import PageHeader from "../components/PageHeader";
import { LoadingState, EmptyState } from "../components/StateViews";
import "../styles/subjects.css";

export default function AssignmentsSubjects() {
  const navigate = useNavigate();
  const { activeCourse, loading: courseLoading } = useCourse();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({});
  const [countsReady, setCountsReady] = useState(false);

  useEffect(() => {
    if (courseLoading) return;
    if (!activeCourse) { setSubjects([]); setLoading(false); return; }

    let alive = true;
    (async () => {
      try {
        const res = await api.get(`/courses/${activeCourse.id}/subjects/`);
        if (alive) setSubjects(res.data || []);
      } catch (err) {
        console.error("Failed to load subjects", err);
        if (alive) setSubjects([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [activeCourse, courseLoading]);

  useEffect(() => {
    if (subjects.length === 0) return;
    let alive = true;
    (async () => {
      const results = await Promise.allSettled(
        subjects.map(async (subject) => {
          const res = await api.get(`/assignments/subject/${subject.id}/`);
          const assignments = res.data || [];
          const pending = assignments.filter((a) => a.status !== "SUBMITTED").length;
          const completed = assignments.filter((a) => a.status === "SUBMITTED").length;
          return { id: subject.id, pending, completed };
        })
      );
      if (!alive) return;
      const map = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") map[r.value.id] = { pending: r.value.pending, completed: r.value.completed };
      });
      setCounts(map);
      setCountsReady(true);
    })();
    return () => { alive = false; };
  }, [subjects]);

  if (loading) return <LoadingState label="Loading assignments" />;
  if (!activeCourse)
    return (
      <EmptyState
        icon="book"
        title="No course selected"
        message="Enrol in a course to see its subjects and assignments."
        action={{ label: "Browse courses", to: "/browse-courses", icon: "search" }}
      />
    );

  return (
    <div className="subjectsPage">
      <div className="subjectsHeaderBox">
        <PageHeader title="Assignments" />
      </div>

      <div className="subjectsBodyBox">
        <div className="subjectsGrid">
          {subjects.length === 0 ? (
            <EmptyState
              plain
              icon="assignment"
              title="No assignments yet"
              message="When your teachers add assignments, the subjects will show up here."
            />
          ) : (
            subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                img={subject.image || "/images/default.png"}
                subject={subject.name}
                teacher={
                  subject.teachers?.length
                    ? subject.teachers.map((t) => t.name).join(", ")
                    : "No teacher assigned"
                }
                pendingCount={countsReady ? (counts[subject.id]?.pending ?? 0) : undefined}
                completedCount={countsReady ? (counts[subject.id]?.completed ?? 0) : undefined}
                onClick={() => navigate(`/subjects/${subject.id}/assignments`)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
