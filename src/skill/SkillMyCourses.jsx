// skill/SkillMyCourses.jsx — Skill Dev Student.dc.html dc:371-451.
//
// This is a MASTERY-TRACKING view — distinct from the old, deleted
// self-paced `SkillCourses`/`skillData.js` (lecture-based enrollment). Reuses
// GET /skill/student/dashboard/'s `mastery_in_progress`/`mastery_completed`
// (same call SkillDevStudentSection/SkillSessions already make).
//
// The lesson-player sub-screen (dc:453-482) is deliberately not built: no
// backend model for lessons/modules exists for 1-on-1 mastery courses.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MasteryBar from "../components/MasteryBar";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "../components/StateViews";
import "../styles/skillMyCourses.css";

const glyph = (skill = "") =>
  skill.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function SkillMyCourses() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ mastery_in_progress: [], mastery_completed: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/skill/student/dashboard/")
      .then(r => setData({
        mastery_in_progress: r.data.mastery_in_progress || [],
        mastery_completed: r.data.mastery_completed || [],
      }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) return <LoadingState label="Loading your courses" />;

  const { mastery_in_progress: inProgress, mastery_completed: completed } = data;

  const card = (c, mastered) => (
    <div className="smc-card" key={c.expert_id}>
      <div className="smc-banner">{glyph(c.skill)}</div>
      <div className="smc-body">
        <div className="smc-title">{c.skill}</div>
        <div className="smc-byRow">
          <span className="smc-by">by {c.expert_name}</span>
          {mastered && <span className="smc-masteredPill">Mastered</span>}
        </div>
        <MasteryBar
          progress={c.mastery_progress} target={c.mastery_target} mastered={mastered}
          radius={12} padding="11px 12px" style={{ marginTop: 14 }}
          footer={
            <button
              className={`smc-continueBtn ${mastered ? "is-mastered" : ""}`}
              onClick={(e) => { e.stopPropagation(); navigate("/skill-dev/book", { state: { expertId: c.expert_id, bookFrom: "courses" } }); }}
            >
              {mastered ? "Book a refresher session" : "Continue → book a session"}
            </button>
          }
          sentence={mastered
            ? `Mastery unlocked — you're an expert in ${c.skill}`
            : `${c.mastery_target - c.mastery_progress} more session${c.mastery_target - c.mastery_progress === 1 ? "" : "s"} with ${c.expert_name.split(" ")[0]} to become an expert`}
        />
      </div>
    </div>
  );

  return (
    <div className="smc-screen">
      <div className="smc-head">
        <div className="smc-eyebrow">Enrolled programmes</div>
        <p className="smc-explainer">
          Every skill development course you've booked or applied for lives here.
          Complete the required sessions with a teacher to master their course.
        </p>
      </div>

      <div className="smc-sectionHead">
        <h3>In progress</h3>
        <span className="smc-count">{inProgress.length} in progress</span>
      </div>
      <div className="smc-sectionSub">Keep booking sessions with your teacher to reach mastery.</div>
      {inProgress.length === 0 ? (
        <div className="smc-emptyBox">No courses in progress — explore experts to start a new one.</div>
      ) : (
        <div className="smc-grid">{inProgress.map((c) => card(c, false))}</div>
      )}

      {completed.length > 0 && (
        <div className="smc-doneSection">
          <div className="smc-sectionHead">
            <h3>Completed</h3>
            <span className="smc-count">{completed.length} completed</span>
          </div>
          <div className="smc-sectionSub">You've finished every required session with these teachers.</div>
          <div className="smc-grid">{completed.map((c) => card(c, true))}</div>
        </div>
      )}
    </div>
  );
}
