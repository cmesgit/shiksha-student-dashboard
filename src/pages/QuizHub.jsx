import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api/apiClient";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import "../styles/quiz-hub.css";

// Redesigned quiz hub: Practice (untimed, instant feedback) vs Mock (timed,
// exam-style) vs Completed, with a stat strip and resume-in-progress banner.
// Replaces QuizList.jsx. quiz.quiz_type is the backend's mode field
// ("practice"|"mock"); quiz.best_score is the best-ever % across submitted
// attempts (QuizDashboardSerializer.get_best_score). Quizzes have no due
// date by design (see QuizList.jsx's former header comment) — no due-date
// UI here either.

const TABS = [
  { key: "practice", label: "Practice" },
  { key: "mock", label: "Mock tests" },
  { key: "completed", label: "Completed" },
];

function inferTab(quiz) {
  const done = quiz.status === "SUBMITTED" || quiz.attempts_count > 0;
  if (done) return "completed";
  return quiz.quiz_type === "mock" ? "mock" : "practice";
}

export default function QuizHub() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tabParam || "practice");
  const [subjectFilter, setSubjectFilter] = useState(subjectId ? String(subjectId) : "all");
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState(null);
  const [resumeAttempt, setResumeAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (subjectId) setSubjectFilter(String(subjectId));
  }, [subjectId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [quizRes, statsRes] = await Promise.all([
          api.get("/student/quizzes/"),
          api.get("/student/quizzes/stats/").catch(() => ({ data: null })),
        ]);
        if (cancelled) return;
        setQuizzes(quizRes.data);
        setStats(statsRes.data);

        // Surface the most recent unfinished mock attempt as a resume banner
        const resumable = quizRes.data.find(
          (q) => q.quiz_type === "mock" && localStorage.getItem(`quiz_${q.id}_start`) && q.status !== "SUBMITTED"
        );
        setResumeAttempt(resumable || null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load quiz hub:", err);
        setError("Failed to load quizzes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const subjects = useMemo(() => {
    const seen = new Map();
    quizzes.forEach((q) => {
      if (q.subject_id && !seen.has(String(q.subject_id))) {
        seen.set(String(q.subject_id), q.subject_name || "Subject");
      }
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [quizzes]);

  const filtered = useMemo(
    () =>
      quizzes.filter(
        (q) => inferTab(q) === activeTab && (subjectFilter === "all" || String(q.subject_id) === subjectFilter)
      ),
    [quizzes, activeTab, subjectFilter]
  );

  const tabCounts = useMemo(() => {
    const counts = { practice: 0, mock: 0, completed: 0 };
    quizzes.forEach((q) => {
      counts[inferTab(q)] += 1;
    });
    return counts;
  }, [quizzes]);

  function handleQuizClick(quiz) {
    if (activeTab === "completed") {
      navigate(`/subjects/quiz/${quiz.subject_id}/attempts/${quiz.id}`);
      return;
    }
    const alreadyStarted = !!localStorage.getItem(`quiz_${quiz.id}_start`);
    if (alreadyStarted && quiz.quiz_type !== "practice") {
      navigate(`/subjects/quiz/${quiz.subject_id}/take/${quiz.id}`);
      return;
    }
    if (quiz.quiz_type === "practice") {
      // Practice starts immediately — untimed, no confirmation needed
      navigate(`/subjects/quiz/${quiz.subject_id}/practice/${quiz.id}`);
      return;
    }
    setSelectedQuiz(quiz);
    setShowModal(true);
  }

  function confirmStartQuiz() {
    navigate(`/subjects/quiz/${selectedQuiz.subject_id}/take/${selectedQuiz.id}`);
    setShowModal(false);
  }

  if (loading) return <LoadingState label="Loading quizzes" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="qhPage">
      <button className="qhBack" onClick={() => navigate("/subjects/quiz")}>
        &lt; Back
      </button>

      <h1 className="qhTitle">Quizzes</h1>

      {resumeAttempt && (
        <div className="qhResumeBanner">
          <span className="qhResumeIcon">⏸</span>
          <div className="qhResumeText">
            <div className="qhResumeTitle">Mock in progress — {resumeAttempt.title}</div>
            <div className="qhResumeMeta">Your timer is still running</div>
          </div>
          <button
            className="tk-btn qhResumeBtn"
            onClick={() => navigate(`/subjects/quiz/${resumeAttempt.subject_id}/take/${resumeAttempt.id}`)}
          >
            Resume
          </button>
        </div>
      )}

      {stats && (
        <div className="qhStatStrip">
          <StatCard label="Practice streak" value={stats.streak_days} unit="days" delta="Keep it going!" tone="success" />
          <StatCard label="Avg mock score" value={stats.avg_mock_score} unit="%" delta="Best score per test" tone="success" />
          <StatCard label="Questions solved" value={stats.questions_solved} delta="This week" tone="neutral" />
          {stats.weakest_topic && (
            <StatCard
              label="Weakest topic"
              value={stats.weakest_topic}
              delta={`${stats.weakest_topic_accuracy}% accuracy`}
              tone="warning"
            />
          )}
        </div>
      )}

      <div className="qhToolbar">
        <div className="qhTabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`qhTab ${activeTab === t.key ? "qhTabActive" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label} <span className="qhTabCount">{tabCounts[t.key]}</span>
            </button>
          ))}
        </div>
        {subjects.length > 1 && (
          <select className="qhFilter" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
            <option value="all">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="qhGrid">
        {filtered.length === 0 ? (
          <EmptyState
            plain
            icon="quiz"
            title={`No ${activeTab === "completed" ? "completed" : activeTab} quizzes`}
            message={
              activeTab === "practice"
                ? "Untimed practice sets will appear here as your teacher publishes them."
                : activeTab === "mock"
                ? "Timed mock tests will appear here as your teacher publishes them."
                : "Quizzes you finish move here so you can review or re-attempt them."
            }
          />
        ) : (
          filtered.map((quiz) => <QuizHubCard key={quiz.id} quiz={quiz} tab={activeTab} onClick={() => handleQuizClick(quiz)} />)
        )}
      </div>

      {showModal && (
        <div className="qhModalOverlay" onClick={() => setShowModal(false)}>
          <div className="qhModalBox" onClick={(e) => e.stopPropagation()}>
            <h3>Start mock test?</h3>
            <p>
              You are about to start <b>{selectedQuiz?.title}</b>
            </p>
            <ul className="qhModalRules">
              <li>⏱ Timer starts immediately and cannot be paused</li>
              <li>🚩 Mark questions for review and jump between them freely</li>
              <li>📝 Unanswered questions are scored 0</li>
              <li>✅ Results and full analytics appear right after submission</li>
            </ul>
            <div className="qhModalActions">
              <button className="tk-btn" onClick={confirmStartQuiz}>
                Start mock
              </button>
              <button className="tk-btn tk-btn--ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, unit, delta, tone }) {
  return (
    <div className="qhStatCard tk-card">
      <div className="qhStatLabel">{label}</div>
      <div className="qhStatValue">
        {value}
        {unit && <span className="qhStatUnit">{unit}</span>}
      </div>
      <div className={`qhStatDelta qhStatDelta--${tone}`}>{delta}</div>
    </div>
  );
}

function QuizHubCard({ quiz, tab, onClick }) {
  const hasScore = tab === "completed" && quiz.best_score != null;
  return (
    <div className="qhCard tk-card">
      <div className="qhCardTop">
        <span className={`tk-chip qhModeChip qhModeChip--${tab}`}>
          {tab === "practice" ? "Practice" : tab === "mock" ? "Mock" : "Completed"}
        </span>
        {quiz.subject_name && <span className="tk-chip qhSubjectChip">{quiz.subject_name}</span>}
      </div>
      <div className="qhCardTitle">{quiz.title}</div>
      <div className="qhCardMeta">
        <span>{quiz.questions_count ?? "?"} Qs</span>
        <span>{quiz.quiz_type === "practice" ? "Untimed" : `${quiz.time_limit_minutes ?? "?"} min`}</span>
      </div>
      {hasScore && (
        <div className="qhScoreRow">
          <div className="qhScoreLabel">
            <span>Best score</span>
            <span className="qhScoreValue">{quiz.best_score}%</span>
          </div>
          <div className="qhScoreBar">
            <div
              className="qhScoreBarFill"
              style={{
                width: `${quiz.best_score}%`,
                background: quiz.best_score >= 75 ? "var(--success)" : "var(--warning)",
              }}
            />
          </div>
        </div>
      )}
      <div className="qhCardActions">
        <button className={`tk-btn qhStartBtn ${tab === "completed" ? "tk-btn--ghost" : ""}`} onClick={onClick}>
          {tab === "practice" ? (quiz.attempts_count > 0 ? "Practice again" : "Start practice") : tab === "mock" ? "Start mock" : "View results"}
        </button>
      </div>
    </div>
  );
}
