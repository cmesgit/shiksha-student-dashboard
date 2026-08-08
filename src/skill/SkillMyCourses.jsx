// skill/SkillMyCourses.jsx — NEW screen (design_handoff_skilldev README.md
// "5. My courses"), verified against the live standalone prototype.
//
// This is a MASTERY-TRACKING view — distinct from the old, deleted
// self-paced `SkillCourses`/`skillData.js` (lecture-based enrollment). Reuses
// GET /skill/student/dashboard/'s `mastery_in_progress`/`mastery_completed`
// (same call SkillDevStudentSection/SkillSessions already make).

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "./SkillUI";
import MasteryBar from "../components/MasteryBar";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "../components/StateViews";
import "../styles/skillMyCourses.css";

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

  return (
    <div className="smc-screen">
      <div className="smc-eyebrow">Enrolled programmes</div>
      <p className="smc-explainer">
        Every skill development course you've booked or applied for lives here.
        Complete the required sessions with a teacher to master their course.
      </p>
      <hr className="smc-divider" />

      <div className="smc-sectionHead">
        <h3>In progress</h3>
        <span className="smc-count">{inProgress.length} in progress</span>
      </div>
      {inProgress.length === 0 ? (
        <div className="smc-emptyBox">No courses in progress — explore experts to start a new one.</div>
      ) : (
        <div className="smc-grid">
          {inProgress.map((c) => (
            <div className="smc-card" key={c.expert_id}>
              <div className="smc-cardHead">
                <Avatar name={c.expert_name} size={38} />
                <div>
                  <div className="smc-title">{c.skill}</div>
                  <div className="smc-by">by {c.expert_name}</div>
                </div>
              </div>
              <MasteryBar
                progress={c.mastery_progress} target={c.mastery_target} mastered={false}
                sentence={`${c.mastery_target - c.mastery_progress} more session${c.mastery_target - c.mastery_progress === 1 ? "" : "s"} with ${c.expert_name.split(" ")[0]} to become an expert`}
              />
              <button className="smc-btn smc-btn--primary" onClick={() => navigate("/skill-dev/book", { state: { expertId: c.expert_id, bookFrom: "courses" } })}>
                Continue → book a session
              </button>
            </div>
          ))}
        </div>
      )}

      <hr className="smc-divider" />

      <div className="smc-sectionHead">
        <h3>Completed</h3>
        <span className="smc-count">{completed.length} completed</span>
      </div>
      {completed.length === 0 ? (
        <div className="smc-emptyBox">Nothing mastered yet — keep going!</div>
      ) : (
        <div className="smc-grid">
          {completed.map((c) => (
            <div className="smc-card" key={c.expert_id}>
              <div className="smc-cardHead">
                <Avatar name={c.expert_name} size={38} />
                <div>
                  <div className="smc-title">{c.skill}<span className="smc-masteredPill">Mastered</span></div>
                  <div className="smc-by">by {c.expert_name}</div>
                </div>
              </div>
              <MasteryBar
                progress={c.mastery_progress} target={c.mastery_target} mastered
                sentence={`Mastery unlocked — you're an expert in ${c.skill}.`}
              />
              <button className="smc-btn smc-btn--success" onClick={() => navigate("/skill-dev/book", { state: { expertId: c.expert_id, bookFrom: "courses" } })}>
                Book a refresher session
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
