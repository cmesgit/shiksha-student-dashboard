// skill/SkillBookTutor.jsx — Book a Tutor (skillTab === "book").
// Tutor picker + weekly availability calendar + packages + booking summary.
// The calendar reads the shared availability store; confirming a slot books it
// (marks it "booked"), the same state the expert's Availability/Bookings see.

import { useState } from "react";
import { Icon } from "./skillIcons";
import { Avatar, StarRow, inr } from "./skillUI";
import { BOOK_TUTORS, packs } from "./skillData";
import * as AV from "./availability";

const ACC = "#ff8f01";

export default function SkillBookTutor({ openMsg = () => {} }) {
  const [ti, setTi] = useState(0);
  const [slot, setSlot] = useState(null);
  const [pk, setPk] = useState(1);
  const [tick, setTick] = useState(0);        // bump to re-read store after booking
  const [confirmed, setConfirmed] = useState(null);

  const t = BOOK_TUTORS[ti];
  const avail = AV.get(t.id);                  // re-read each render (tick forces it)
  const pks = packs(t.rate);

  const confirm = () => {
    if (!slot) return;
    AV.book(t.id, slot);                       // ← shared store; expert side sees this
    setConfirmed(AV.label(slot));
    setSlot(null);
    setTick((n) => n + 1);
  };

  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1, "--acc": ACC, "--acc-bg": "#fff8f0" }}>
      {confirmed && (
        <div style={{ marginBottom: 12, background: "#ecf8ee", border: "1px solid #bfe6c8", color: "#1f7a37", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon.check size={15} /> Booked {confirmed} with {t.name}. It's now locked on the tutor's calendar.
        </div>
      )}

      {/* tutor selector */}
      <div className="rd-card" style={{ marginBottom: 14 }}>
        <h4>Choose a tutor</h4>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {BOOK_TUTORS.map((bt, i) => (
            <button key={bt.name} onClick={() => { setTi(i); setSlot(null); setConfirmed(null); }} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "9px 13px 9px 9px", borderRadius: 12, border: `1.5px solid ${i === ti ? ACC : "#e3dccf"}`, background: i === ti ? "#fff8f0" : "#fff" }}>
              <Avatar name={bt.name} img={bt.img} size={38} circle />
              <div><div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a1a" }}>{bt.name}</div><div style={{ fontSize: 10.5, color: "#999" }}>{bt.role} · ₹{bt.rate}/hr</div></div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* availability calendar */}
        <div className="rd-card" style={{ flex: 2, minWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
            <Avatar name={t.name} img={t.img} size={52} radius={12} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "#1a1a1a" }}>{t.name}</div>
              <div style={{ fontSize: 11.5, color: "#888" }}>{t.role}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: "#6b7c83", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><StarRow n={Math.round(t.rating)} size={10} /> {t.rating}</span>
                <span>Replies {t.reply}</span>
              </div>
            </div>
            <button onClick={() => openMsg(t.name)} style={{ background: "#fff", border: "1px solid #f0d7b6", color: "#d97706", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}><Icon.msg size={14} /> Message</button>
          </div>
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
            {AV.DAYS.map((d) => <div key={d} style={{ fontSize: 10.5, fontWeight: 700, color: "#6b7c83", textAlign: "center" }}>{d}</div>)}
            {AV.SLOTS.map((sl, si) => (
              <div key={sl} style={{ display: "contents" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9aa9af", textAlign: "right", paddingRight: 4 }}>{sl}</div>
                {AV.DAYS.map((d, di) => {
                  const k = di + "-" + si;
                  const st = avail.booked.includes(k) ? "booked" : avail.open.includes(k) ? "open" : "closed";
                  if (st === "booked") return <button key={di} disabled className="slot booked" title="Already booked"><Icon.check size={11} /></button>;
                  if (st === "closed") return <button key={di} disabled className="slot off">—</button>;
                  return <button key={di} onClick={() => setSlot(k)} className={`slot ${slot === k ? "on" : ""}`} />;
                })}
              </div>
            ))}
          </div>
        </div>

        {/* packages + summary */}
        <div style={{ flex: 1, minWidth: 210, display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="rd-card">
            <h4>Pricing &amp; packages</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {pks.map((p, i) => (
                <button key={p.n} onClick={() => setPk(i)} className={`pack ${i === pk ? "on" : ""}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${i === pk ? ACC : "#cdbfa8"}`, display: "grid", placeItems: "center", flexShrink: 0 }}>{i === pk && <span style={{ width: 9, height: 9, borderRadius: "50%", background: ACC }} />}</span>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: "#1a1a1a" }}>{p.label}</div>
                    <div style={{ fontSize: 10.5, color: "#999" }}>₹{p.per}/session{p.n > 1 ? ` · ${p.n} sessions` : ""}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1a2c33" }}>₹{inr(p.total)}</div>
                    {p.save && <div style={{ fontSize: 9.5, fontWeight: 800, color: "#2f9d42" }}>{p.save}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="rd-card" style={{ background: "#fff8f0", border: "1px solid #f3d9bd" }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", color: "#d97706", marginBottom: 8 }}>Booking summary</div>
            <div style={{ fontSize: 12.5, color: "#444", lineHeight: 1.8 }}>
              <div><b>{t.name}</b> · {t.role}</div>
              <div>{slot ? AV.label(slot) : "Pick a time slot above"}</div>
              <div>{pks[pk].label} — ₹{inr(pks[pk].total)}</div>
            </div>
            <button onClick={confirm} disabled={!slot} style={{ width: "100%", marginTop: 12, background: slot ? ACC : "#e3dccf", color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 13, fontWeight: 800, cursor: slot ? "pointer" : "not-allowed" }}>{slot ? "Confirm booking" : "Select a slot to continue"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
