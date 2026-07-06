// PLACEMENT: src/pages/counselling/CounsellingAssessment.jsx   (NEW FILE — student dashboard app)
//
// The pre-session assessment, reachable from a session card here or
// from the landing-site confirmation screen (same backend endpoint —
// one shared session cookie across subdomains). Renders the template's
// sections JSON (text / textarea / multi), autosaves drafts every 4s,
// and submits — after which answers become visible to the counsellor.
// Questions edited in Django admin render here with no frontend change.

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import { getAssessment, saveAssessment, submitAssessment } from "../../api/counsellingService";
import "../../styles/counselling.css";

export default function CounsellingAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const dirty = useRef(false);

  useEffect(() => {
    getAssessment(id).then((d) => {
      setData(d);
      setAnswers(d.answers || {});
    }).catch((e) => setError(
      e?.response?.status === 403 ? "This isn't your appointment." : "Couldn't load the assessment."
    ));
  }, [id]);

  useEffect(() => {
    const t = setInterval(async () => {
      if (!dirty.current || !data || data.status === "submitted") return;
      dirty.current = false;
      try {
        await saveAssessment(id, answers);
        setSavedAt(new Date());
      } catch { /* retried next tick */ }
    }, 4000);
    return () => clearInterval(t);
  }, [id, answers, data]);

  const setAnswer = (k, v) => {
    setAnswers((a) => ({ ...a, [k]: v }));
    dirty.current = true;
  };
  const toggleMulti = (k, opt) => {
    const cur = Array.isArray(answers[k]) ? answers[k] : [];
    setAnswer(k, cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]);
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await saveAssessment(id, answers);
      await submitAssessment(id);
      setData((d) => ({ ...d, status: "submitted" }));
      window.scrollTo?.(0, 0);
    } catch (e) {
      setError(e?.response?.data?.detail || "Couldn't submit — try again.");
    }
    setBusy(false);
  };

  return (
    <div className="mc-page">
      <PageHeader title="Pre-session assessment" onSearch={() => {}} />

      {error && !data && <div className="mc-error">{error}</div>}
      {!data && !error && <div className="mc-skel" style={{ height: 260 }} />}

      {data && data.status === "submitted" && (
        <div className="mc-empty">
          <div className="mc-done-tick">✓</div>
          <div className="mc-empty-title">Assessment shared with your counsellor</div>
          They'll read your answers before the session and come prepared.
          <div style={{ marginTop: 14 }}>
            <button className="mc-btn" onClick={() => navigate("/counseling/appointments")}>
              Back to my sessions
            </button>
          </div>
        </div>
      )}

      {data && data.status !== "submitted" && (
        <div className="mc-assess">
          <p className="mc-assess-intro">
            Optional, but it makes your session sharper. Drafts save
            automatically{savedAt ? ` — last saved ${savedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : ""}.
            Your counsellor sees answers only after you submit.
          </p>
          {error && <div className="mc-error">{error}</div>}

          {(data.sections || []).map((sec) => (
            <div key={sec.key} className="mc-card mc-card--open mc-asec">
              <h3>{sec.title}</h3>
              {(sec.questions || []).map((qn) => (
                <div key={qn.key} className="mc-field">
                  <label className="mc-label">{qn.label}</label>
                  {qn.type === "multi" ? (
                    <div className="mc-chips">
                      {(qn.options || []).map((opt) => (
                        <button key={opt}
                          className={`mc-choice${(answers[qn.key] || []).includes(opt) ? " mc-choice--on" : ""}`}
                          onClick={() => toggleMulti(qn.key, opt)}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : qn.type === "textarea" ? (
                    <textarea className="mc-textarea" value={answers[qn.key] || ""}
                      onChange={(e) => setAnswer(qn.key, e.target.value)} />
                  ) : (
                    <input className="mc-input" value={answers[qn.key] || ""}
                      onChange={(e) => setAnswer(qn.key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          ))}

          <div className="mc-assess-nav">
            <button className="mc-btn mc-btn--outline" onClick={() => navigate("/counseling/appointments")}>
              Finish later
            </button>
            <button className="mc-btn" disabled={busy} onClick={submit}>
              {busy ? "Submitting…" : "Submit to my counsellor →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
