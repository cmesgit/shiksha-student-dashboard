import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import api from "../api/apiClient";
import PageHeader from "../components/PageHeader";
import { LoadingState } from "../components/StateViews";
import { useToast } from "../contexts/ToastContext";
import "../styles/quiz.css";
import "../styles/quiz-result-analytics.css";

const DIFF_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };
const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };

function MistakesReview({ questions, onClose }) {
  const [idx, setIdx] = useState(0);
  const q = questions[idx];
  if (!q) return null;

  return (
    <div className="quizModalOverlay">
      <div className="mrCard">
        <div className="mrHeader">
          <span>Reviewing mistake {idx + 1} of {questions.length}</span>
          <button className="mrClose" onClick={onClose}>✕</button>
        </div>
        <p className="mrQuestionText">{q.text}</p>
        <div className="mrAnswerRow mrAnswerRow--wrong">✗ Your answer: {q.selected_choice}</div>
        <div className="mrAnswerRow mrAnswerRow--correct">✓ Correct answer: {q.correct_choice}</div>
        {q.explanation && (
          <div className="mrExplanation"><strong>Why:</strong> {q.explanation}</div>
        )}
        <div className="mrFooter">
          <button
            className="quiz-btn-cancel"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
          >
            ← Previous
          </button>
          {idx === questions.length - 1 ? (
            <button className="quiz-btn-exit" onClick={onClose}>Done</button>
          ) : (
            <button className="quiz-btn-exit" onClick={() => setIdx((i) => i + 1)}>Next →</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuizResult() {
  const navigate = useNavigate();
  const { subjectId, quizId } = useParams();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get("attempt");
  const { showToast } = useToast();

  const [resultData, setResultData]       = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [openExplanation, setOpenExplanation] = useState({});
  const [practisingChapter, setPractisingChapter] = useState(null);
  const [practiseError, setPractiseError] = useState(null);
  const [showReattemptModal, setShowReattemptModal] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);

  // Where "Back" actually goes. Reached from the attempts table (?attempt=)
  // → back to that table; reached straight from a submission → out to the
  // subject's Quiz Hub. Either way it is a real route, never a history pop.
  const goBack = () =>
    navigate(
      attemptId
        ? `/subjects/quiz/${subjectId}/attempts/${quizId}`
        : `/subjects/quiz/${subjectId}`
    );

  const toggleExplanation = (id) => {
    setOpenExplanation(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReattempt = async () => {
    try {
      // Deliberate retake — opt in (see StartQuizView's docstring).
      await api.post(`/quizzes/${quizId}/start/`, { new_attempt: true });
      const path = resultData?.quiz_type === "practice" ? "practice" : "take";
      navigate(`/subjects/quiz/${subjectId}/${path}/${quizId}`);
    } catch (err) {
      console.error("Failed to reattempt quiz:", err);
      showToast({ type: "error", message: "Unable to start reattempt" });
    }
  };

  useEffect(() => {
    async function fetchResult() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/quizzes/${quizId}/result/`, {
          params: attemptId ? { attempt: attemptId } : {},
        });
        setResultData(res.data);
      } catch (err) {
        console.error("Failed to load result:", err);
        setError("Unable to load result.");
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [quizId, attemptId]);

  const wrongQuestions = useMemo(() => {
    if (!resultData) return [];
    const wrongIds = new Set(resultData.wrong_question_ids || []);
    return resultData.questions.filter((q) => wrongIds.has(q.id));
  }, [resultData]);

  const maxTimeSpent = useMemo(() => {
    if (!resultData) return 1;
    return Math.max(1, ...resultData.questions.map((q) => q.time_spent_seconds || 0));
  }, [resultData]);

  // Per-question dwell time is only captured for practice attempts; graded/mock
  // attempts don't record it, so it comes back as all-zeros. Only surface the
  // timing UI when there's real data to show instead of a row of fake "0s".
  const hasTimingData = useMemo(() => {
    if (!resultData) return false;
    return resultData.questions.some((q) => (q.time_spent_seconds || 0) > 0);
  }, [resultData]);

  // Same contract S1's "Practise" uses — one practice session per click, with
  // the question set handed to the runner in router state (there is no GET
  // for a session, so it cannot be refetched).
  async function practiseChapter(chapter) {
    setPractisingChapter(chapter.chapter_id);
    setPractiseError(null);
    try {
      const res = await api.post("/student/practice/start/", {
        chapter_id: chapter.chapter_id,
      });
      navigate(`/subjects/quiz/practice-session/${res.data.session_id}`, {
        state: { session: res.data },
      });
    } catch (err) {
      setPractiseError(
        err?.response?.status === 409
          ? err.response.data?.detail
            || "No questions in the ShikshaCom bank for this chapter yet."
          : "Could not start practice. Please try again."
      );
    } finally {
      setPractisingChapter(null);
    }
  }

  if (loading) return <LoadingState label="Loading result" />;
  if (error)   return <div className="quizResultPage">{error}</div>;
  if (!resultData) return null;

  // `questions` is ANSWERED-ONLY by design (the server says so where it sets
  // questions_total). Using its length as the denominator made the hero ring
  // read 50% directly above "1 / 4 marks": answering 2 of 4 and getting 1
  // right is 50% *of what you attempted* but 25% of the paper. README §S3's
  // ring is the mark percentage — "68%" above "68 of 100 marks" — so it is
  // driven by score/total_marks, and the tallies below count the paper.
  const answered  = resultData.questions.length;
  const correct   = resultData.questions.filter(q => q.is_correct).length;
  const incorrect = answered - correct;
  const blank     = resultData.blank_count ?? Math.max(
    (resultData.questions_total ?? answered) - answered, 0);
  const marked    = resultData.marked_count ?? 0;
  const total     = resultData.questions_total ?? answered;
  const pct       = resultData.total_marks
    ? Math.round((resultData.score * 100) / resultData.total_marks)
    : 0;

  // README §S3: "Better than last time — up 9 marks". previous_percent is
  // null on a first attempt — that must read as praise, not as a 0-mark gain.
  const prevPct = resultData.previous_percent;
  const deltaMarks = prevPct == null || !resultData.total_marks
    ? null
    : Math.round(((pct - prevPct) * resultData.total_marks) / 100);
  const verdict =
    deltaMarks == null
      ? (pct >= 75 ? "Great job!" : pct >= 50 ? "Good effort" : "Keep practising")
      : deltaMarks > 0
        ? `Better than last time — up ${deltaMarks} mark${deltaMarks === 1 ? "" : "s"}`
        : deltaMarks < 0
          ? `Down ${Math.abs(deltaMarks)} mark${Math.abs(deltaMarks) === 1 ? "" : "s"} on last time`
          : "Exactly the same as last time";

  // "finished early" for the compare row — only when the paper was timed and
  // the attempt genuinely ended before the limit.
  const limitSecs = (resultData.time_limit_minutes || 0) * 60;
  const takenSecs = resultData.time_taken_seconds;
  const earlyMins = limitSecs && takenSecs != null && takenSecs < limitSecs
    ? Math.round((limitSecs - takenSecs) / 60)
    : null;

  const chapters = resultData.chapters || [];
  const topicBreakdown = resultData.topic_breakdown || [];
  const difficultyBreakdown = [...(resultData.difficulty_breakdown || [])].sort(
    (a, b) => (DIFF_ORDER[a.difficulty] ?? 9) - (DIFF_ORDER[b.difficulty] ?? 9)
  );
  const scoreTrend = resultData.score_trend || [];
  // Retakes are unlimited, but the answer key is only revealed on the first
  // `reveal_answers_after` attempts — a later retake's result still shows
  // score/correctness, just not the correct-choice text or explanation.
  const answersRevealed = resultData.answers_revealed !== false;

  return (
    <div className="quizResultPage">
      {/* NEVER navigate(-1) from here. The previous history entry is the
          /take/:quizId attempt route — and QuizMock's nav guard pushes a
          DUPLICATE of it (QuizMock.jsx's pushState), so going back lands on
          the quiz questions twice over. Worse, remounting QuizMock fires
          POST /quizzes/:id/start/ unconditionally, which creates a whole new
          attempt: a stray back-click silently burns an attempt, reshuffles
          the questions, and can push the learner past reveal_answers_after
          so they lose access to the answer key. Always go somewhere
          explicit. */}
      <button className="quizResultBack" onClick={goBack}>
        &lt; Back
      </button>

      {/* ── Header with action buttons alongside search ── */}
     <div className="quizResultHeaderBox">
  <div className="quizResultHeaderInner">
    <PageHeader title={resultData.subject_name} />

    <div className="quizResultHeaderRow">
      {/* SEARCH */}
      <div className="quizSearch">
        <input type="text" placeholder="Search questions..." />
        <span className="quizSearchIcon">🔍</span>
      </div>

      {/* BUTTONS BELOW SEARCH */}
      <div className="quizResultHeaderBtns">
        <button
          className="quizResultBackBtn"
          onClick={goBack}
        >
          ← Back to Quizzes
        </button>

        <button
          className="quizResultReattemptBtn"
          onClick={() => setShowReattemptModal(true)}
        >
          🔁 Reattempt Quiz
        </button>
      </div>
    </div>
  </div>
</div>

      <div className="quizResultBodyBox">

        {/* ── Quiz info ── */}
        <div className="quizDetailInfo quizDetailInfo--result">
          <div className="quizDetailInfoLeft">
            <h3 className="quizDetailInfoTitle">{resultData.title}</h3>
            <p className="quizDetailInfoMeta">{resultData.teacher_name}</p>
            <p className="quizDetailInfoDue">
              Submitted: {new Date(resultData.submitted_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── Score hero: ring + summary cards ── */}
        <div className="qraScoreHero">
          <div className="qraRingWrap">
            <svg width="128" height="128" viewBox="0 0 128 128" className="qraRingSvg">
              <circle cx="64" cy="64" r="56" fill="none" stroke="#e5eaed" strokeWidth="10" />
              <circle
                cx="64" cy="64" r="56" fill="none" stroke={pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444"}
                strokeWidth="10" strokeLinecap="round" transform="rotate(-90 64 64)"
                strokeDasharray={`${(pct / 100) * (2 * Math.PI * 56)} ${2 * Math.PI * 56}`}
              />
            </svg>
            <div className="qraRingOverlay">
              <div className="qraRingPct">{pct}%</div>
              <div className="qraRingMarks">{resultData.score} / {resultData.total_marks} marks</div>
            </div>
          </div>

          <div className="qraScoreHeroRight">
            {/* README §S3's verdict line is a COMPARISON ("Better than last
                time — up 9 marks"), not a grade. previous_percent is null on
                a first attempt, which must fall back to the standalone praise
                rather than claim a 0-mark improvement. */}
            <div className="qraVerdict">{verdict}</div>
            <div className="quizResultSummary">
              {[
                { label: "Correct",   value: correct,   mod: "correct" },
                { label: "Incorrect", value: incorrect, mod: "incorrect" },
                // Blank is its own tally, not folded into Incorrect: leaving
                // a question and getting it wrong are different mistakes, and
                // under negative marking they score differently too.
                { label: "Blank",     value: blank,     mod: "blank" },
                { label: "Marked",    value: marked,    mod: "marked" },
              ].map(({ label, value, mod }) => (
                <div key={label} className={`quizResultSummaryCard quizResultSummaryCard--${mod}`}>
                  <div className="quizResultSummaryValue">{value}</div>
                  <div className="quizResultSummaryLabel">{label}</div>
                </div>
              ))}
            </div>
            <div className="qraCompareRow">
              <span>Class average: <strong>{resultData.class_avg_percent}%</strong></span>
              <span>You scored higher than <strong>{resultData.scored_higher_than ?? 0}%</strong> of attempts</span>
              {earlyMins != null && earlyMins > 0 && (
                <span>Finished <strong>{earlyMins} min</strong> early</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Score trend ── */}
        {scoreTrend.length >= 2 && (
          <div className="qraCard">
            <div className="qraCardTitle">Score trend</div>
            <div className="qraCardSub">Last {scoreTrend.length} attempts · {resultData.subject_name}</div>
            <svg viewBox="0 0 640 120" width="100%" height="120" preserveAspectRatio="none" className="qraTrendSvg">
              {(() => {
                const n = scoreTrend.length;
                const toPts = (key) => scoreTrend
                  .map((p, i) => `${(i / (n - 1 || 1)) * 620 + 10},${110 - (p[key] / 100) * 100}`)
                  .join(" ");
                return (
                  <>
                    <polyline points={toPts("class_avg_pct")} fill="none" stroke="#c7d0d6" strokeWidth="2" strokeDasharray="5 5" />
                    <polyline points={toPts("pct")} fill="none" stroke="#425f7f" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                  </>
                );
              })()}
            </svg>
            <div className="qraTrendLegend">
              <span><span className="qraDot qraDot--you" /> You</span>
              <span><span className="qraDot qraDot--avg" /> Class average</span>
            </div>
          </div>
        )}

        {/* ── Chapters on this paper (README §S3) ──
            QUIZ-level, not per-question: Phase 3 put chapter tagging on Quiz,
            so every question here shares these chapters and there is no
            honest per-chapter mark split to draw. Rather than invent one,
            this lists what the paper covered and turns each chapter into the
            spec's real payoff — a route straight into S1's chapter practice.
            `is_custom` marks a chapter the teacher typed themselves. */}
        {chapters.length > 0 && (
          <div className="qraCard">
            <div className="qraCardTitle">What this paper covered</div>
            <div className="qraCardSub">
              Practise any of these from the ShikshaCom bank — nothing you do
              there is graded.
            </div>
            <div className="qraChapterList">
              {chapters.map((c) => (
                <div key={c.chapter_id || c.label} className="qraChapterRow">
                  <span className="qraChapterName">
                    {c.is_custom && (
                      <FiEdit2
                        size={11}
                        aria-label="Chapter created by your teacher"
                        className="qraChapterPencil"
                      />
                    )}
                    {c.label}
                  </span>
                  {c.chapter_id && (
                    <button
                      className="qraChapterBtn"
                      disabled={practisingChapter === c.chapter_id}
                      onClick={() => practiseChapter(c)}
                    >
                      {practisingChapter === c.chapter_id ? "Starting…" : "Practise"}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {practiseError && (
              <div className="qraChapterError">{practiseError}</div>
            )}
          </div>
        )}

        {/* ── Analytics grid ── */}
        <div className="qraGrid">
          {topicBreakdown.length > 0 && (
            <div className="qraCard">
              <div className="qraCardTitle">Topic strengths</div>
              <div className="qraBarList">
                {topicBreakdown.map((t) => (
                  <div key={t.topic} className="qraBarRow">
                    <div className="qraBarRowTop">
                      <span>{t.topic}</span>
                      <span className={t.pct < 65 ? "qraWeak" : "qraStrong"}>{t.pct}%</span>
                    </div>
                    <div className="qraTrack">
                      <div
                        className={`qraFill ${t.pct < 65 ? "qraFill--weak" : "qraFill--strong"}`}
                        style={{ width: `${t.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {difficultyBreakdown.length > 0 && (
            <div className="qraCard">
              <div className="qraCardTitle">Accuracy by difficulty</div>
              <div className="qraDiffBars">
                {difficultyBreakdown.map((d) => (
                  <div key={d.difficulty} className="qraDiffCol">
                    <div className="qraDiffPct">{d.pct}%</div>
                    <div
                      className={`qraDiffBar qraDiffBar--${d.difficulty}`}
                      style={{ height: `${Math.max(6, d.pct * 0.9)}px` }}
                    />
                    <div className="qraDiffLabel">{DIFF_LABEL[d.difficulty] || d.difficulty}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasTimingData && (
          <div className="qraCard">
            <div className="qraCardTitle">Time per question</div>
            <div className="qraTimeList">
              {resultData.questions.map((q, i) => (
                <div key={q.id} className="qraTimeRow">
                  <span className="qraTimeQ">Q{i + 1}</span>
                  <div className="qraTrack qraTrack--time">
                    <div
                      className={`qraFill ${q.time_spent_seconds > maxTimeSpent * 0.75 ? "qraFill--slow" : "qraFill--strong"}`}
                      style={{ width: `${Math.min(100, (q.time_spent_seconds / maxTimeSpent) * 100)}%` }}
                    />
                  </div>
                  <span className="qraTimeSecs">{q.time_spent_seconds || 0}s</span>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* ── Questions ── */}
        <div className="quizDetailQuestions">
          <div className="qraQuestionsHeader">
            <span>Question review</span>
            {answersRevealed && wrongQuestions.length > 0 && (
              <button className="qraRetryBtn" onClick={() => setShowMistakes(true)}>
                ↻ Practice my {wrongQuestions.length} mistake{wrongQuestions.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
          {!answersRevealed && (
            <p className="qraAnswersHiddenNote">
              You've used your review attempt for this quiz — correct answers and
              explanations are hidden on retakes so they can't be memorised for a
              free score. Your score and correctness are still shown below.
            </p>
          )}
          {resultData.questions.map((q, index) => (
            <div
              key={q.id}
              className={`quizDetailQuestion quizDetailQuestion--result ${
                q.is_correct ? "quizDetailQuestion--correct" : "quizDetailQuestion--wrong"
              }`}
            >
              <div className="quizDetailQuestionRow">
                <p className="quizDetailQuestionText">
                  <span className={`quizResultBadge ${q.is_correct ? "quizResultBadge--correct" : "quizResultBadge--wrong"}`}>
                    {q.is_correct ? "✓" : "✗"}
                  </span>
                  {index + 1}. {q.text}
                </p>
                {answersRevealed && (
                  <span className="quizResultCorrectChip">
                    Ans: {q.correct_choice}
                  </span>
                )}
              </div>

              {(q.topic || q.difficulty) && (
                <div className="qraQuestionMeta">
                  {q.topic && <span className="qraMetaChip">{q.topic}</span>}
                  {q.difficulty && <span className="qraMetaChip qraMetaChip--muted">{DIFF_LABEL[q.difficulty] || q.difficulty}</span>}
                  {hasTimingData && typeof q.time_spent_seconds === "number" && (
                    <span className="qraMetaChip qraMetaChip--muted">{q.time_spent_seconds}s</span>
                  )}
                </div>
              )}

              <div className={`quizResultAnswerPill ${q.is_correct ? "quizResultAnswerPill--correct" : "quizResultAnswerPill--wrong"}`}>
                {q.is_correct ? "✓" : "✗"} Your Answer: {q.selected_choice}
              </div>

              {answersRevealed && (
                <div>
                  <button
                    onClick={() => toggleExplanation(q.id)}
                    className={`quizResultExplainBtn ${openExplanation[q.id] ? "quizResultExplainBtn--open" : ""}`}
                  >
                    {openExplanation[q.id] ? "Hide Explanation ▲" : "Show Explanation ▼"}
                  </button>

                  {openExplanation[q.id] && (
                    <div className="quizResultExplainBox">
                      <strong>Explanation:</strong>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Score row (no buttons here anymore) ── */}
        <div className="quizResultFooter">
          <p className="quizDetailScoreText">
            Score: {resultData.score} / {resultData.total_marks}
          </p>
        </div>

      </div>

      {/* ── Reattempt Confirmation Modal ── */}
{showReattemptModal && (
  <div className="quizModalOverlay">
    <div className="quizModalBox">
      <h3>Reattempt Quiz?</h3>
      <p>
        You are currently attempting this quiz.
        <br /><br />
        ⚠️ Your progress will be lost if you exit.
      </p>
      <div className="quizModalActions">
        <button className="quiz-btn-cancel" onClick={() => setShowReattemptModal(false)}>
          Cancel
        </button>
        <button className="quiz-btn-exit" onClick={handleReattempt}>
          Yes, Reattempt
        </button>
      </div>
    </div>
  </div>
)}

      {showMistakes && wrongQuestions.length > 0 && (
        <MistakesReview questions={wrongQuestions} onClose={() => setShowMistakes(false)} />
      )}
    </div>
  );
}
