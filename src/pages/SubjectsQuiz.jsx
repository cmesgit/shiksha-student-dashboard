import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../api/apiClient";
import SubjectCard from "../components/SubjectCard";
import PageHeader from "../components/PageHeader";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import "../styles/subjects.css";

export default function SubjectsQuiz() {
  const navigate = useNavigate();

  const [subjectData, setSubjectData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizCounts, setQuizCounts] = useState({});
  const [quizCountsReady, setQuizCountsReady] = useState(false);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/student/quiz-subjects/");
        setSubjectData(res.data);
      } catch (err) {
        console.error("Failed to fetch quiz subjects:", err);
        setError("Failed to load quiz subjects.");
        setSubjectData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSubjects();
  }, []);

  useEffect(() => {
    if (subjectData.length === 0) return;

    async function fetchQuizCounts() {
      const results = await Promise.allSettled(
        subjectData.map(async (item) => {
          const res = await api.get("/student/quizzes/", { params: { subject: item.id } });
          const quizzes = res.data || [];
          const pending = quizzes.filter((q) => q.status !== "SUBMITTED" && !(q.attempts_count > 0)).length;
          const completed = quizzes.filter((q) => q.status === "SUBMITTED" || q.attempts_count > 0).length;
          return { id: item.id, pending, completed };
        })
      );
      const counts = {};
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          counts[result.value.id] = { pending: result.value.pending, completed: result.value.completed };
        }
      });
      setQuizCounts(counts);
      setQuizCountsReady(true);
    }

    fetchQuizCounts();
  }, [subjectData]);

  if (loading) return <LoadingState label="Loading quizzes" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="subjectsPage">
      <div className="subjectsHeaderBox">
        <PageHeader title="Quiz" />
      </div>

      <div className="subjectsBodyBox">
        <div className="subjectsGrid">
          {subjectData.length === 0 ? (
            <EmptyState
              plain
              icon="quiz"
              title="No quizzes yet"
              message="When your teachers add quizzes, the subjects will show up here."
            />
          ) : (
            subjectData.map((item) => (
              <SubjectCard
                key={item.id}
                subject={item.subject}
                teacher={item.teacher}
                pendingCount={quizCountsReady ? (quizCounts[item.id]?.pending ?? 0) : undefined}
                taskCount={quizCountsReady ? (quizCounts[item.id]?.completed ?? 0) : undefined}
                taskLabel="completed"
                onClick={() => navigate(`/subjects/quiz/${item.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}