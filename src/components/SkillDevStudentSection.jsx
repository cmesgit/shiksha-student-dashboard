// src/components/SkillDevStudentSection.jsx
// Rendered by Dashboard.jsx when activeTrack === "skill".
//
// The Skill Dev Dashboard, rebuilt to design_handoff_skilldev's exact markup
// (verified against the live standalone/SkillDev-Student.html prototype):
//   • Stat grid: Courses enrolled · Lessons completed · Hours learned ·
//     Avg. rating given (auto-fit, gap 16).
//   • "Book another session" rebook card (amber tint) — the in-progress
//     mastery course with the most recent activity.
//   • Two-column: Next up (upcoming sessions) | Top experts (platform-wide,
//     NOT just this learner's own tutors — a different list).
//
// Fetches GET /skill/student/dashboard/, which now returns `rebook` and
// `top_experts` alongside the existing session/expert data.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "./StateViews";
import { Avatar } from "../skill/SkillUI";
import MasteryBar from "./MasteryBar";
import SkillReviewModal from "./SkillReviewModal";
import "../styles/skillDevDashboard.css";

const daysAgo = (iso) => {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
};

const STATUS_LABEL = { requested: "Requested", confirmed: "Confirmed" };

// Stat-tile icons (dc:111-117: book/video/calendar/star, one per tile).
const StatIcon = {
  book: () => <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5v-13Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/></svg>,
  video: () => <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  cal: () => <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  star: () => <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6.4 6.9.7-5.2 4.8 1.5 6.9L12 17.9l-6.1 3.4 1.5-6.9-5.2-4.8 6.9-.7z"/></svg>,
};

export default function SkillDevStudentSection() {
  const { api } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState({
    stats: {}, upcoming_sessions: [], top_experts: [], rebook: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setError(false);
    api.get("/skill/student/dashboard/")
      .then(r => setData({
        stats:             r.data.stats || {},
        upcoming_sessions: r.data.upcoming_sessions || [],
        top_experts:       r.data.top_experts || [],
        rebook:            r.data.rebook || null,
      }))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const { stats, upcoming_sessions: sessions, top_experts: experts, rebook } = data;

  const statTiles = [
    { icon: "book",  value: stats.courses_enrolled_count ?? 0, label: "Courses enrolled" },
    { icon: "video", value: stats.lessons_completed_count ?? 0, label: "Lessons completed" },
    { icon: "cal",   value: `${stats.session_hours ?? 0}h`, label: "Hours learned" },
    { icon: "star",  value: stats.avg_rating_given ?? "—", label: "Avg. rating given" },
  ];

  const openMsg = (teacherId, name) =>
    navigate("/skill-messages", { state: teacherId ? { teacherId, expertName: name } : undefined });
  const bookTutor = (expertId) =>
    navigate("/skill-dev/book", { state: expertId ? { expertId } : undefined });

  return (
    <div className="sd-main">
      {error && !loading && (
        <div className="sd-emptyBox sd-errorBox">
          <span>Couldn&apos;t load your dashboard.</span>
          <button className="sd-retryBtn" onClick={() => { setLoading(true); load(); }}>Retry</button>
        </div>
      )}

      {/* Review prompt for any completed session still awaiting a review —
          same component (and /skill/my-reviewable-sessions/ source) the My
          Sessions page uses, so the dashboard is no longer a dead end. */}
      {!loading && <SkillReviewModal onDone={load} />}

      {/* Stat grid */}
      <div className="sd-statGrid">
        {statTiles.map((s, i) => {
          const IconComp = StatIcon[s.icon];
          return (
            <div className="sd-statTile" key={i}>
              <div className="sd-statIcon"><IconComp /></div>
              <div className="sd-statValue">{loading ? "—" : s.value}</div>
              <div className="sd-statLabel">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Rebook card */}
      {!loading && rebook && (
        <div className="sd-rebookCard">
          <Avatar name={rebook.expert_name} size={56} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="sd-eyebrow">Book another session</div>
            <div className="sd-rebookName">{rebook.expert_name}</div>
            <div className="sd-rebookMeta">
              {rebook.skill}
              {rebook.last_session_at && ` · last session ${daysAgo(rebook.last_session_at)}`}
            </div>
            <MasteryBar
              progress={rebook.mastery_progress} target={rebook.mastery_target}
              mastered={false} variant="hero" countFormat="of"
              sentenceSize={12} style={{ marginTop: 10 }}
              sentence={`You've completed ${rebook.mastery_progress} session${rebook.mastery_progress === 1 ? "" : "s"} with ${rebook.expert_name.split(" ")[0]} — book ${rebook.mastery_target - rebook.mastery_progress} more to master ${rebook.skill}.`}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignSelf: "center" }}>
            <button className="sd-btn sd-btn--primary" onClick={() => bookTutor(rebook.expert_id)}>Book again</button>
            <button className="sd-btn sd-btn--secondary" onClick={() => openMsg(rebook.teacher_id, rebook.expert_name)}>Message</button>
          </div>
        </div>
      )}

      {/* Two-column: Next up | Top experts */}
      <div className="sd-twoCol">
        <div className="sd-col">
          <div className="sd-sectionHead">
            <h3>Next up</h3>
            <button className="sd-link" onClick={() => navigate("/skill-dev/sessions")}>All sessions →</button>
          </div>
          {loading ? (
            <LoadingState label="Loading your sessions" />
          ) : sessions.length === 0 ? (
            <div className="sd-emptyBox">
              No upcoming sessions.{" "}
              <button className="sd-link" onClick={() => navigate("/skill-dev/explore")}>Explore tutors →</button>
            </div>
          ) : sessions.slice(0, 3).map((s) => (
            <div className="sd-sessionRow" key={s.id}>
              <Avatar name={s.expert_name} img={s.expert_img} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sd-sessionTopic">{s.topic || "1-on-1 session"}</div>
                <div className="sd-sessionMeta">with {s.expert_name} · {s.when || "Time TBC"}</div>
              </div>
              <span className={`sd-tag sd-tag--${s.status}`}>{STATUS_LABEL[s.status] || s.status}</span>
            </div>
          ))}
        </div>

        <div className="sd-col">
          <div className="sd-sectionHead">
            <h3>Top experts</h3>
            <button className="sd-link" onClick={() => navigate("/skill-dev/explore")}>Explore →</button>
          </div>
          {loading ? (
            <LoadingState plain label="Loading" />
          ) : experts.length === 0 ? (
            <p className="sd-emptyText">No experts listed yet.</p>
          ) : experts.map((e) => (
            <div className="sd-expertRow" key={e.id} onClick={() => navigate(`/skill-dev/profile/${e.id}`)}>
              <Avatar name={e.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sd-expertName">{e.name}</div>
                <div className="sd-expertSkill">{e.skill}</div>
              </div>
              <span className="sd-expertRating">★ {e.rating ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
