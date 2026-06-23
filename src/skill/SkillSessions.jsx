// skill/SkillSessions.jsx — Live 1-on-1 sessions (skillTab === "sessions").
// Active package tracker, upcoming sessions, past sessions with review state.

import { Icon } from "./skillIcons";
import { Avatar } from "./skillUI";
import { LIVE_PACKAGE, LIVE_UPCOMING, LIVE_PAST } from "./skillData";

const ACC = "#ff8f01";

export default function SkillSessions({ setTab = () => {}, openMsg = () => {} }) {
  const used = LIVE_PACKAGE.total - LIVE_PACKAGE.remaining;
  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1 }}>
      {/* active package */}
      <div className="rd-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span style={{ width: 44, height: 44, borderRadius: 11, background: "#ff8f0118", color: "#d97706", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon.spark size={20} /></span>
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1a1a1a" }}>{LIVE_PACKAGE.label} · {LIVE_PACKAGE.tutor}</div>
            <div style={{ fontSize: 11.5, color: "#888", marginTop: 2 }}>{LIVE_PACKAGE.remaining} of {LIVE_PACKAGE.total} sessions remaining</div>
            <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
              {Array.from({ length: LIVE_PACKAGE.total }).map((_, i) => <span key={i} style={{ width: 24, height: 6, borderRadius: 100, background: i < used ? "#e3dccf" : ACC }} />)}
            </div>
          </div>
          <button onClick={() => setTab("book")} style={{ background: ACC, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Book next session</button>
        </div>
      </div>

      {/* upcoming */}
      <div className="rd-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>Upcoming 1-on-1 sessions</h4>
          <button onClick={() => setTab("book")} style={{ background: "none", border: "none", color: "#d97706", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Book a tutor →</button>
        </div>
        {LIVE_UPCOMING.map((s) => (
          <div key={s.topic} style={{ display: "flex", alignItems: "center", gap: 13, padding: 13, border: "1px solid #efe2d6", borderRadius: 13, marginBottom: 10, background: "#fff" }}>
            <Avatar name={s.tutor} img={s.img} size={48} radius={11} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#1a2c33" }}>{s.topic}</div>
              <div style={{ fontSize: 11.5, color: "#888" }}>with {s.tutor} · {s.role}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11.5, color: "#6b7c83" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon.cal size={12} /> {s.when}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon.clock size={12} /> {s.dur}</span>
              </div>
            </div>
            <button onClick={() => openMsg(s.tutor)} title="Message" style={{ background: "#fff", border: "1px solid #f0d7b6", color: "#d97706", borderRadius: 9, width: 38, height: 38, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon.msg size={15} /></button>
            {s.live
              ? <button style={{ background: ACC, color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0 }}><Icon.vid size={14} /> Join</button>
              : <button style={{ background: "#fff", border: "1px solid #e3dccf", color: "#555", borderRadius: 9, padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Reschedule</button>}
          </div>
        ))}
      </div>

      {/* past */}
      <div className="rd-card">
        <h4>Past sessions</h4>
        {LIVE_PAST.map((s) => (
          <div key={s.topic} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #eee" }}>
            <Avatar name={s.tutor} img={s.img} size={42} radius={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{s.topic}</div>
              <div style={{ fontSize: 11.5, color: "#888" }}>with {s.tutor} · {s.when}</div>
            </div>
            {s.reviewed
              ? <span style={{ fontSize: 11.5, color: "#2f9d42", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon.check size={13} /> Reviewed</span>
              : <button style={{ background: ACC, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon.star size={12} /> Leave review</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
