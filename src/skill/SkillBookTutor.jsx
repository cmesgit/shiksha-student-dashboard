// PLACEMENT: student_dashboard/src/skill/SkillBookTutor.jsx  (replace whole file)
//
// skill/SkillBookTutor.jsx — Book a Tutor (skillTab === "book").
//
// WHAT CHANGED (free-launch cleanup + payment seam)
// ─────────────────────────────────────────────────
//  • Fetches GET /skill/payment-config/ on mount. In free mode (today) the UI
//    is one-tap booking with an honest "Free during launch" summary. If a paid
//    mode ever comes back from the config before its UI ships, the confirm
//    button disables with "Online payment coming soon" instead of lying.
//    This is the seam: enabling payments later = implement the paid footer
//    branch here, nothing else moves.
//  • The "Pricing & packages" card (5-pack / 10-pack, Save 18%) is REMOVED —
//    it advertised purchases the platform cannot take. `packs` import dropped.
//  • All rate/price displays are stripped — booking is free at launch and
//    nothing in this UI implies a charge. Booking summary shows tutor + slot
//    + a "Free during launch" note.
//
// Wired to:
//   GET  /skill/payment-config/                    → live payment mode
//   GET  /skill/student/experts/                   → expert list
//   GET  /skill/teachers/<id>/availability/        → open/booked slots
//   POST /skill/payments/create-order/             → create booking (reserves slot)

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "./skillIcons";
import { Avatar, StarRow } from "./skillUI";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "../components/StateViews";
import * as AV from "./availability";

const ACC = "#ff8f01";

export default function SkillBookTutor({ openMsg = () => {} }) {
  const { api }  = useAuth();
  const location = useLocation();
  // Explore passes the chosen expert via nav state so the grid opens on the
  // RIGHT tutor (was always defaulting to the first expert → wrong slots).
  const wantedExpertId = location.state?.expertId || null;
  const [experts,    setExperts]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [ti,         setTi]         = useState(0);
  const [slot,       setSlot]       = useState(null);
  const [avail,      setAvail]      = useState({ open: [], booked: [] });
  const [tick,       setTick]       = useState(0);
  const [confirmed,  setConfirmed]  = useState(null);
  const [booking,    setBooking]    = useState(false);
  const [bookErr,    setBookErr]    = useState("");
  // Payment mode seam. Defaults to free so a config fetch failure never
  // blocks booking during the free launch.
  const [payCfg, setPayCfg] = useState({ provider: "free", is_free: true });

  // Load payment mode + expert list
  useEffect(() => {
    api.get("/skill/payment-config/")
      .then(r => setPayCfg({ provider: r.data.provider || "free", is_free: r.data.is_free !== false }))
      .catch(() => {}); // keep free defaults

    api.get("/skill/student/experts/")
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        setExperts(list);
        // If we arrived from Explore with a chosen expert, open on them.
        if (wantedExpertId) {
          const idx = list.findIndex(e => e.id === wantedExpertId);
          if (idx >= 0) setTi(idx);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const t = experts[ti];

  // Load availability whenever expert changes
  useEffect(() => {
    if (!t) return;
    // Real open/booked slots come from the expert's saved availability.
    api.get(`/skill/teachers/${t.id}/availability/`)
      .then(r => setAvail({ open: r.data.open || [], booked: r.data.booked || [] }))
      .catch(() => setAvail({ open: [], booked: [] }));  // expert hasn't set any slots yet
  }, [t?.id, tick]);

  const canBook = payCfg.is_free; // paid checkout UI ships with the payments launch

  const confirm = async () => {
    if (!slot || !t || !canBook) return;
    setBooking(true);
    setBookErr("");
    try {
      await api.post("/skill/payments/create-order/", {
        teacherId: t.id,
        draft: {
          topic:  `1-on-1 session with ${t.name}`,
          slot,
          slotLabel: AV.label(slot),
          duration_mins: 60,
          mode: "online",
        },
        method: payCfg.provider,
        amount: 0,
      });
      // Slot is now reserved server-side; refetch availability so the grid
      // reflects the real booked state (tick bump re-runs the load effect).
      setConfirmed(AV.label(slot));
      setSlot(null);
      setTick(n => n + 1);
    } catch (e) {
      setBookErr(e?.response?.data?.detail || "Booking failed. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading experts" />;
  }

  if (experts.length === 0) {
    return (
      <div style={{ padding: "14px 18px 22px" }}>
        <div className="rd-card" style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontSize: 13, color: "#888" }}>No experts available right now. Check back soon.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1, "--acc": ACC, "--acc-bg": "#fff8f0" }}>
      {confirmed && (
        <div style={{ marginBottom: 12, background: "#ecf8ee", border: "1px solid #bfe6c8", color: "#1f7a37", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon.check size={15} /> Booked {confirmed} with {t?.name}. It's now locked on the tutor's calendar.
        </div>
      )}
      {bookErr && (
        <div style={{ marginBottom: 12, background: "#fef2f2", border: "1px solid #fca5a5", color: "#c0492f", borderRadius: 10, padding: "10px 14px", fontSize: 12.5 }}>
          {bookErr}
        </div>
      )}

      {/* Tutor selector */}
      <div className="rd-card" style={{ marginBottom: 14 }}>
        <h4>Choose a tutor</h4>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {experts.map((bt, i) => (
            <button key={bt.id} onClick={() => { setTi(i); setSlot(null); setConfirmed(null); setBookErr(""); }}
              style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "9px 13px 9px 9px", borderRadius: 12, border: `1.5px solid ${i === ti ? ACC : "#e3dccf"}`, background: i === ti ? "#fff8f0" : "#fff" }}>
              <Avatar name={bt.name} img={bt.img} size={38} circle />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a1a" }}>{bt.name}</div>
                <div style={{ fontSize: 10.5, color: "#999" }}>{bt.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {t && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* Availability calendar */}
          <div className="rd-card" style={{ flex: 2, minWidth: 320 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
              <Avatar name={t.name} img={t.img} size={52} radius={12} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: "#1a1a1a" }}>{t.name}</div>
                <div style={{ fontSize: 11.5, color: "#888" }}>{t.role}</div>
                <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: "#6b7c83", alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <StarRow n={Math.round(t.rating || 4)} size={10} /> {t.rating ?? "—"}
                  </span>
                  <span>Replies {t.reply}</span>
                </div>
              </div>
              <button onClick={() => openMsg(t.teacher_id, t.name)} disabled={!t.teacher_id} style={{ background: "#fff", border: "1px solid #f0d7b6", color: "#d97706", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, cursor: t.teacher_id ? "pointer" : "not-allowed", opacity: t.teacher_id ? 1 : 0.45, display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <Icon.msg size={14} /> Message
              </button>
            </div>

            {t.intro_video_embed_url && (
              <div style={{ marginBottom: 14 }}>
                <iframe
                  src={t.intro_video_embed_url}
                  title={`${t.name} intro`}
                  style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 10 }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#1a2c33" }}>Pick a time · this week</div>
              <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: "#6b7c83" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: ACC }} /> Open</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "#f0a23b" }} /> Booked</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "#f5f1ea", border: "1px solid #e3dccf" }} /> Closed</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: `64px repeat(${AV.DAYS.length}, 1fr)`, gap: 6, alignItems: "center" }}>
              <div></div>
              {AV.dateLabels().map((d) => <div key={d} style={{ fontSize: 10.5, fontWeight: 700, color: "#6b7c83", textAlign: "center" }}>{d}</div>)}
              {AV.SLOTS.map((sl, si) => (
                <div key={sl} style={{ display: "contents" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9aa9af", textAlign: "right", paddingRight: 4 }}>{sl}</div>
                  {AV.DAYS.map((d, di) => {
                    const k  = di + "-" + si;
                    const st = avail.booked.includes(k) ? "booked" : avail.open.includes(k) ? "open" : "closed";
                    if (st === "booked") return <button key={di} disabled className="slot booked" title="Already booked"><Icon.check size={11} /></button>;
                    if (st === "closed") return <button key={di} disabled className="slot off">—</button>;
                    if (AV.isPastToday(di, si)) return <button key={di} disabled className="slot off" title="Time has passed today">—</button>;
                    return <button key={di} onClick={() => setSlot(k)} className={`slot ${slot === k ? "on" : ""}`} />;
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Booking summary */}
          <div style={{ flex: 1, minWidth: 210, display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="rd-card" style={{ background: "#fff8f0", border: "1px solid #f3d9bd" }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", color: "#d97706", marginBottom: 8 }}>Booking summary</div>
              <div style={{ fontSize: 12.5, color: "#444", lineHeight: 1.8 }}>
                <div><b>{t.name}</b> · {t.role}</div>
                <div>{slot ? AV.label(slot) : "Pick a time slot above"}</div>
                <div>1-on-1 session · 60 min</div>
              </div>

              {/* Free-launch note — replaces the old packages/price rows. */}
              {canBook ? (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 7, background: "#ecf8ee", border: "1px solid #bfe6c8", color: "#1f7a37", borderRadius: 8, padding: "8px 10px", fontSize: 11.5, fontWeight: 700 }}>
                  Free during launch — no payment needed.
                </div>
              ) : (
                <div style={{ marginTop: 10, background: "#fef9ec", border: "1px solid #f3d9bd", color: "#b45309", borderRadius: 8, padding: "8px 10px", fontSize: 11.5, fontWeight: 700 }}>
                  Online payment is coming soon. Booking will open when it launches.
                </div>
              )}

              <button onClick={confirm} disabled={!slot || booking || !canBook}
                style={{ width: "100%", marginTop: 12, background: slot && canBook ? ACC : "#e3dccf", color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 13, fontWeight: 800, cursor: slot && canBook ? "pointer" : "not-allowed" }}>
                {booking ? "Booking…" : !canBook ? "Booking opens with payments" : slot ? "Confirm free booking" : "Select a slot to continue"}
              </button>
            </div>

            <div className="rd-card">
              <div style={{ fontSize: 11.5, color: "#6b7c83", lineHeight: 1.7 }}>
                The tutor reviews your request and accepts it — you'll see it move
                from <b>Requested</b> to <b>Confirmed</b> in My Skill Sessions.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
