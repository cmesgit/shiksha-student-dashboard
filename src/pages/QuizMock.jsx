import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FiClock, FiFlag } from "react-icons/fi";
import api from "../api/apiClient";
import { quizHubPath, withQuizOrigin } from "../utils/quizNav";
import "../styles/quiz-mock.css";

// Redesigned timed mock-test flow — replaces QuizDetail.jsx. Ships the
// Palette layout only (Focus variant dropped per design decision): question
// card + right-hand question-grid sidebar (answered / marked-for-review /
// not-visited), a styled submit-confirmation modal instead of window.confirm,
// and per-question topic/marks display. Reuses QuizDetail.jsx's seeded
// shuffle + auto-submit + nav-guard logic, which is battle-tested.

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}
function shuffleWithSeed(arr, seed) {
  const rng = seededRandom(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function makeSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  return Math.abs(hash);
}
function getShuffledQuestions(questions, quizId, attemptKey) {
  const storageKey = `quiz_${quizId}_${attemptKey}_order`;
  let orderMap = null;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) orderMap = JSON.parse(stored);
  } catch {}
  if (!orderMap) {
    const seed = makeSeed(`${quizId}_${attemptKey}`);
    const shuffled = shuffleWithSeed(questions, seed);
    orderMap = { questionOrder: shuffled.map((q) => q.id), choiceOrders: {} };
    shuffled.forEach((q, qi) => {
      const choiceSeed = makeSeed(`${quizId}_${attemptKey}_q${q.id}_${qi}`);
      orderMap.choiceOrders[q.id] = shuffleWithSeed(q.choices, choiceSeed).map((c) => c.id);
    });
    try { localStorage.setItem(storageKey, JSON.stringify(orderMap)); } catch {}
  }
  const byId = Object.fromEntries(questions.map((q) => [q.id, q]));
  return orderMap.questionOrder
    .map((qId) => {
      const q = byId[qId];
      if (!q) return null;
      const choiceById = Object.fromEntries(q.choices.map((c) => [c.id, c]));
      const choices = orderMap.choiceOrders[q.id]?.map((cId) => choiceById[cId]).filter(Boolean) || q.choices;
      return { ...q, choices };
    })
    .filter(Boolean);
}

// ── autosave ────────────────────────────────────────────────────────────
// BUILD_GUIDE Phase 8 item 3 asks for autosave, and without it a mock attempt
// did not survive a reload: answers lived only in React state while the
// DEADLINE is server-side and keeps running. A refresh, a phone locking, or a
// tab crash therefore wiped every answer and left the clock ticking, with no
// way back. There is no server-side draft endpoint (only /submit/), so the
// draft is local — keyed per ATTEMPT, exactly like the shuffle order above, so
// a second attempt never inherits the first one's answers.
const draftKeyFor = (quizId, attemptKey) => `quiz_${quizId}_${attemptKey}_draft`;

function readDraft(quizId, attemptKey) {
  try {
    const raw = localStorage.getItem(draftKeyFor(quizId, attemptKey));
    if (!raw) return null;
    const d = JSON.parse(raw);
    return {
      answers: d.answers && typeof d.answers === "object" ? d.answers : {},
      marked: d.marked && typeof d.marked === "object" ? d.marked : {},
      visited: d.visited && typeof d.visited === "object" ? d.visited : {},
      index: Number.isInteger(d.index) ? d.index : 0,
    };
  } catch {
    return null;   // corrupt draft must never block starting the test
  }
}

function writeDraft(quizId, attemptKey, draft) {
  try {
    localStorage.setItem(draftKeyFor(quizId, attemptKey), JSON.stringify(draft));
  } catch { /* quota/private mode — the attempt still works, just not resumable */ }
}

function clearDraft(quizId, attemptKey) {
  try { localStorage.removeItem(draftKeyFor(quizId, attemptKey)); } catch { /* */ }
}

export default function QuizMock() {
  const navigate = useNavigate();
  const { subjectId, quizId } = useParams();
  const { pathname, state: navState } = useLocation();

  const [quizData, setQuizData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState({});
  const [visited, setVisited] = useState({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [quizReady, setQuizReady] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showNavWarning, setShowNavWarning] = useState(false);

  const answersRef = useRef({});
  const submittedRef = useRef(false);
  const mountedRef = useRef(true);
  const durationRef = useRef(null);
  const startTimeRef = useRef(null);
  const attemptKeyRef = useRef("1");
  const pendingNavRef = useRef(null);

  useEffect(() => {
    async function autoSubmitImmediate(entries) {
      try {
        const formatted = entries.map(([q, c]) => ({ question: q, selected_choice: c }));
        await api.post(`/student/quizzes/${quizId}/submit/`, { answers: formatted });
        navigate(`/subjects/quiz/${subjectId}/result/${quizId}`, {
        state: withQuizOrigin(pathname, navState),
      });
      } catch (err) {
        setError("Time is up — your quiz was submitted. " + (err.response?.data?.detail || ""));
        setLoading(false);
      }
    }

    async function initQuiz() {
      try {
        setLoading(true);
        setError(null);
        let attemptNumber = "1";
        // started_at/expires_at come from the server (QuizAttempt.started_at
        // + Quiz.time_limit_minutes) — the source of truth for the deadline.
        // Previously the countdown was seeded from a localStorage timestamp
        // the student could clear to reset their own clock; the server now
        // enforces the same deadline independently on submit, so resetting
        // this display value no longer buys extra time.
        let serverStartedAt = null;
        try {
          const startRes = await api.post(`/quizzes/${quizId}/start/`);
          // Landed here on an already-finished quiz — almost always the
          // browser Back button from the result screen. Show the result
          // instead of silently opening a fresh, ticking attempt.
          // `replace` so Back doesn't bounce straight back in here.
          if (startRes.data?.already_submitted) {
            navigate(`/subjects/quiz/${subjectId}/result/${quizId}`, {
              replace: true,
              state: withQuizOrigin(pathname, navState),
            });
            return;
          }
          if (startRes.data?.attempt_id) attemptNumber = String(startRes.data.attempt_id).slice(-8);
          if (startRes.data?.started_at) serverStartedAt = new Date(startRes.data.started_at).getTime();
        } catch (err) {
          const msg = err.response?.data?.detail;
          if (msg) { setError(msg); setLoading(false); return; }
        }
        attemptKeyRef.current = attemptNumber;

        const res = await api.get(`/quizzes/${quizId}/`);
        setQuizData(res.data);
        const shuffled = getShuffledQuestions(res.data.questions, quizId, attemptNumber);
        setQuestions(shuffled);

        // Restore this attempt's draft before the first render of the palette,
        // so a reload comes back to the same answers, marks and question —
        // the deadline kept running while the tab was gone.
        const draft = readDraft(quizId, attemptNumber);
        if (draft) {
          // Only keep answers whose question is still in this attempt; a quiz
          // edited between attempts must not resurrect a dead question id.
          const live = new Set(shuffled.map((q) => q.id));
          const keep = (o) => Object.fromEntries(
            Object.entries(o).filter(([qId]) => live.has(qId)));
          const restoredAnswers = keep(draft.answers);
          answersRef.current = restoredAnswers;
          setAnswers(restoredAnswers);
          setMarked(keep(draft.marked));
          setVisited({ ...keep(draft.visited), [shuffled[0]?.id]: true });
          setIndex(Math.min(Math.max(draft.index, 0), Math.max(shuffled.length - 1, 0)));
        } else {
          setVisited({ [shuffled[0]?.id]: true });
        }

        startTimeRef.current = serverStartedAt || Date.now();
        durationRef.current = (res.data.time_limit_minutes || 45) * 60;

        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = durationRef.current - elapsed;
        if (remaining <= 0) {
          setTimeLeft(0);
          setLoading(false);
          submittedRef.current = true;
          await autoSubmitImmediate(Object.entries(answersRef.current));
          return;
        }
        setTimeLeft(remaining);
        setQuizReady(true);
      } catch (err) {
        setError(err.response?.data?.detail || "Unable to load quiz.");
      } finally {
        setLoading(false);
      }
    }
    if (quizId) initQuiz();
  }, [quizId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Nav guard — identical strategy to QuizDetail.jsx
  useEffect(() => {
    if (!quizReady) return;
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      if (!submittedRef.current) {
        window.history.pushState(null, "", window.location.href);
        setShowNavWarning(true);
      }
    };
    const handleBeforeUnload = (e) => {
      if (!submittedRef.current) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [quizReady]);

  useEffect(() => {
    if (!quizReady) return;
    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = function (state, title, url) {
      if (url && url.toString() === window.location.href) return originalPushState(state, title, url);
      if (!submittedRef.current) {
        pendingNavRef.current = () => {
          window.history.pushState = originalPushState;
          originalPushState(state, title, url);
          window.dispatchEvent(new PopStateEvent("popstate", { state }));
        };
        setShowNavWarning(true);
        return;
      }
      return originalPushState(state, title, url);
    };
    return () => { window.history.pushState = originalPushState; };
  }, [quizReady]);

  const handleAutoSubmit = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const formatted = Object.entries(answersRef.current).map(([q, c]) => ({ question: q, selected_choice: c }));
      await api.post(`/student/quizzes/${quizId}/submit/`, { answers: formatted });
      clearDraft(quizId, attemptKeyRef.current);
      navigate(`/subjects/quiz/${subjectId}/result/${quizId}`, {
        state: withQuizOrigin(pathname, navState),
      });
    } catch (err) {
      setTimeout(async () => {
        if (!mountedRef.current) return;
        try {
          const formatted = Object.entries(answersRef.current).map(([q, c]) => ({ question: q, selected_choice: c }));
          await api.post(`/student/quizzes/${quizId}/submit/`, { answers: formatted });
          navigate(`/subjects/quiz/${subjectId}/result/${quizId}`, {
        state: withQuizOrigin(pathname, navState),
      });
        } catch (retryErr) {
          console.error("Auto submit retry failed", retryErr);
        }
      }, 2000);
    }
  }, [quizId, subjectId, navigate]);

  useEffect(() => {
    if (!quizReady) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = durationRef.current - elapsed;
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        if (!submittedRef.current) { submittedRef.current = true; handleAutoSubmit(); }
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [quizReady, handleAutoSubmit]);

  const fmtTime = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  };
  const isLowTime = timeLeft !== null && timeLeft <= 300;

  function goTo(idx) {
    const qId = questions[idx]?.id;
    setVisited((v) => ({ ...v, [qId]: true }));
    setIndex(idx);
  }
  function handleAnswer(choiceId) {
    const qId = questions[index].id;
    setAnswers((prev) => {
      const updated = { ...prev, [qId]: choiceId };
      answersRef.current = updated;
      return updated;
    });
  }

  // Persist after every change rather than on an interval: the events this
  // guards against (reload, crash, phone locking) give no chance to flush.
  // Skipped once submitted, so the post-submit navigation cannot rewrite a
  // draft that submit() just cleared.
  useEffect(() => {
    if (!quizReady || submittedRef.current) return;
    writeDraft(quizId, attemptKeyRef.current, { answers, marked, visited, index });
  }, [answers, marked, visited, index, quizReady, quizId]);
  function handleClear() {
    const qId = questions[index].id;
    setAnswers((prev) => {
      const n = { ...prev };
      delete n[qId];
      answersRef.current = n;
      return n;
    });
  }
  function toggleMark() {
    const qId = questions[index].id;
    setMarked((m) => ({ ...m, [qId]: !m[qId] }));
  }
  function handleExit() {
    submittedRef.current = true;
    navigate(quizHubPath(navState, subjectId));
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      setError(null);
      const formatted = Object.entries(answers).map(([q, c]) => ({ question: q, selected_choice: c }));
      await api.post(`/student/quizzes/${quizId}/submit/`, { answers: formatted });
      submittedRef.current = true;
      // Only once the server has the answers. Clearing any earlier would
      // discard the draft on a failed submit, which is exactly when it is
      // most needed. handleExit deliberately does NOT clear it — leaving the
      // page is not finishing, and the attempt stays resumable.
      clearDraft(quizId, attemptKeyRef.current);
      navigate(`/subjects/quiz/${subjectId}/result/${quizId}`, {
        state: withQuizOrigin(pathname, navState),
      });
    } catch (err) {
      const msg = err.response?.data?.detail
        || (err.response?.data && typeof err.response.data === "object" ? Object.values(err.response.data).flat().join(" ") : null)
        || "Failed to submit quiz. Please check your connection and try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  }

  if (loading) return <div className="qm-center">Loading quiz…</div>;
  if (error && !quizData) return <div className="qm-center qm-error-full">{error}</div>;
  if (!quizData || questions.length === 0) return null;

  const q = questions[index];
  const total = questions.length;
  const isLast = index === total - 1;
  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.values(marked).filter(Boolean).length;
  const notVisitedCount = total - Object.keys(visited).length;
  const unansweredCount = total - answeredCount;

  return (
    <div className="qm-page">
      <div className="qm-header">
        <button className="qm-back" onClick={() => setShowExitModal(true)}>← Back</button>
        <span className="qm-title">{quizData.title}</span>
        {/* role=timer + aria-live so the countdown is announced, and the
            5-minute danger state is not conveyed by colour alone. */}
        <div
          className={`qm-timer ${isLowTime ? "qm-timer--warn" : ""}`}
          role="timer"
          aria-live={isLowTime ? "assertive" : "off"}
          aria-label={isLowTime
            ? `Under five minutes remaining: ${fmtTime(timeLeft ?? 0)}`
            : `Time remaining ${fmtTime(timeLeft ?? 0)}`}
        >
          <FiClock size={14} aria-hidden="true" /> {fmtTime(timeLeft ?? 0)}
        </div>
        <button className="qm-submit-btn" onClick={() => setShowSubmitModal(true)}>Submit</button>
      </div>

      {error && <div className="qm-error-box">{error}</div>}

      <div className="qm-body">
        <div className="qm-question-card">
          <div className="qm-qhead">
            <span className="qm-qnum">Q{index + 1} <span className="qm-qtotal">/ {total}</span></span>
            {q.topic && <span className="qm-chip">{q.topic}</span>}
            <span className="qm-marks">+{q.marks || 1} marks</span>
            <button
              className={`qm-mark-btn ${marked[q.id] ? "qm-mark-btn--on" : ""}`}
              onClick={toggleMark}
              aria-pressed={!!marked[q.id]}
            >
              <FiFlag size={12} aria-hidden="true" />
              {marked[q.id] ? "Marked" : "Mark for review"}
            </button>
          </div>
          <p className="qm-qtext">{q.text}</p>
          <div className="qm-choices">
            {q.choices.map((c, ci) => (
              <button
                key={c.id}
                type="button"
                className={`qm-choice ${answers[q.id] === c.id ? "qm-choice--selected" : ""}`}
                onClick={() => handleAnswer(c.id)}
              >
                <span className="qm-choice-letter">{OPTION_LABELS[ci]}</span>
                <span>{c.text}</span>
              </button>
            ))}
          </div>
          <div className="qm-nav-row">
            <button className="qm-nav-btn" onClick={() => goTo(index - 1)} disabled={index === 0}>← Previous</button>
            <button className="qm-clear-link" onClick={handleClear}>Clear answer</button>
            {/* On the LAST question this used to be `disabled`, so the biggest,
                boldest button on the card silently refused to click — the
                disabled style is only opacity:.5, which still reads as an
                active primary button. The learner's next step (Submit) lives
                far away in the page header, so the quiz felt stuck. Now it
                becomes the submit affordance, matching QuizPractice.jsx's
                goNext(), which already branches on the last index instead of
                disabling. `← Previous` keeps its `disabled` because at index 0
                there is genuinely nowhere to go. */}
            {isLast ? (
              <button
                className="qm-nav-btn qm-nav-btn--primary"
                onClick={() => setShowSubmitModal(true)}
              >
                Submit test →
              </button>
            ) : (
              <button className="qm-nav-btn qm-nav-btn--primary" onClick={() => goTo(index + 1)}>
                Save &amp; Next →
              </button>
            )}
          </div>
        </div>

        <div className="qm-palette">
          <div className="qm-palette-title">Question palette</div>
          <div className="qm-palette-grid">
            {questions.map((pq, idx) => {
              const isAns = answers[pq.id] !== undefined;
              const isMk = marked[pq.id];
              const isVis = visited[pq.id];
              let cls = "qm-pal-cell";
              if (isMk) cls += " qm-pal-cell--marked";
              else if (isAns) cls += " qm-pal-cell--answered";
              else if (isVis) cls += " qm-pal-cell--visited";
              if (idx === index) cls += " qm-pal-cell--current";
              return (
                <div key={pq.id} className={cls} onClick={() => goTo(idx)}>{idx + 1}</div>
              );
            })}
          </div>
          <div className="qm-legend">
            <div className="qm-legend-row"><span className="qm-legend-dot qm-legend-dot--answered" /> Answered · {answeredCount}</div>
            <div className="qm-legend-row"><span className="qm-legend-dot qm-legend-dot--marked" /> Marked for review · {markedCount}</div>
            <div className="qm-legend-row"><span className="qm-legend-dot qm-legend-dot--notvisited" /> Not visited · {notVisitedCount}</div>
          </div>
        </div>
      </div>

      {showSubmitModal && (
        <div className="qm-modal-overlay">
          <div className="qm-modal-box">
            <h3>Submit mock test?</h3>
            <p>{answeredCount} answered · {markedCount} marked for review · {unansweredCount} unanswered. You can't change answers after submitting.</p>
            <div className="qm-modal-actions">
              <button className="qm-btn-cancel" onClick={() => setShowSubmitModal(false)} disabled={submitting}>Keep going</button>
              <button className="qm-btn-submit" onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting…" : "Submit now"}</button>
            </div>
          </div>
        </div>
      )}

      {showNavWarning && (
        <div className="qm-modal-overlay">
          <div className="qm-modal-box">
            <h3>Leave quiz?</h3>
            <p>You have an active mock test in progress. The timer keeps running if you leave — you can come back and resume; your answers are saved.</p>
            <div className="qm-modal-actions">
              <button className="qm-btn-cancel" onClick={() => { pendingNavRef.current = null; setShowNavWarning(false); }}>Stay in quiz</button>
              <button className="qm-btn-exit" onClick={() => { setShowNavWarning(false); if (pendingNavRef.current) { pendingNavRef.current(); pendingNavRef.current = null; } }}>Leave anyway</button>
            </div>
          </div>
        </div>
      )}

      {showExitModal && (
        <div className="qm-modal-overlay">
          <div className="qm-modal-box">
            <h3>Exit quiz?</h3>
            <p>The timer keeps running — you can resume from where you left off, or re-attempt after submitting.</p>
            <div className="qm-modal-actions">
              <button className="qm-btn-cancel" onClick={() => setShowExitModal(false)}>Stay</button>
              <button className="qm-btn-exit" onClick={handleExit}>Exit quiz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
