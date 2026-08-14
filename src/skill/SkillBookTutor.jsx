// skill/SkillBookTutor.jsx — Skill Dev Student.dc.html dc:488-596.
//
// No tutor picker here anymore — this page is always reached per-teacher
// (Explore "Book", Profile "Book a session", Dashboard "Book again"), with
// `bookFrom` in router state driving the back-link label per WORKFLOW.md §7.
//
// GET  /skill/teachers/<id>/               → expert (mastery_target, my_mastery_progress)
// GET  /skill/teachers/<id>/availability/  → open/booked slots
// GET  /skill/teachers/<id>/pricing/       → is_free/tier/unit_price/bundle_*
// POST /skill/payments/create-order/       → create booking (reserves slot)

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar } from "./SkillUI";
import MasteryBar from "../components/MasteryBar";
import { useAuth } from "../contexts/AuthContext";
import { useCourse } from "../contexts/CourseContext";
import { LoadingState } from "../components/StateViews";
import * as AV from "./availability";
import "../styles/skillBookTutor.css";

const BACK_LABEL = { explore: "explore", profile: "profile", courses: "my courses", dashboard: "dashboard" };

const rupees = (paise) => `₹${Math.round(paise / 100)}`;

export default function SkillBookTutor() {
  const { api } = useAuth();
  const { setTrack } = useCourse();
  const location = useLocation();
  const navigate = useNavigate();
  const { expertId, slot: presetSlot, bookFrom = "explore" } = location.state || {};

  const [t, setT] = useState(null);
  const [avail, setAvail] = useState({ open: [], booked: [] });
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState(presetSlot || null);
  const [bundle, setBundle] = useState("single");
  const [message, setMessage] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookErr, setBookErr] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!expertId) { setLoading(false); return; }
    Promise.all([
      api.get(`/skill/teachers/${expertId}/`),
      api.get(`/skill/teachers/${expertId}/availability/`),
      api.get(`/skill/teachers/${expertId}/pricing/`),
    ])
      .then(([p, a, pr]) => {
        setT(p.data);
        setAvail({ open: a.data.open || [], booked: a.data.booked || [] });
        setPricing(pr.data);
      })
      .catch(() => setT(null))
      .finally(() => setLoading(false));
  }, [expertId, api]);

  if (loading) return <LoadingState label="Loading" />;
  if (!t) {
    return (
      <div className="sbk-empty">
        No tutor selected. <button className="sbk-link" onClick={() => navigate("/skill-dev/explore")}>Explore experts →</button>
      </div>
    );
  }

  const progress = t.my_mastery_progress ?? 0;
  const remaining = Math.max(0, t.mastery_target - progress);
  const dayLabels = AV.shortDayLabels();
  const isTrack = pricing?.tier === "bundle" && bundle === "track";
  const canConfirm = !!slot && !booking;

  const confirm = async () => {
    if (!canConfirm) return;
    setBooking(true);
    setBookErr("");
    try {
      await api.post("/skill/payments/create-order/", {
        teacherId: t.id,
        draft: {
          topic: `1-on-1 session with ${t.name}`,
          slot,
          slotLabel: AV.label(slot),
          duration_mins: 60,
          mode: "online",
          note: message,
          bundle,
        },
        method: "free",
        amount: 0,
      });
      // A learner who has never explicitly switched tracks defaults to
      // "academy" (CourseContext's DEFAULT_TRACK) — without this, the
      // generic "Dashboard" nav (sidebar/tab-bar) would send them to the
      // Academy dashboard right after booking, which has no idea this
      // session exists.
      setTrack("skill");
      setConfirmed(true);
    } catch (e) {
      setBookErr(e?.response?.data?.detail || "Booking failed. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  if (confirmed) {
    return (
      <div className="sbk-success">
        <div className="sbk-successIcon">✓</div>
        <h2>Session booked!</h2>
        <p>{AV.label(slot)} with {t.name}. A calendar invite and reminder are on their way.</p>
        <div className="sbk-successActions">
          <button className="sbk-btn sbk-btn--primary" onClick={() => navigate("/skill-dev/sessions")}>View my sessions</button>
          <button className="sbk-btn sbk-btn--secondary" onClick={() => navigate("/skill-dev/explore")}>Book another</button>
        </div>
      </div>
    );
  }

  const priceLine = (label) => (pricing?.is_free ? "Free" : label);

  return (
    <div className="sbk-screen">
      <button className="sbk-back" onClick={() => navigate(-1)}>← Back to {BACK_LABEL[bookFrom] || "explore"}</button>

      <div className="sbk-hero">
        <Avatar name={t.name} img={t.img} size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sbk-eyebrow">Booking a session with</div>
          <div className="sbk-heroName">{t.name}</div>
          <div className="sbk-heroMeta">{t.title} · ★ {t.rating ?? "—"} ({t.reviews_count} reviews)</div>
        </div>
        <button className="sbk-viewProfileBtn" onClick={() => navigate(`/skill-dev/profile/${t.id}`, { state: { bookFrom } })}>
          View profile
        </button>
      </div>

      <div className="sbk-cols">
        {/* Free times */}
        <div className="sbk-card">
          <h3 className="sbk-cardTitle">Free times this week</h3>
          <p className="sbk-cardSub">
            {t.name.split(" ")[0]} has opened {avail.open.filter((k) => !avail.booked.includes(k)).length} free slots this week · all times IST · 60 min sessions
          </p>
          <div className="sbk-slotRows">
            {AV.DAYS.map((d, di) => {
              const dayOpen = AV.SLOTS.map((_, si) => di + "-" + si)
                .filter((k) => avail.open.includes(k) && !avail.booked.includes(k));
              return (
                <div className="sbk-dayRow" key={d}>
                  <div className="sbk-dayLabel">{dayLabels[di]}</div>
                  {dayOpen.length === 0 ? (
                    <span className="sbk-notFree">No free time</span>
                  ) : dayOpen.map((k) => {
                    const si = Number(k.split("-")[1]);
                    return (
                      <span key={k} className={`sbk-timePill ${slot === k ? "is-selected" : ""}`} onClick={() => setSlot(k)}>
                        {AV.SLOTS[si]}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary panel */}
        <div className="sbk-card">
          <h3 className="sbk-cardTitle">Booking summary</h3>
          <div className="sbk-summaryExpert">
            <Avatar name={t.name} size={44} />
            <div>
              <div className="sbk-summaryName">{t.name}</div>
              <div className="sbk-summarySkill">{t.title}</div>
            </div>
          </div>

          <MasteryBar
            progress={progress} target={t.mastery_target} mastered={false}
            variant="panel" radius={12} padding="12px 13px" style={{ marginBottom: 14 }}
            sentenceSize={11.5} sentenceWeight={600} sentenceLineHeight={1.45}
            sentence={remaining > 0
              ? `${remaining} more session${remaining === 1 ? "" : "s"} with ${t.name.split(" ")[0]} to become an expert in ${t.title}`
              : `You've mastered ${t.title} with ${t.name.split(" ")[0]}.`}
          />

          {pricing?.tier === "intro" && (
            <div className="sbk-introPanel">
              <div className="sbk-introHead">
                <span className="sbk-introBadge">Intro rate</span>
                <span className="sbk-introHeadline">First session with {t.name.split(" ")[0]} is {rupees(pricing.unit_price)}</span>
              </div>
              <div className="sbk-introSub">
                Try the teacher before you commit. Regular sessions are {rupees(pricing.regular_unit_price)} after this one.
              </div>
            </div>
          )}

          {pricing?.tier === "bundle" && (
            <div className="sbk-bundleRows">
              <div className={`sbk-bundleCard ${bundle === "single" ? "is-selected" : ""}`} onClick={() => setBundle("single")}>
                <div className="sbk-bundleTop">
                  <span className="sbk-bundleDot" />
                  <span className="sbk-bundleTitle">Single session</span>
                  <span className="sbk-bundlePrice">{priceLine(rupees(pricing.unit_price))}</span>
                </div>
                <div className="sbk-bundleBlurb">One 60-minute class</div>
              </div>
              <div className={`sbk-bundleCard ${bundle === "track" ? "is-selected" : ""}`} onClick={() => setBundle("track")}>
                <div className="sbk-bundleTop">
                  <span className="sbk-bundleDot" />
                  <span className="sbk-bundleTitle">Complete the track</span>
                  <span className="sbk-bundlePrice">{priceLine(rupees(pricing.bundle_total))}</span>
                </div>
                <div className="sbk-bundleBlurb">
                  The {pricing.bundle_sessions} sessions left to master {t.title} — booked one at a time.
                </div>
                <span className="sbk-bundleSaveBadge">
                  {pricing.is_free ? "Best value" : `Save ${rupees(pricing.bundle_savings)}`}
                </span>
              </div>
            </div>
          )}

          <div className="sbk-summaryRows">
            <div className="sbk-row"><span>Slot</span><b>{slot ? AV.label(slot) : "Pick a slot"}</b></div>
            {isTrack && <div className="sbk-row"><span>Sessions</span><b>{pricing.bundle_sessions} sessions</b></div>}
            <div className="sbk-row"><span>Duration</span><b>60 min</b></div>
            <div className="sbk-row"><span>Price</span><b className="sbk-priceValue">{pricing?.is_free ? "Free during launch" : rupees(pricing?.unit_price ?? 0)}</b></div>
          </div>

          <textarea
            className="sbk-msgInput"
            placeholder="Optional message to the tutor…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />

          {bookErr && <div className="sbk-error">{bookErr}</div>}

          <button className={`sbk-confirmBtn ${canConfirm ? "is-enabled" : ""}`} disabled={!canConfirm} onClick={confirm}>
            {booking ? "Booking…" : !slot ? "Select a slot first" : bundle === "track" ? "Confirm track" : "Confirm booking"}
          </button>
          <p className="sbk-footnote">
            {isTrack
              ? "You'll pick the remaining slots after this one · reminder 30 min before each"
              : "You'll get a reminder 30 min before the session"}
          </p>
        </div>
      </div>
    </div>
  );
}
