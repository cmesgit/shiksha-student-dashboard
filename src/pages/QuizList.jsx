// src/pages/QuizList.jsx
// ──────────────────────────────────────────────────────────────────────────
// Academy "Quizzes" — one flat, subject-filterable list of every quiz across
// the learner's subjects. Matches the design handoff's Quizzes screen
// (Academy Dashboard.dc.html, section 12): a subject-pill filter row on the
// left, a Pending/Completed status control pushed to the right margin (same
// pattern as Assignments), then a card grid — chip + title + meta, then an
// action.
//
// There is deliberately NO subject-picker step any more (the old
// SubjectsQuiz.jsx). This follows the precedent already set by
// SubjectsAssignments.jsx: one flat list, subjects filtered client-side by
// pill. The route still accepts an optional :subjectId so older deep links
// (and the Dashboard's per-quiz links) keep working — it just preselects
// that subject's pill instead of scoping the fetch.
//
// Data: ONE request, GET /student/quizzes/ with no `subject` param, returns
// every published quiz across every course this learner profile is
// subscribed to. Subject pills are derived from that same response (only
// subjects that actually have a quiz get a pill) rather than a second
// request to /student/quiz-subjects/.
//
// Quizzes have no due date (product decision: a quiz stays attemptable
// indefinitely once published) — the Pending/Completed split is purely
// attempt-state (has the learner submitted it?), never a calendar date.
// ──────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api/apiClient";
import QuizCard from "../components/QuizCard";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import { subjectChipSlot } from "../utils/subjectChips";
import "../styles/academyCommon.css";
import "../styles/academyScreens.css";
import "../styles/quiz.css";

function readInProgressIds() {
  const ids = new Set();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // Keys are: quiz_<quizId>_start
    const match = key?.match(/^quiz_(.+)_start$/);
    if (match) ids.add(match[1]);
  }
  return ids;
}

export default function QuizList() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tab || "pending");
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // "" = All subjects. Seeded from the route so a deep link preselects.
  const [subjectFilter, setSubjectFilter] = useState(subjectId ? String(subjectId) : "");

  const [showModal, setShowModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  // Which quizzes have an in-progress (mock) attempt sitting in localStorage.
  const [inProgressIds, setInProgressIds] = useState(readInProgressIds);

  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    setSubjectFilter(subjectId ? String(subjectId) : "");
  }, [subjectId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuizzes() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/student/quizzes/");
        if (cancelled) return;
        setQuizzes(res.data || []);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch quizzes:", err);
        setError("Failed to load quizzes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchQuizzes();
    return () => { cancelled = true; };
  }, []);

  // Refresh the in-progress set whenever the tab changes (e.g. after
  // returning from a quiz).
  useEffect(() => {
    setInProgressIds(readInProgressIds());
  }, [activeTab]);

  // status comes from backend: "SUBMITTED" | "PENDING" | "NOT_STARTED"; also
  // check attempts_count as a fallback in case status is wrong.
  const decorated = useMemo(
    () =>
      quizzes.map((q) => ({
        ...q,
        isDone: q.status === "SUBMITTED" || q.attempts_count > 0,
      })),
    [quizzes]
  );

  const pendingQuizzes = useMemo(() => decorated.filter((q) => !q.isDone), [decorated]);
  const completedQuizzes = useMemo(() => decorated.filter((q) => q.isDone), [decorated]);

  // Only offer a pill for subjects that actually have a quiz.
  const subjectPills = useMemo(() => {
    const seen = new Map();
    decorated.forEach((q) => {
      if (q.subject_id && !seen.has(String(q.subject_id))) {
        seen.set(String(q.subject_id), q.subject_name || "Subject");
      }
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [decorated]);

  const bySubject = (list) =>
    subjectFilter ? list.filter((q) => String(q.subject_id) === subjectFilter) : list;

  const visibleQuizzes = bySubject(activeTab === "pending" ? pendingQuizzes : completedQuizzes);

  const handleQuizClick = (quiz) => {
    if (activeTab === "completed") {
      // Review past attempts or re-attempt from the attempts page.
      navigate(`/subjects/quiz/${quiz.subject_id}/attempts/${quiz.id}`);
      return;
    }
    const path = quiz.quiz_type === "practice" ? "practice" : "take";
    const alreadyStarted = !!localStorage.getItem(`quiz_${quiz.id}_start`);
    if (alreadyStarted && quiz.quiz_type !== "practice") {
      // Resume in-progress attempt — skip the modal (mock exams only;
      // practice has no timer/localStorage state to resume from).
      navigate(`/subjects/quiz/${quiz.subject_id}/${path}/${quiz.id}`);
      return;
    }
    // Fresh start or re-attempt — show the confirmation modal.
    setSelectedQuiz(quiz);
    setShowModal(true);
  };

  const confirmStartQuiz = () => {
    const path = selectedQuiz.quiz_type === "practice" ? "practice" : "take";
    navigate(`/subjects/quiz/${selectedQuiz.subject_id}/${path}/${selectedQuiz.id}`);
    setShowModal(false);
  };

  if (loading) return <div className="ac-screen"><LoadingState label="Loading quizzes" /></div>;
  if (error) return <div className="ac-screen"><ErrorState message={error} /></div>;

  const headSub = decorated.length
    ? `${pendingQuizzes.length} pending · ${completedQuizzes.length} completed.`
    : "Quizzes your teachers publish will show up here.";

  return (
    <div className="ac-screen">
      <div className="ac-head">
        <div>
          <h1 className="ac-head__title">Quizzes</h1>
          <p className="ac-head__sub">{headSub}</p>
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
          {subjectPills.map((s) => (
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
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="pending">Pending ({bySubject(pendingQuizzes).length})</option>
          <option value="completed">Completed ({bySubject(completedQuizzes).length})</option>
        </select>
      </div>

      {visibleQuizzes.length === 0 ? (
        <section className="ac-listCard">
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
        </section>
      ) : (
        <div className="ac-cardGrid">
          {visibleQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              subject={quiz.subject_name}
              subjSlot={subjectChipSlot(quiz.subject_name)}
              title={quiz.title}
              teacher={quiz.teacher_name}
              deadline={`${quiz.questions_count ?? "?"} questions • ${
                quiz.quiz_type === "practice" ? "untimed" : `${quiz.time_limit_minutes ?? "?"} min`
              }`}
              mode={quiz.quiz_type === "practice" ? "Practice" : "Mock"}
              isCompleted={activeTab === "completed"}
              inProgress={activeTab === "pending" && quiz.quiz_type !== "practice" && inProgressIds.has(quiz.id)}
              badge={activeTab === "completed" && quiz.attempts_count > 1
                ? `${quiz.attempts_count} attempts`
                : null}
              scoreLabel={activeTab === "completed" && quiz.score != null
                ? `${quiz.score}/${quiz.total_marks}`
                : null}
              onClick={() => handleQuizClick(quiz)}
            />
          ))}
        </div>
      )}

      {/* Start-quiz confirmation modal — design handoff section 12: "Start
          quiz opens a modal warning of the time limit ... with its own
          Start quiz confirm." */}
      {showModal && (
        <div className="quizModalOverlay" onClick={() => setShowModal(false)}>
          <div className="quizModalBox" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedQuiz?.quiz_type === "practice" ? "Start Practice?" : "Start Quiz?"}</h3>
            <p>
              You are about to start <b>{selectedQuiz?.title}</b>
            </p>
            {selectedQuiz?.quiz_type === "practice" ? (
              <ul className="quizModalRules">
                <li>Untimed — go at your own pace</li>
                <li>Instant feedback + explanation after every question</li>
                <li>Build a streak by answering correctly in a row</li>
                <li>You can re-attempt anytime</li>
              </ul>
            ) : (
              <ul className="quizModalRules">
                <li>Timer starts immediately and cannot be paused</li>
                <li>Unanswered questions are scored 0</li>
                <li>You can re-attempt after submitting</li>
                <li>Results are shown immediately after submission</li>
              </ul>
            )}
            <div className="quizModalActions">
              <button className="cancelBtn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="startBtn" onClick={confirmStartQuiz}>
                Start quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
