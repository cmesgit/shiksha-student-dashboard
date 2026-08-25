import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiChevronLeft, FiRefreshCw } from "react-icons/fi";
import api from "../api/apiClient";
import { LoadingState } from "../components/StateViews";
import { useToast } from "../contexts/ToastContext";
import { quizHubPath, withQuizOrigin } from "../utils/quizNav";
import "../styles/quiz.css";

export default function QuizAttempts() {
  const navigate = useNavigate();
  const { subjectId, quizId } = useParams();
  const { pathname, state: navState } = useLocation();
  const { showToast } = useToast();

  const [attempts, setAttempts] = useState([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizType, setQuizType] = useState("mock");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    async function fetchAttempts() {
      try {
        setLoading(true);
        setError(null);
        // Correct student endpoint added in urls.py
        const res = await api.get(`/student/quizzes/${quizId}/attempts/`);
        setAttempts(res.data.attempts ?? res.data);
        setQuizTitle(res.data.title ?? "");
        setQuizType(res.data.quiz_type ?? "mock");
      } catch (err) {
        console.error("Failed to load attempts:", err);
        setError("Unable to load attempts.");
      } finally {
        setLoading(false);
      }
    }
    fetchAttempts();
  }, [quizId]);

  const handleReattempt = async () => {
    try {
      setStarting(true);
      // Deliberate retake — opt in, or the backend returns the existing
      // submitted attempt instead of starting a fresh one.
      await api.post(`/quizzes/${quizId}/start/`, { new_attempt: true });
      const path = quizType === "practice" ? "practice" : "take";
      navigate(`/subjects/quiz/${subjectId}/${path}/${quizId}`, {
        state: withQuizOrigin(pathname, navState),
      });
    } catch (err) {
      const msg = err.response?.data?.detail || "Unable to start reattempt.";
      showToast({ type: "error", message: msg });
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <LoadingState label="Loading attempts" />;
  if (error)   return <div className="quizResultPage">{error}</div>;

  return (
    <div className="quizResultPage">
      {/* Explicit route, not navigate(-1) — the history entry behind this
          screen is usually the attempt itself, and re-entering /take/:quizId
          starts a brand-new attempt (see the note in QuizResult.jsx). */}
      <button
        className="quizResultBack"
        onClick={() => navigate(quizHubPath(navState, subjectId))}
      >
        <FiChevronLeft aria-hidden="true" /> Back to Quizzes
      </button>

      <div className="quizAttemptsHeader">
        <h2 className="quizAttemptsTitle">{quizTitle}</h2>
        <button
          className="quizResultReattemptBtn"
          onClick={handleReattempt}
          disabled={starting}
        >
          {starting ? "Starting…" : <><FiRefreshCw aria-hidden="true" /> Re-Attempt Quiz</>}
        </button>
      </div>

      <div className="quizAttemptsTableWrapper">
        <table className="quizAttemptsTable">
          <thead>
            <tr>
              <th>Attempt</th>
              <th>Submitted On</th>
              <th>Score</th>
              <th>Accuracy</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {attempts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                  No submitted attempts yet.
                </td>
              </tr>
            ) : (
              attempts.map((attempt) => {
                const pct = attempt.total_marks
                  ? Math.round((attempt.score / attempt.total_marks) * 100)
                  : 0;
                const scoreClass =
                  pct >= 70 ? "score-high" : pct >= 40 ? "score-mid" : "score-low";

                return (
                  <tr key={attempt.id}>
                    <td>#{attempt.attempt_number}</td>
                    <td>
                      {attempt.submitted_at
                        ? new Date(attempt.submitted_at).toLocaleString()
                        : "—"}
                    </td>
                    <td>
                      <span className={`quizScorePill ${scoreClass}`}>
                        {attempt.score} / {attempt.total_marks}
                      </span>
                    </td>
                    <td>{pct}%</td>
                    <td>
                      <button
                        className="quizAttemptsReviewBtn"
                        onClick={() =>
                          navigate(
                            `/subjects/quiz/${subjectId}/result/${quizId}?attempt=${attempt.id}`,
                            { state: withQuizOrigin(pathname, navState) }
                          )
                        }
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
