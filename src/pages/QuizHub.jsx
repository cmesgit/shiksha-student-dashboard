import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FiClock, FiBookOpen, FiAlertTriangle, FiPauseCircle } from "react-icons/fi";
import api from "../api/apiClient";
import { useCourse } from "../contexts/CourseContext";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import TourHeaderButton from "../tour/TourHeaderButton";
import { withQuizOrigin } from "../utils/quizNav";
import "../styles/quiz-hub.css";

// S1 · "Practice & tests" — design_handoff_quiz_system README §S1.
//
// Replaces the tabs+grid hub. Two cards in a main column plus a 330px rail:
//
//   "From your teacher"   — assigned quizzes (GET /student/quizzes/)
//   "Practise by chapter" — the shared ShikshaCom bank, ungraded
//                           (GET /student/practice/chapters/, Phase 8)
//   rail                  — last attempts + the weakest chapter
//
// The resume-in-progress banner and the `quiz_<id>_start` localStorage key
// are carried over deliberately: BUILD_GUIDE Phase 8 item 2 says to keep
// them, and that key is what QuizMock reads to know a timer is already
// running. Losing it would restart a running mock's clock from zero.

// Accuracy bands, README §S1: green >=70, amber 50-69, red <50. `null`
// accuracy means never attempted, which is its own neutral state rather
// than a red 0% — "you have not tried this" and "you get this wrong" are
// different facts and the bar must not conflate them.
function band(accuracy) {
  if (accuracy == null) return "untried";
  if (accuracy >= 70) return "strong";
  if (accuracy >= 50) return "mid";
  return "weak";
}

// "3 days ago" / "today" for the rail. Intl.RelativeTimeFormat keeps this
// out of a date library the app does not already depend on.
const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function whenLabel(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.round((then - Date.now()) / 86400000);
  if (Math.abs(days) < 1) return "today";
  if (Math.abs(days) < 30) return RTF.format(days, "day");
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function QuizHub() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { subjectId } = useParams();
  // A learner profile can hold live subscriptions to several courses at once,
  // so every read here is course-scoped — without it the hub listed every
  // subscribed course's quizzes under whichever class was selected.
  const { activeCourse } = useCourse();

  const [quizzes, setQuizzes] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [resumeAttempt, setResumeAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startingChapter, setStartingChapter] = useState(null);
  const [startError, setStartError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!activeCourse) {
      setQuizzes([]);
      setChapters([]);
      setResumeAttempt(null);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = { course: activeCourse.id };
        const [quizRes, chapterRes] = await Promise.all([
          api.get("/student/quizzes/", { params }),
          // The chapter list is scoped by subject, not course, and is
          // optional to the page: a failure here must not blank the
          // teacher's assigned tests, which are the more important half.
          api
            .get("/student/practice/chapters/",
                 { params: subjectId ? { subject: subjectId } : {} })
            .catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setQuizzes(quizRes.data);
        setChapters(chapterRes.data || []);

        const resumable = quizRes.data.find(
          (q) =>
            q.quiz_type === "mock" &&
            localStorage.getItem(`quiz_${q.id}_start`) &&
            q.status !== "SUBMITTED"
        );
        setResumeAttempt(resumable || null);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load the practice hub:", err);
        setError("Failed to load your practice and tests.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeCourse, subjectId]);

  // Deep links land on /subjects/quiz/:subjectId. Pin the assigned list to
  // that subject too, so both halves of the page agree on what is shown.
  const assigned = useMemo(
    () =>
      quizzes.filter(
        (q) => !subjectId || String(q.subject_id) === String(subjectId)
      ),
    [quizzes, subjectId]
  );

  const openCount = useMemo(
    () => assigned.filter((q) => q.status !== "SUBMITTED").length,
    [assigned]
  );

  // The rail's history: everything actually finished, newest first. Quizzes
  // with no attempt carry last_attempt_at === null and are excluded rather
  // than sorted to the bottom.
  const history = useMemo(
    () =>
      assigned
        .filter((q) => q.last_attempt_at)
        .sort((a, b) => new Date(b.last_attempt_at) - new Date(a.last_attempt_at))
        .slice(0, 4),
    [assigned]
  );

  // Weakest chapter: lowest graded accuracy among chapters that (a) have
  // actually been attempted and (b) have bank questions left to serve.
  // Recommending a chapter with an empty bank would be a dead end.
  const weakest = useMemo(() => {
    const eligible = chapters.filter(
      (c) => c.accuracy != null && c.available > 0
    );
    if (!eligible.length) return null;
    return eligible.reduce((lo, c) => (c.accuracy < lo.accuracy ? c : lo));
  }, [chapters]);

  // The comparison the weakest-chapter card makes ("against 7 in 10 across
  // Physics") is subject-wide, so it is averaged over that subject's other
  // attempted chapters only.
  // True when the syllabus has chapters but not one of them can be practised
  // yet, i.e. nothing has been accepted into the shared bank.
  const bankEmpty = useMemo(
    () => chapters.length > 0 && chapters.every((c) => c.available === 0),
    [chapters]
  );

  const weakestPeerAccuracy = useMemo(() => {
    if (!weakest) return null;
    const peers = chapters.filter(
      (c) =>
        c.subject_id === weakest.subject_id &&
        c.chapter_id !== weakest.chapter_id &&
        c.accuracy != null
    );
    if (!peers.length) return null;
    return Math.round(peers.reduce((s, c) => s + c.accuracy, 0) / peers.length);
  }, [chapters, weakest]);

  async function startPractice(chapter) {
    setStartingChapter(chapter.chapter_id);
    setStartError(null);
    try {
      const res = await api.post("/student/practice/start/", {
        chapter_id: chapter.chapter_id,
      });
      navigate(`/subjects/quiz/practice-session/${res.data.session_id}`, {
        state: { session: res.data },
      });
    } catch (err) {
      // 409 is the documented "bank is empty for this chapter" answer, and
      // it deserves its own sentence rather than a generic failure.
      const msg =
        err?.response?.status === 409
          ? err.response.data?.detail ||
            "No questions in the ShikshaCom bank for this chapter yet."
          : "Could not start practice. Please try again.";
      setStartError({ chapterId: chapter.chapter_id, message: msg });
    } finally {
      setStartingChapter(null);
    }
  }

  function openAssigned(quiz) {
    // Carry the hub path we're leaving, so "Back to Quizzes" returns to THIS
    // list rather than rebuilding a subject-scoped one. See utils/quizNav.js.
    const origin = withQuizOrigin(pathname);
    if (quiz.status === "SUBMITTED") {
      navigate(`/subjects/quiz/${quiz.subject_id}/attempts/${quiz.id}`, { state: origin });
      return;
    }
    if (quiz.quiz_type === "practice") {
      navigate(`/subjects/quiz/${quiz.subject_id}/practice/${quiz.id}`, { state: origin });
      return;
    }
    navigate(`/subjects/quiz/${quiz.subject_id}/take/${quiz.id}`, { state: origin });
  }

  if (loading) return <LoadingState label="Loading your practice and tests" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="qhPage">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="qhTitle">Practice &amp; tests</h1>
          <p className="qhSub">
            Practise any chapter as much as you like. Tests from your teacher
            are listed below.
          </p>
        </div>
        <TourHeaderButton pathname={pathname} />
      </div>

      {resumeAttempt && (
        <div className="qhResumeBanner">
          <FiPauseCircle size={20} aria-hidden="true" />
          <div className="qhResumeText">
            <div className="qhResumeTitle">
              Mock in progress — {resumeAttempt.title}
            </div>
            <div className="qhResumeMeta">Your timer is still running</div>
          </div>
          <button
            className="qhResumeBtn"
            onClick={() =>
              navigate(
                `/subjects/quiz/${resumeAttempt.subject_id}/take/${resumeAttempt.id}`
              )
            }
          >
            Resume
          </button>
        </div>
      )}

      <div className="qhLayout">
        <div className="qhMain">
          {/* ── From your teacher ─────────────────────────────────────── */}
          <section className="qhCard" data-tour="quiz-hub.assigned">
            <div className="qhCardHead">
              <FiClock size={15} style={{ color: "var(--teacher-action)" }} aria-hidden="true" />
              <span className="qhCardHeadTitle">From your teacher</span>
              <div className="qhCardHeadSpacer" />
              {openCount > 0 && (
                <span className="qhCardHeadCount">{openCount} open</span>
              )}
            </div>

            {assigned.length === 0 ? (
              <EmptyState
                plain
                icon="quiz"
                title="Nothing set yet"
                message="Tests and quizzes your teacher assigns will appear here."
              />
            ) : (
              <div className="qhRows">
                {assigned.map((q) => (
                  <AssignedRow
                    key={q.id}
                    quiz={q}
                    onOpen={() => openAssigned(q)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Practise by chapter ───────────────────────────────────── */}
          <section className="qhCard" data-tour="quiz-hub.chapters">
            <div className="qhCardHead qhCardHead--tight">
              <FiBookOpen size={15} style={{ color: "var(--academy)" }} aria-hidden="true" />
              <span className="qhCardHeadTitle">Practise by chapter</span>
            </div>
            <p className="qhCardSub">
              Questions from the ShikshaCom bank, checked by the academy team.
              As many attempts as you want — nothing is graded.
            </p>

            {chapters.length === 0 ? (
              <EmptyState
                plain
                icon="book"
                title="No chapters yet"
                message="Once your course has chapters with bank questions, they show up here to practise."
              />
            ) : bankEmpty ? (
              // Seen on dev with a real syllabus: 89 chapters, every one of
              // them disabled because no question has been accepted into the
              // shared bank yet. A wall of dead rows reads as a broken screen,
              // so when NOTHING is practisable the card says so once instead.
              // (The endpoint deliberately returns available=0 chapters rather
              // than hiding them, so the list still reflects the syllabus —
              // that choice is right, this is only about how it renders.)
              <EmptyState
                plain
                icon="book"
                title="The question bank is still being filled"
                message={`Your syllabus has ${chapters.length} chapter${chapters.length === 1 ? "" : "s"}, but none has questions in the ShikshaCom bank yet. They open for practice as soon as the academy team accepts them.`}
              />
            ) : (
              <div className="qhRows">
                {chapters.map((c) => (
                  <ChapterRow
                    key={c.chapter_id}
                    chapter={c}
                    busy={startingChapter === c.chapter_id}
                    error={
                      startError?.chapterId === c.chapter_id
                        ? startError.message
                        : null
                    }
                    onPractise={() => startPractice(c)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── rail ────────────────────────────────────────────────────── */}
        <aside className="qhRail">
          <section className="qhCard">
            <div className="qhRailTitle">Your last attempts</div>
            {history.length === 0 ? (
              <p className="qhCardSub" style={{ margin: 0 }}>
                Finish a test and your score shows up here.
              </p>
            ) : (
              history.map((q) => (
                <div className="qhHistoryRow" key={q.id}>
                  <div className={`qhScoreTile qhScoreTile--${band(q.best_score)}`}>
                    {/* Rounded: best_score is a 1-decimal float by API
                        contract (get_best_score), and "33.3%" is five glyphs
                        fighting for a 34px tile that the spec draws as
                        "68%". The precision is not meaningful at this size. */}
                    {q.best_score == null ? "—" : `${Math.round(q.best_score)}%`}
                  </div>
                  <div className="qhHistoryBody">
                    <div className="qhHistoryTitle">{q.title}</div>
                    <div className="qhHistoryWhen">
                      {whenLabel(q.last_attempt_at)}
                    </div>
                  </div>
                  <button
                    className="qhHistoryAction"
                    onClick={() =>
                      navigate(
                        `/subjects/quiz/${q.subject_id}/attempts/${q.id}`
                      )
                    }
                  >
                    Review
                  </button>
                </div>
              ))
            )}
          </section>

          {weakest && (
            <section className="qhWeakest">
              <div className="qhWeakestKicker">Weakest chapter</div>
              <div className="qhWeakestTitle">{weakest.title}</div>
              <div className="qhWeakestText">
                You get {Math.round(weakest.accuracy / 10)} in 10 right here
                {weakestPeerAccuracy != null && (
                  <>
                    , against {Math.round(weakestPeerAccuracy / 10)} in 10
                    across {weakest.subject_name}
                  </>
                )}
                . {weakest.available} fresh{" "}
                {weakest.available === 1 ? "question is" : "questions are"}{" "}
                waiting.
              </div>
              <button
                className="qhWeakestBtn"
                disabled={startingChapter === weakest.chapter_id}
                onClick={() => startPractice(weakest)}
              >
                {startingChapter === weakest.chapter_id
                  ? "Starting…"
                  : "Practise this chapter"}
              </button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function AssignedRow({ quiz, onOpen }) {
  const isMock = quiz.quiz_type === "mock";
  const done = quiz.status === "SUBMITTED";
  const kind = isMock ? "mock" : "practice";

  // README §S1 specifies a third, disabled "Starts in 3 days" state. Quiz
  // carries no scheduling field at all (the redesign dropped `due_date` and
  // never added a start date), so there is nothing to drive it — rendering
  // it would mean inventing a date. Left out deliberately, not overlooked.
  const meta = [
    `${quiz.questions_count ?? "?"} question${quiz.questions_count === 1 ? "" : "s"}`,
    isMock ? `${quiz.time_limit_minutes ?? "?"} min` : "Untimed",
    quiz.attempts_count > 0
      ? `${quiz.attempts_count} attempt${quiz.attempts_count === 1 ? "" : "s"}`
      : "Not attempted",
  ].join(" · ");

  return (
    <div className="qhAssigned">
      <div className={`qhAssignedTile qhAssignedTile--${kind}`}>
        {isMock ? <FiClock size={17} /> : <FiBookOpen size={17} />}
      </div>
      <div className="qhAssignedBody">
        <div className="qhAssignedTitleRow">
          <span className="qhAssignedTitle">{quiz.title}</span>
          <span className={`qhKindChip qhKindChip--${kind}`}>
            {isMock ? "Mock test" : "Practice"}
          </span>
        </div>
        <div className="qhAssignedMeta">{meta}</div>
        {quiz.chapter_note && (
          <div className="qhAssignedNote">{quiz.chapter_note}</div>
        )}
      </div>
      <button
        className={`qhAssignedBtn ${
          done ? "qhAssignedBtn--ghost" : isMock ? "qhAssignedBtn--mock" : ""
        }`}
        onClick={onOpen}
      >
        {done ? "See result" : "Start"}
      </button>
    </div>
  );
}

function ChapterRow({ chapter, busy, error, onPractise }) {
  const tone = band(chapter.accuracy);
  const empty = chapter.available === 0;
  const weak = chapter.accuracy != null && chapter.accuracy < 50;

  return (
    <div className="qhChapter">
      <div className="qhChapterBody">
        <div className="qhChapterTitleRow">
          <span className="qhChapterName">{chapter.title}</span>
          {weak && (
            <span className="qhWeakChip">
              <FiAlertTriangle size={10} aria-hidden="true" /> needs work
            </span>
          )}
        </div>
        <div className="qhBarRow">
          <div className="qhBar">
            <div
              className={`qhBarFill qhBarFill--${tone}`}
              // An untried chapter still shows a full-width neutral track so
              // the row does not read as "0% right".
              style={{ width: chapter.accuracy == null ? "100%" : `${chapter.accuracy}%` }}
            />
          </div>
          <span className="qhBarLabel">
            {chapter.accuracy == null ? "Not tried" : `${chapter.accuracy}% right`}
          </span>
        </div>
        {error && (
          <div className="qhAssignedMeta" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        )}
      </div>
      <button
        className="qhPractiseBtn"
        onClick={onPractise}
        disabled={busy || empty}
        title={empty ? "No bank questions for this chapter yet" : undefined}
      >
        {busy ? "Starting…" : "Practise"}
      </button>
    </div>
  );
}
