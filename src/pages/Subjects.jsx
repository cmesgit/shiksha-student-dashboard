import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCourse } from "../contexts/CourseContext";
import api from "../api/apiClient";
import SubjectCard from "../components/SubjectCard";
import PageHeader from "../components/PageHeader";
import { LoadingState, EmptyState } from "../components/StateViews";
import "../styles/subjects.css";

export default function Subjects() {
  const navigate = useNavigate();
  const { activeCourse, loading: courseLoading } = useCourse();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [taskCounts, setTaskCounts] = useState({});
  const [taskCountsReady, setTaskCountsReady] = useState(false);
  // keyed by subject id -> { percent, chapters_done, chapters_total }
  const [progressBySubject, setProgressBySubject] = useState({});

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (courseLoading) return;

    if (!activeCourse) {
      setSubjects([]);
      setLoading(false);
      return;
    }

    async function fetchSubjects() {
      try {
        const res = await api.get(`/courses/${activeCourse.id}/subjects/`);
        setSubjects(res.data);
      } catch (err) {
        console.error("Failed to load subjects", err);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSubjects();
  }, [activeCourse, courseLoading]);

  // Per-subject chapter-coverage percent — same data Progress.jsx uses,
  // merged inline here so a subject's progress is visible without a
  // separate trip to /my-courses/:id/progress.
  useEffect(() => {
    if (!activeCourse) { setProgressBySubject({}); return; }

    async function fetchProgress() {
      try {
        const res = await api.get("/courses/my-batch-progress/", {
          params: { course: activeCourse.id },
        });
        const bySubject = {};
        (res.data?.subjects || []).forEach((s) => {
          bySubject[s.id] = {
            percent: s.percent,
            chapters_done: s.chapters_done,
            chapters_total: s.chapters_total,
          };
        });
        setProgressBySubject(bySubject);
      } catch (err) {
        console.error("Failed to load subject progress", err);
        setProgressBySubject({});
      }
    }

    fetchProgress();
  }, [activeCourse]);

  // Per-subject assignment pending/completed counts.
  useEffect(() => {
    if (subjects.length === 0) return;

    async function fetchTaskCounts() {
      const results = await Promise.allSettled(
        subjects.map(async (subject) => {
          const res = await api.get(`/assignments/subject/${subject.id}/`);
          const assignments = res.data || [];
          const pending = assignments.filter((a) => a.status !== "SUBMITTED").length;
          const completed = assignments.filter((a) => a.status === "SUBMITTED").length;
          return { id: subject.id, pending, completed };
        })
      );
      const counts = {};
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          counts[result.value.id] = { pending: result.value.pending, completed: result.value.completed };
        }
      });
      setTaskCounts(counts);
      setTaskCountsReady(true);
    }

    fetchTaskCounts();
  }, [subjects]);

  if (loading) return <LoadingState label="Loading subjects" />;
  if (!activeCourse)
    return (
      <EmptyState
        icon="book"
        title="No course selected"
        message="Enrol in a course to see its subjects, assignments, and progress."
        action={{ label: "Browse courses", to: "/browse-courses", icon: "search" }}
      />
    );

  return (
    <div className="subjectsPage">
      <div className="subjectsHeaderBox">
        <div>
          <PageHeader title="Subjects" />
          <p className="subjectsSub">Your syllabus coverage, subject by subject.</p>
        </div>
        <Link to={`/my-courses/${activeCourse.id}/progress`} className="subjectsFullProgressLink">
          View full progress →
        </Link>
      </div>

      <div className="subjectsBodyBox">
        <div className="subjectsGrid">
          {filteredSubjects.length === 0 ? (
            <EmptyState
              plain
              icon="book"
              title="No subjects yet"
              message="Subjects for this course will show up here once they're added."
            />
          ) : (
            filteredSubjects.map((subject) => {
              const progress = progressBySubject[subject.id];
              return (
                <SubjectCard
                  key={subject.id}
                  subject={subject.name}
                  teacher={
                    subject.teachers?.length
                      ? subject.teachers.map((t) => t.name).join(", ")
                      : "No teacher assigned"
                  }
                  progressPercent={progress?.percent}
                  chaptersDone={progress?.chapters_done}
                  chaptersTotal={progress?.chapters_total}
                  pendingCount={taskCountsReady ? (taskCounts[subject.id]?.pending ?? 0) : undefined}
                  actionLabel="Open"
                  onClick={() => navigate(`/subjects/${subject.id}`)}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
