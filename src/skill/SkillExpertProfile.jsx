// skill/SkillExpertProfile.jsx — NEW screen (design_handoff_skilldev
// README.md "3. Expert profile"), verified against the live prototype.
// Reached from Explore's "View profile" or Book's "View profile" link;
// `bookFrom` (carried via router state) is what makes the back-link read
// "Back to explore" vs "Back to profile"/"my courses"/"dashboard" per
// WORKFLOW.md §7's `bookFrom` state key.
//
// GET /skill/teachers/<id>/         → profile (ExpertCardSerializer)
// GET /skill/teachers/<id>/availability/ → this week's free/booked slots

import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Icon } from "./skillIcons";
import { Avatar, StarRow } from "./skillUI";
import { avatarColor } from "./skillColors";
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
  const openSlotsCount = avail.open.filter((k) => !avail.booked.includes(k)).length;
  const dayLabels = AV.shortDayLabels();

  return (
    <div className="sep-screen">
      <button className="sep-back" onClick={() => navigate(-1)}>← Back to {BACK_LABEL[from] || "explore"}</button>

      <div className="sep-cols">
        {/* Left column */}
        <div>
          <div className="sep-heroCard">
            <div
              className="sep-video"
              style={playing ? undefined : { background: `linear-gradient(135deg, ${avatarColor(t.name)}, #1a2c33)` }}
              onClick={() => t.intro_video_embed_url && setPlaying((p) => !p)}
            >
              {playing && t.intro_video_embed_url ? (
                <iframe src={t.intro_video_embed_url} title={`${t.name} intro`} className="sep-videoFrame"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              ) : (
                <>
                  {/* No duration pill: unlike the mockup's fixture data, no
                      backend field stores the intro video's actual length —
                      showing a fabricated number would be worse than omitting it. */}
                  <span className="sep-videoPill sep-videoPill--top">INTRO VIDEO</span>
                  <button className="sep-playDisc" aria-label="Play intro video"><Icon.vid size={26} /></button>
                </>
              )}
            </div>
            <div className="sep-heroBody">
              <Avatar name={t.name} img={t.img} size={54} />
              <div className="sep-heroName">{t.name}</div>
              <div className="sep-heroTitle">{t.title}</div>
              <div className="sep-ratingRow">
                <StarRow n={Math.round(t.rating || 0)} size={13} /> {t.rating ?? "—"}
                <span className="sep-reviewsCount"> ({t.reviews_count} reviews)</span>
              </div>
              <div className="sep-statGrid">
                <div><div className="sep-statValue">{t.sessions}</div><div className="sep-statLabel">Sessions taught</div></div>
                <div><div className="sep-statValue">{t.experience_years ?? "—"}</div><div className="sep-statLabel">Years experience</div></div>
                <div><div className="sep-statValue">{t.mastery_target}</div><div className="sep-statLabel">Sessions to master</div></div>
                <div><div className="sep-statValue">{openSlotsCount}</div><div className="sep-statLabel">Free slots this week</div></div>
              </div>
            </div>
          </div>

          <h3 className="sep-h">About</h3>
          <p className="sep-about">{t.bio}</p>
          {t.subject_description && <p className="sep-about">{t.subject_description}</p>}

          {t.skills?.length > 0 && (
            <>
              <h3 className="sep-h">Areas of expertise</h3>
              <div className="sep-pills">
                {t.skills.map((s) => <span key={s} className="sep-pill">{s}</span>)}
              </div>
            </>
          )}

          {t.experience_timeline?.length > 0 && (
            <>
              <h3 className="sep-h">Experience</h3>
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
            </>
          )}
        </div>

        {/* Right column — sticky */}
        <div className="sep-rail">
          <div className="sep-card">
            <h4 className="sep-cardTitle">Free times this week</h4>
            <p className="sep-cardSub">{openSlotsCount} open slots · all times IST · tap one to book</p>
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

          <div className="sep-card sep-card--tint">
            <MasteryBar
              progress={progress} target={t.mastery_target} mastered={false} variant="card"
              sentence={`Complete ${t.mastery_target} sessions with ${t.name.split(" ")[0]} to master ${t.title}`}
            />
          </div>

          <div className="sep-card">
            <div className="sep-priceRow">
              <span className="sep-price">₹{t.rate}</span>
              <span className="sep-priceUnit">/ 60 min session</span>
            </div>
            <button className="sep-btn sep-btn--primary" onClick={() => navigate("/skill-dev/book", { state: { expertId: t.id, bookFrom: "profile" } })}>
              Book a session
            </button>
            <button className="sep-btn sep-btn--secondary" disabled={!t.teacher_profile_id}
              onClick={() => navigate("/skill-messages", { state: { teacherId: t.teacher_profile_id, expertName: t.name } })}>
              Message {t.name.split(" ")[0]}
            </button>
            <div className="sep-facts">
              <div><span>Teaches in</span><b>{(t.languages || []).join(", ") || "—"}</b></div>
              <div><span>Responds in</span><b>Under 2 hours</b></div>
              {t.education && <div><span>Education</span><b>{t.education}</b></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
