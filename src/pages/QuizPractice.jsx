import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FiCheck, FiX } from "react-icons/fi";
import { TbFlame } from "react-icons/tb";
import api from "../api/apiClient";
import { LoadingState } from "../components/StateViews";
import { quizHubPath, withQuizOrigin } from "../utils/quizNav";
import "../styles/quiz-practice.css";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];
const DIFF_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function QuizPractice() {
  const navigate = useNavigate();
  const { subjectId, quizId } = useParams();
  const { pathname, state: navState } = useLocation();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null); // { is_correct, correct_choice, explanation }
  const [checking, setChecking] = useState(false);
  const [streak, setStreak] = useState(0);
  const [, setCorrectCount] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  // Kept SEPARATE from `error`. `error` is fatal and unmounts the runner
  // below; a failed answer-check is transient. Sharing one state meant a
  // single flaky check replaced the whole screen, discarding answersRef and
  // leaving the attempt PENDING forever — unsubmittable, because the Finish
  // button had gone with it, and unresumable, because CheckAnswerView 403s
  // on questions this attempt already answered.
  const [checkError, setCheckError] = useState(null);

  const answersRef = useRef([]); // accumulated { question, selected_choice, time_spent, marked_for_review }
  const questionStartRef = useRef(Date.now());

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);
        try {
          const startRes = await api.post(`/quizzes/${quizId}/start/`);
          // Same Back-button guard as QuizMock: don't reopen a finished set
          // as a new attempt.
          if (startRes.data?.already_submitted) {
            navigate(`/subjects/quiz/${subjectId}/result/${quizId}`, {
              replace: true,
              state: withQuizOrigin(pathname, navState),
            });
            return;
          }
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
    setCheckError(null);
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
      setCheckError(err.response?.data?.detail || "Couldn't check that answer — try again.");
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
      navigate(`/subjects/quiz/${subjectId}/result/${quizId}`, {
        state: withQuizOrigin(pathname, navState),
      });
    } catch (err) {
      setCheckError(err.response?.data?.detail || "Couldn't submit your practice session.");
      setFinishing(false);
    }
  };

  // Ending early SUBMITS what has been answered so far, then shows the result.
  //
  // It used to just navigate away. The attempt stayed PENDING, and
  // QuizResultView only ever looks at status=SUBMITTED — so "See result" on
  // this quiz answered 400 "No submitted attempt found." forever, which the
  // result page flattened to "Unable to load result." The modal's own copy
  // promised the opposite ("you can view it on the results screen"), and the
  // offered alternative — resuming — is also a dead end, because
  // CheckAnswerView refuses questions the attempt has already answered.
  // Submitting here is safe: practice is untimed with unlimited retakes, so
  // there is nothing punitive about banking a partial run.
  const endSession = async () => {
    setShowEndModal(false);
    // Nothing answered yet — there is no result worth minting, so leave the
    // attempt alone and just back out to the quiz list.
    if (answersRef.current.length === 0) {
      navigate(quizHubPath(navState, subjectId));
      return;
    }
    await handleFinish();
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
        <div
          className={`qp-streak ${streak >= 3 ? "qp-streak--hot" : ""}`}
          aria-label={`Streak: ${streak} correct in a row`}
        >
          <TbFlame aria-hidden="true" /> {streak}
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
                {feedback && c.id === feedback.correct_choice?.id && (
                  <span className="qp-choice-mark" aria-label="Correct answer"><FiCheck /></span>
                )}
                {feedback && c.id === selected && !feedback.is_correct && (
                  <span className="qp-choice-mark" aria-label="Your answer"><FiX /></span>
                )}
              </div>
            );
          })}
        </div>

        {feedback && (
          <div className={`qp-feedback ${feedback.is_correct ? "qp-feedback--correct" : "qp-feedback--wrong"}`}>
            <div className="qp-feedback-title">
              {feedback.is_correct
                ? <><FiCheck aria-hidden="true" /> Correct!</>
                : <><FiX aria-hidden="true" /> Not quite.</>}
            </div>
            {feedback.explanation && (
              <div className="qp-feedback-explanation">{feedback.explanation}</div>
            )}
          </div>
        )}

        {checkError && <div className="qp-inline-error">{checkError}</div>}
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
              {answersRef.current.length === 0
                ? "You haven't answered anything yet, so there's nothing to score. You can start this set again whenever you like."
                : `You've answered ${answersRef.current.length} of ${total} questions. We'll score what you've done and take you to your results — you can retake this set as often as you like.`}
            </p>
            <div className="qp-modal-actions">
              <button className="qp-btn-cancel" onClick={() => setShowEndModal(false)}>Keep practicing</button>
              <button className="qp-btn-exit" onClick={endSession} disabled={finishing}>
                {finishing
                  ? "Finishing…"
                  : answersRef.current.length === 0
                    ? "End session"
                    : "End & see results"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
