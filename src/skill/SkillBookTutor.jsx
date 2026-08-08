// skill/SkillBookTutor.jsx — Book a session (design_handoff_skilldev
// README.md "4. Book a session"), rebuilt to the design's exact shape,
// verified against the live standalone prototype (hero strip, free-times
// grid restricted to THIS teacher's own slots, sticky summary panel with
// intro-rate panel / bundle selector, success state).
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
import { Avatar, StarRow } from "./SkillUI";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "../components/StateViews";
import * as AV from "./availability";
import "../styles/skillBookTutor.css";

const BACK_LABEL = { explore: "explore", profile: "profile", courses: "my courses", dashboard: "dashboard" };

const rupees = (paise) => `₹${Math.round(paise / 100)}`;

export default function SkillBookTutor() {
  const { api } = useAuth();
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

  const confirm = async () => {
    if (!slot || booking) return;
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
      setConfirmed(true);
    } catch (e) {
      setBookErr(e?.response?.data?.detail || "Booking failed. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  if (confirmed) {
    return (
      <div className="sbk-screen">
        <div className="sbk-success">
          <h2>Session booked!</h2>
          <p>{AV.label(slot)} with {t.name}. A calendar invite and reminder are on their way.</p>
          <div className="sbk-successActions">
            <button className="sbk-btn sbk-btn--primary" onClick={() => navigate("/skill-dev/sessions")}>View my sessions</button>
            <button className="sbk-btn sbk-btn--secondary" onClick={() => navigate("/skill-dev/explore")}>Book another</button>
          </div>
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
          <div className="sbk-heroMeta">
            {t.title} · <StarRow n={Math.round(t.rating || 0)} size={10} /> {t.rating ?? "—"} ({t.reviews_count} reviews)
          </div>
        </div>
        <button className="sbk-btn sbk-btn--outline" onClick={() => navigate(`/skill-dev/profile/${t.id}`, { state: { bookFrom } })}>
          View profile
        </button>
      </div>

      <div className="sbk-cols">
        {/* Free times */}
        <div className="sbk-card">
          <h4 className="sbk-cardTitle">Free times this week</h4>
          <p className="sbk-cardSub">
            {t.name.split(" ")[0]} has opened {avail.open.filter((k) => !avail.booked.includes(k)).length} free slots this week · all times IST · 60 min sessions
          </p>
          {AV.DAYS.map((d, di) => {
            const dayOpen = AV.SLOTS.map((_, si) => di + "-" + si)
              .filter((k) => avail.open.includes(k) && !avail.booked.includes(k));
            return (
              <div className="sbk-dayRow" key={d}>
                <div className="sbk-dayLabel">{dayLabels[di]}</div>
                <div className="sbk-dayPills">
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
              </div>
            );
          })}
        </div>

        {/* Summary panel */}
        <div className="sbk-summary">
          <div className="sbk-card">
            <h4 className="sbk-cardTitle">Booking summary</h4>
            <div className="sbk-summaryExpert">
              <Avatar name={t.name} size={36} />
              <div>
                <div className="sbk-summaryName">{t.name}</div>
                <div className="sbk-summarySkill">{t.title}</div>
              </div>
            </div>
            <div className="sbk-summaryProgress">{progress}/{t.mastery_target} sessions</div>
            <div className="sbk-summarySentence">
              {remaining > 0
                ? `${remaining} more session${remaining === 1 ? "" : "s"} with ${t.name.split(" ")[0]} to become an expert in ${t.title}`
                : `You've mastered ${t.title} with ${t.name.split(" ")[0]}.`}
            </div>

            {pricing?.tier === "intro" && (
              <div className="sbk-introPanel">
                <div className="sbk-introEyebrow">Intro rate</div>
                <div className="sbk-introLine">First session with {t.name.split(" ")[0]} is {rupees(pricing.unit_price)}</div>
                <div className="sbk-introSub">
                  Try the teacher before you commit. Regular sessions are {rupees(pricing.regular_unit_price)} after this one.
                </div>
              </div>
            )}

            {pricing?.tier === "bundle" && (
              <div className="sbk-bundleRow">
                <label className={`sbk-bundleCard ${bundle === "single" ? "is-selected" : ""}`}>
                  <input type="radio" name="bundle" checked={bundle === "single"} onChange={() => setBundle("single")} />
                  <div className="sbk-bundleLabel">Single session</div>
                  <div className="sbk-bundlePrice">{priceLine(rupees(pricing.unit_price))}</div>
                  <div className="sbk-bundleSub">One 60-minute class</div>
                </label>
                <label className={`sbk-bundleCard ${bundle === "track" ? "is-selected" : ""}`}>
                  {!pricing.is_free && <span className="sbk-savingsBadge">Save {rupees(pricing.bundle_savings)}</span>}
                  <span className="sbk-bestValue">Best value</span>
                  <input type="radio" name="bundle" checked={bundle === "track"} onChange={() => setBundle("track")} />
                  <div className="sbk-bundleLabel">Complete the track</div>
                  <div className="sbk-bundlePrice">{priceLine(rupees(pricing.bundle_total))}</div>
                  <div className="sbk-bundleSub">
                    The {pricing.bundle_sessions} sessions left to master {t.title} — booked one at a time.
                  </div>
                </label>
              </div>
            )}

            <div className="sbk-row"><span>Slot</span><b>{slot ? AV.label(slot) : "Pick a slot"}</b></div>
            <div className="sbk-row"><span>Duration</span><b>60 min</b></div>
            <div className="sbk-row"><span>Price</span><b>{pricing?.is_free ? "Free during launch" : rupees(pricing?.unit_price ?? 0)}</b></div>

            <textarea
              className="sbk-msgInput"
              placeholder="Optional message to the tutor…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />

            {bookErr && <div className="sbk-error">{bookErr}</div>}

            <button className="sbk-btn sbk-btn--primary sbk-btn--full" disabled={!slot || booking} onClick={confirm}>
              {booking ? "Booking…" : !slot ? "Select a slot first" : bundle === "track" ? "Confirm track" : "Confirm booking"}
            </button>
            <p className="sbk-footnote">You'll get a reminder 30 min before the session</p>
          </div>
        </div>
      </div>
    </div>
  );
}
