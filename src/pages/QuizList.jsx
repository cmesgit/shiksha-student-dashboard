import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api/apiClient";
import QuizCard from "../components/QuizCard";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import "../styles/quiz.css";

export default function QuizList() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tab || "pending");
  const [pendingQuizzes, setPendingQuizzes] = useState([]);
  const [completedQuizzes, setCompletedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  // Track which quizzes have an in-progress attempt in localStorage
  const [inProgressIds, setInProgressIds] = useState(() => {
    const ids = new Set();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Keys are: quiz_<quizId>_start
      const match = key?.match(/^quiz_(.+)_start$/);
      if (match) ids.add(match[1]);
    }
    return ids;
  });

  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    if (!subjectId) return;

    async function fetchQuizzes() {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get("/student/quizzes/", { params: { subject: subjectId } });

        const pending = [];
        const completed = [];

        res.data.forEach((quiz) => {
          // status comes from backend: "SUBMITTED" | "PENDING" | "NOT_STARTED"
          // also check attempts_count as a fallback in case status is wrong
          const isDone = quiz.status === "SUBMITTED" || quiz.attempts_count > 0;
          if (isDone) {
            completed.push(quiz);
          } else {
            pending.push(quiz);
          }
        });

        setPendingQuizzes(pending);
        setCompletedQuizzes(completed);
      } catch (err) {
        console.error("Failed to fetch quizzes:", err);
        setError("Failed to load quizzes.");
      } finally {
        setLoading(false);
      }
    }

    fetchQuizzes();
  }, [subjectId]);

  const quizzes = activeTab === "pending" ? pendingQuizzes : completedQuizzes;

  const handleQuizClick = (quiz) => {
    if (activeTab === "completed") {
      // Review past attempts or re-attempt from the attempts page
      navigate(`/subjects/quiz/${subjectId}/attempts/${quiz.id}`);
      return;
    }
    const path = quiz.quiz_type === "practice" ? "practice" : "take";
    // Pending tab
    const alreadyStarted = !!localStorage.getItem(`quiz_${quiz.id}_start`);
    if (alreadyStarted && quiz.quiz_type !== "practice") {
      // Resume in-progress attempt — skip modal (mock exams only; practice
      // has no timer/localStorage state to resume from).
      navigate(`/subjects/quiz/${subjectId}/${path}/${quiz.id}`);
      return;
    }
    // Fresh start or re-attempt — show confirmation modal
    setSelectedQuiz(quiz);
    setShowModal(true);
  };

  const confirmStartQuiz = () => {
    const path = selectedQuiz.quiz_type === "practice" ? "practice" : "take";
    navigate(`/subjects/quiz/${subjectId}/${path}/${selectedQuiz.id}`);
    setShowModal(false);
  };

  // Refresh in-progress set (e.g. after returning from a quiz)
  useEffect(() => {
    const ids = new Set();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const match = key?.match(/^quiz_(.+)_start$/);
      if (match) ids.add(match[1]);
    }
    setInProgressIds(ids);
  }, [activeTab]);

  if (loading) return <LoadingState label="Loading quizzes" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="quizListPage">
      <button className="quizBackHeader" onClick={() => navigate("/subjects/quiz")}>
        &lt; Back
      </button>

      <div className="quizListHeaderBox">
        <div className="quizListHeaderRow">
          <h2 className="quizListTitle">Quizzes</h2>
        </div>

        <div className="quizTabs">
          <button
            className={`quizTab ${activeTab === "pending" ? "quizTabActive" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending ({pendingQuizzes.length})
          </button>
          <button
            className={`quizTab ${activeTab === "completed" ? "quizTabActive" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            Completed ({completedQuizzes.length})
          </button>
        </div>
      </div>

      <div className="quizListBodyBox">
        <div className="quizGrid">
          {(() => {
            return quizzes.length === 0 ? (
              <EmptyState
                plain
                icon="quiz"
                title={activeTab === "pending" ? "No pending quizzes" : "No completed quizzes yet"}
                message={
                  activeTab === "pending"
                    ? "New quizzes will appear here. Finished ones move to the Completed tab, where you can re-attempt them."
                    : "Quizzes you finish will be listed here so you can review or re-attempt them."
                }
              />
            ) : (
              quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  title={quiz.title}
                  teacher={quiz.teacher_name}
                  deadline={`${quiz.questions_count ?? "?"} questions • ${
                    quiz.quiz_type === "practice" ? "untimed" : `${quiz.time_limit_minutes ?? "?"} min`
                  }`}
                  mode={quiz.quiz_type === "practice" ? "Practice" : "Mock"}
                  isCompleted={activeTab === "completed"}
                  inProgress={activeTab === "pending" && quiz.quiz_type !== "practice" && inProgressIds.has(quiz.id)}
                  // Show attempt count badge for completed quizzes
                  badge={activeTab === "completed" && quiz.attempts_count > 1
                    ? `${quiz.attempts_count} attempts`
                    : null}
                  scoreLabel={activeTab === "completed" && quiz.score != null
                    ? `${quiz.score}/${quiz.total_marks}`
                    : null}
                  onClick={() => handleQuizClick(quiz)}
                />
              ))
            );
          })()}
        </div>
      </div>

      {/* Start quiz confirmation modal */}
      {showModal && (
        <div className="quizModalOverlay">
          <div className="quizModalBox">
            <h3>{selectedQuiz?.quiz_type === "practice" ? "Start Practice?" : "Start Quiz?"}</h3>
            <p>
              You are about to start <b>{selectedQuiz?.title}</b>
            </p>
            {selectedQuiz?.quiz_type === "practice" ? (
              <ul className="quizModalRules">
                <li>🕊 Untimed — go at your own pace</li>
                <li>💡 Instant feedback + explanation after every question</li>
                <li>🔥 Build a streak by answering correctly in a row</li>
                <li>🔁 You can re-attempt anytime</li>
              </ul>
            ) : (
              <ul className="quizModalRules">
                <li>⏱ Timer starts immediately and cannot be paused</li>
                <li>📝 Unanswered questions are scored 0</li>
                <li>🔁 You can re-attempt after submitting</li>
                <li>✅ Results are shown immediately after submission</li>
              </ul>
            )}
            <div className="quizModalActions">
              <button className="startBtn" onClick={confirmStartQuiz}>
                Start
              </button>
              <button className="cancelBtn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
