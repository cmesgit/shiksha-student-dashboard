// skill/SkillExpertProfile.jsx — Skill Dev Student.dc.html dc:230-367.
// Reached from Explore's "View profile" or Book's "View profile" link;
// `bookFrom` (carried via router state) is what makes the back-link read
// "Back to explore" vs "Back to profile"/"my courses"/"dashboard" per
// WORKFLOW.md §7's `bookFrom` state key.
//
// GET /skill/teachers/<id>/         → profile (ExpertCardSerializer)
// GET /skill/teachers/<id>/availability/ → this week's free/booked slots

import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Avatar } from "./SkillUI";
import { avatarColor } from "./SkillUI";
import MasteryBar from "../components/MasteryBar";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "../components/StateViews";
import * as AV from "./availability";
import "../styles/skillExpertProfile.css";

const BACK_LABEL = { explore: "explore", courses: "my courses", dashboard: "dashboard" };

export default function SkillExpertProfile() {
  const { expertId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { api } = useAuth();
  const from = location.state?.bookFrom || "explore";

  const [t, setT] = useState(null);
  const [avail, setAvail] = useState({ open: [], booked: [] });
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/skill/teachers/${expertId}/`),
      api.get(`/skill/teachers/${expertId}/availability/`),
    ])
      .then(([p, a]) => { setT(p.data); setAvail({ open: a.data.open || [], booked: a.data.booked || [] }); })
      .catch(() => setT(null))
      .finally(() => setLoading(false));
  }, [expertId, api]);

  if (loading) return <LoadingState label="Loading profile" />;
  if (!t) return <div className="sep-empty">Expert not found.</div>;

  const progress = t.my_mastery_progress ?? 0;
  const remaining = Math.max(0, t.mastery_target - progress);
  const openSlotsCount = avail.open.filter((k) => !avail.booked.includes(k)).length;
  const dayLabels = AV.shortDayLabels();
  const firstName = t.name.split(" ")[0];

  return (
    <div className="sep-screen">
      <button className="sep-back" onClick={() => navigate(-1)}>← Back to {BACK_LABEL[from] || "explore"}</button>

      <div className="sep-cols">
        {/* Left column */}
        <div className="sep-leftCol">
          <div className="sep-heroCard">
            <div
              className="sep-video"
              style={playing ? undefined : { background: `linear-gradient(135deg, ${avatarColor(t.name)}cc, #1a2c33)` }}
              onClick={() => t.intro_video_embed_url && setPlaying((p) => !p)}
            >
              {playing && t.intro_video_embed_url ? (
                <iframe src={t.intro_video_embed_url} title={`${t.name} intro`} className="sep-videoFrame"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              ) : (
                <div className="sep-playWrap">
                  <span className="sep-playDisc">▶</span>
                  <div className="sep-playCaption">Play intro video</div>
                </div>
              )}
              <span className="sep-videoPill">Intro video</span>
              {/* No control bar/duration: unlike the mockup's fixture data, no
                  backend field stores the intro video's actual length. */}
            </div>
            <div className="sep-heroBody">
              <div className="sep-heroTop">
                <Avatar name={t.name} img={t.img} size={54} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sep-heroName">{t.name}</div>
                  <div className="sep-heroTitle">{t.title}</div>
                </div>
                <div className="sep-ratingBlock">
                  <div className="sep-ratingValue">★ {t.rating ?? "—"}</div>
                  <div className="sep-reviewsCount">{t.reviews_count} reviews</div>
                </div>
              </div>
              <div className="sep-statGrid">
                <div className="sep-statTile"><div className="sep-statValue">{t.sessions}</div><div className="sep-statLabel">Sessions taught</div></div>
                <div className="sep-statTile"><div className="sep-statValue">{t.experience_years ?? "—"}</div><div className="sep-statLabel">Years experience</div></div>
                <div className="sep-statTile"><div className="sep-statValue">{t.mastery_target}</div><div className="sep-statLabel">Sessions to master</div></div>
                <div className="sep-statTile"><div className="sep-statValue">{openSlotsCount}</div><div className="sep-statLabel">Free slots this week</div></div>
              </div>
            </div>
          </div>

          <div className="sep-card">
            <h3 className="sep-h">About</h3>
            <div className="sep-about">{t.bio}</div>
            {t.subject_description && <div className="sep-about" style={{ marginTop: 10 }}>{t.subject_description}</div>}
          </div>

          {t.skills?.length > 0 && (
            <div className="sep-card">
              <h3 className="sep-h" style={{ marginBottom: 12 }}>Areas of expertise</h3>
              <div className="sep-pills">
                {t.skills.map((s) => <span key={s} className="sep-pill">{s}</span>)}
              </div>
            </div>
          )}

          {t.experience_timeline?.length > 0 && (
            <div className="sep-card">
              <h3 className="sep-h" style={{ marginBottom: 14 }}>Experience</h3>
              <div className="sep-timeline">
                {t.experience_timeline.map((e, i) => (
                  <div className="sep-timelineRow" key={i}>
                    <div className="sep-timelineYears">{e.years}</div>
                    <div>
                      <div className="sep-timelineRole">{e.role}</div>
                      <div className="sep-timelineDetail">{e.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — sticky */}
        <div className="sep-rail">
          <div className="sep-card">
            <h4 className="sep-cardTitle">Free times this week</h4>
            <p className="sep-cardSub">{openSlotsCount} open slot{openSlotsCount === 1 ? "" : "s"} · all times IST · tap one to book</p>
            <div className="sep-days">
              {AV.DAYS.map((d, di) => {
                const dayOpen = AV.SLOTS.map((_, si) => di + "-" + si)
                  .filter((k) => avail.open.includes(k) && !avail.booked.includes(k));
                return (
                  <div className="sep-dayRow" key={d}>
                    <div className="sep-dayLabel">{dayLabels[di]}</div>
                    <div className="sep-dayPills">
                      {dayOpen.length === 0 ? (
                        <span className="sep-notFree">Not free</span>
                      ) : dayOpen.map((k) => {
                        const si = Number(k.split("-")[1]);
                        return (
                          <span key={k} className="sep-timePill" onClick={() => navigate("/skill-dev/book", { state: { expertId: t.id, slot: k, bookFrom: "profile" } })}>
                            {AV.SLOTS[si]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <MasteryBar
            progress={progress} target={t.mastery_target} mastered={false}
            variant="panel" radius={18} padding="18px 20px" noteFirst
            sentenceSize={12.5} sentenceWeight={700} sentenceLineHeight={1.5}
            sentence={remaining === 0
              ? `You've mastered ${t.title} with ${firstName}`
              : `Complete ${t.mastery_target} sessions with ${firstName} to master ${t.title}`}
          />

          <div className="sep-card">
            <div className="sep-priceRow">
              <span className="sep-price">₹{t.rate}</span>
              <span className="sep-priceUnit">/ 60 min session</span>
            </div>
            <div className="sep-priceBtns">
              <button className="sep-btn sep-btn--primary" onClick={() => navigate("/skill-dev/book", { state: { expertId: t.id, bookFrom: "profile" } })}>
                Book a session
              </button>
              <button className="sep-btn sep-btn--secondary" disabled={!t.teacher_profile_id}
                onClick={() => navigate("/skill-messages", { state: { teacherId: t.teacher_profile_id, expertName: t.name } })}>
                Message {firstName}
              </button>
            </div>
            <div className="sep-facts">
              <div className="sep-fact"><span>Teaches in</span><b>{(t.languages || []).join(", ") || "—"}</b></div>
              <div className="sep-fact"><span>Responds in</span><b>Under 2 hours</b></div>
              {t.education && <div className="sep-fact"><span>Education</span><b>{t.education}</b></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
