import { useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../api/apiClient";
import { EmptyState } from "../components/StateViews";
import "../styles/chapter-practice.css";

// The runner behind S1's "Practise" button — chapter practice from the shared
// ShikshaCom bank.
//
// NOT a mock attempt: POST /student/practice/<session>/answer/ answers with
// {is_correct, correct_choice_id, explanation} immediately, because that is
// what practice IS ("answer shown after each question"). Nothing here is
// graded and nothing feeds the weak-chapter accuracy — see
// StudentPracticeChaptersView's docstring for why that separation matters.
//
// The whole question set arrives in the 201 from /student/practice/start/ and
// is handed over in router state. There is deliberately no GET for a session,
// so a hard refresh cannot rebuild one — that case sends the learner back to
// the hub to start a fresh set rather than showing a broken screen.

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function ChapterPractice() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { state } = useLocation();
  const session = state?.session;

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [verdict, setVerdict] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [rightCount, setRightCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = useMemo(() => session?.questions ?? [], [session]);
  const total = questions.length;
  const question = questions[index];

  if (!session) {
    return (
      <div className="cpPage">
        <EmptyState
          icon="quiz"
          title="This practice set has ended"
          message="Practice sets are not saved across a page refresh. Start a fresh one — the questions are picked new each time anyway."
          action={{ label: "Back to practice", to: "/subjects/quiz" }}
        />
      </div>
    );
  }

  async function choose(choiceId) {
    if (verdict || submitting) return;   // one answer per question, server-enforced too
    setSelected(choiceId);
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post(`/student/practice/${sessionId}/answer/`, {
        question_id: question.id,
        choice_id: choiceId,
      });
      setVerdict(res.data);
      if (res.data.is_correct) setRightCount((n) => n + 1);
    } catch (err) {
      setSelected(null);
      setError(
        err?.response?.data?.detail ||
          "Could not record that answer. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setVerdict(null);
    setError(null);
  }

  if (finished) {
    const pct = total ? Math.round((rightCount * 100) / total) : 0;
    return (
      <div className="cpPage">
        <div className="cpCard cpDone">
          <div className="cpDoneScore">{pct}%</div>
          <div className="cpDoneLabel">
            {rightCount} of {total} right · {session.chapter_title}
          </div>
          <div className="cpDoneLabel" style={{ marginTop: 10 }}>
            Practice is never graded — this does not affect your reports.
          </div>
          <div className="cpDoneActions">
            <button
              className="cpDoneBtn"
              onClick={() => navigate("/subjects/quiz")}
            >
              Back to practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cpPage">
      <div className="cpHead">
        <button className="cpExit" onClick={() => navigate("/subjects/quiz")}>
          ← Exit
        </button>
        <div className="cpHeadBody">
          <div className="cpHeadTitle">{session.chapter_title}</div>
          <div className="cpHeadRules">
            Untimed · answer shown after each question · not graded
          </div>
        </div>
        <div className="cpProgressChip">
          {index + 1}/{total}
        </div>
      </div>

      <div className="cpCard">
        <div className="cpQNum">
          Question {index + 1} <span>of {total}</span>
        </div>
        <div className="cpQText">{question.text}</div>

        <div className="cpChoices">
          {question.choices.map((c, i) => {
            // Once answered, the correct row is always marked right and the
            // learner's row is marked wrong if it was — showing the answer is
            // the entire point of practice mode.
            let tone = "";
            if (verdict) {
              if (c.id === verdict.correct_choice_id) tone = "cpChoice--right";
              else if (c.id === selected) tone = "cpChoice--wrong";
            } else if (c.id === selected) {
              tone = "cpChoice--selected";
            }
            return (
              <button
                key={c.id}
                className={`cpChoice ${tone}`}
                onClick={() => choose(c.id)}
                disabled={!!verdict || submitting}
              >
                <span className="cpLetter">{LETTERS[i] ?? i + 1}</span>
                <span>{c.text}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="cpVerdict cpVerdict--wrong">{error}</div>
        )}

        {verdict && (
          <>
            <div
              className={`cpVerdict ${
                verdict.is_correct ? "cpVerdict--right" : "cpVerdict--wrong"
              }`}
            >
              {verdict.is_correct ? "Correct" : "Not quite"}
            </div>
            {verdict.explanation && (
              <div className="cpExplain">
                <span className="cpExplainLabel">Why</span>
                {verdict.explanation}
              </div>
            )}
            <div className="cpNav">
              <button className="cpNext" onClick={next}>
                {index + 1 >= total ? "Finish" : "Next →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
