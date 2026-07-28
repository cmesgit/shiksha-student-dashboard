import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/apiClient";
import { LoadingState } from "../components/StateViews";
import "../styles/quiz-practice.css";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];
const DIFF_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function QuizPractice() {
  const navigate = useNavigate();
  const { subjectId, quizId } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null); // { is_correct, correct_choice, explanation }
  const [checking, setChecking] = useState(false);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  const answersRef = useRef([]); // accumulated { question, selected_choice, time_spent, marked_for_review }
  const questionStartRef = useRef(Date.now());

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);
        try {
          await api.post(`/quizzes/${quizId}/start/`);
        } catch (err) {
          const msg = err.response?.data?.detail;
          if (msg) { setError(msg); setLoading(false); return; }
        }
        const res = await api.get(`/quizzes/${quizId}/`);
        setQuiz(res.data);
        questionStartRef.current = Date.now();
      } catch (err) {
        setError(err.response?.data?.detail || "Unable to load this practice set.");
      } finally {
        setLoading(false);
      }
    }
    if (quizId) init();
  }, [quizId]);

  if (loading) return <LoadingState label="Loading practice set" />;
  if (error) return <div className="qp-center qp-error">{error}</div>;
  if (!quiz || !quiz.questions?.length) return null;

  const questions = quiz.questions;
  const q = questions[index];
  const total = questions.length;
  const progressPct = Math.round((index / total) * 100);

  const handleSelect = async (choiceId) => {
    if (feedback || checking) return; // already answered this one
    setSelected(choiceId);
    setChecking(true);
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000);
    try {
      const res = await api.post(
        `/quizzes/${quizId}/questions/${q.id}/check/`,
        { selected_choice: choiceId, time_spent: timeSpent }
      );
      setFeedback(res.data);
      answersRef.current.push({
        question: q.id,
        selected_choice: choiceId,
        time_spent: timeSpent,
      });
      if (res.data.is_correct) {
        setStreak((s) => s + 1);
        setCorrectCount((c) => c + 1);
      } else {
        setStreak(0);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't check that answer — try again.");
      setSelected(null);
    } finally {
      setChecking(false);
    }
  };

  const goNext = async () => {
    if (index === total - 1) {
      await handleFinish();
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setFeedback(null);
    questionStartRef.current = Date.now();
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await api.post(`/student/quizzes/${quizId}/submit/`, {
        answers: answersRef.current,
      });
      navigate(`/subjects/quiz/${subjectId}/result/${quizId}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't submit your practice session.");
      setFinishing(false);
    }
  };

  const endSession = () => {
    navigate(`/subjects/quiz/${subjectId}`);
  };

  return (
    <div className="qp-page">
      <div className="qp-topbar">
        <div className="qp-progress-wrap">
          <div className="qp-progress-labels">
            <span>Question {index + 1} of {total}</span>
            <span>Practice · untimed</span>
          </div>
          <div className="qp-progress-track">
            <div className="qp-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className={`qp-streak ${streak >= 3 ? "qp-streak--hot" : ""}`}>
          🔥 {streak}
        </div>
      </div>

      <div className="qp-card">
        <div className="qp-chips">
          {q.topic && <span className="qp-chip qp-chip--topic">{q.topic}</span>}
          <span className={`qp-chip qp-chip--diff qp-chip--${q.difficulty}`}>
            {DIFF_LABEL[q.difficulty] || q.difficulty}
          </span>
        </div>
        <div className="qp-question-text">{q.text}</div>

        <div className="qp-choices">
          {q.choices.map((c, ci) => {
            let cls = "qp-choice";
            if (feedback) {
              if (c.id === feedback.correct_choice?.id) cls += " qp-choice--correct";
              else if (c.id === selected) cls += " qp-choice--wrong";
              else cls += " qp-choice--disabled";
            } else if (c.id === selected) {
              cls += " qp-choice--selected";
            }
            return (
              <div key={c.id} className={cls} onClick={() => handleSelect(c.id)}>
                <span className="qp-choice-key">{OPTION_LABELS[ci]}</span>
                <span className="qp-choice-text">{c.text}</span>
                {feedback && c.id === feedback.correct_choice?.id && <span className="qp-choice-mark">✓</span>}
                {feedback && c.id === selected && !feedback.is_correct && <span className="qp-choice-mark">✕</span>}
              </div>
            );
          })}
        </div>

        {feedback && (
          <div className={`qp-feedback ${feedback.is_correct ? "qp-feedback--correct" : "qp-feedback--wrong"}`}>
            <div className="qp-feedback-title">
              {feedback.is_correct ? "Correct! 🎉" : "Not quite."}
            </div>
            {feedback.explanation && (
              <div className="qp-feedback-explanation">{feedback.explanation}</div>
            )}
          </div>
        )}

        {error && <div className="qp-inline-error">{error}</div>}
      </div>

      <div className="qp-footer">
        <button className="qp-end-btn" onClick={() => setShowEndModal(true)}>End session</button>
        {feedback && (
          <button className="qp-next-btn" onClick={goNext} disabled={finishing}>
            {finishing
              ? "Finishing…"
              : index === total - 1
                ? "Finish → Results"
                : "Next question →"}
          </button>
        )}
      </div>

      {showEndModal && (
        <div className="qp-modal-overlay">
          <div className="qp-modal-box">
            <h3>End practice session?</h3>
            <p>
              You've answered {index} of {total} questions so far. Your progress is saved —
              you can view it on the results screen or resume this set any time.
            </p>
            <div className="qp-modal-actions">
              <button className="qp-btn-cancel" onClick={() => setShowEndModal(false)}>Keep practicing</button>
              <button className="qp-btn-exit" onClick={endSession}>End session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
