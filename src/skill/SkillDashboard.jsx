// skill/SkillDashboard.jsx — Skill Dev overview (skillTab === "dashboard").
// Stats + "continue where you left off" + next sessions + experts you follow.

import { Icon } from "./skillIcons";
import { Avatar } from "./skillUI";
import { SP_COURSES, LIVE_UPCOMING, RECOMMENDED } from "./skillData";

const ACC = "#ff8f01";

function Stat({ icon, value, label }) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(9,62,5,.16)", borderRadius: 13, padding: "13px 14px" }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: "#fff3e3", color: ACC, display: "grid", placeItems: "center", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: "var(--font-head, Montserrat)", fontWeight: 900, fontSize: 23, color: "#0e1c0f", letterSpacing: "-.6px" }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(14,28,15,.6)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function SkillDashboard({ setTab = () => {}, openMsg = () => {} }) {
  const lead = SP_COURSES[0];
  const lessonsDone = SP_COURSES.reduce((a, c) => a + c.done, 0);
  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 13 }}>
        <Stat icon={<Icon.cap size={16} />} value={SP_COURSES.length} label="Enrolled" />
        <Stat icon={<Icon.check size={16} />} value={lessonsDone} label="Lessons done" />
        <Stat icon={<Icon.clock size={16} />} value="12" label="Hours learned" />
        <Stat icon={<Icon.cal size={16} />} value={LIVE_UPCOMING.length} label="Upcoming" />
      </div>

      <div className="rd-card" style={{ marginBottom: 13, background: "linear-gradient(105deg,#2a1c0b,#46300f)", border: "none", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Avatar name={lead.expert} img={lead.img} size={52} radius={12} />
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".5px", textTransform: "uppercase", color: "#ffb968" }}>Continue where you left off</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>{lead.title}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 2 }}>{lead.resume.mod} · {lead.resume.lesson}</div>
            <div style={{ marginTop: 9, height: 6, borderRadius: 100, background: "rgba(255,255,255,.18)", maxWidth: 360, overflow: "hidden" }}>
              <div style={{ width: `${lead.pct}%`, height: "100%", background: ACC, borderRadius: 100 }} />
            </div>
          </div>
          <button onClick={() => setTab("courses")} style={{ background: ACC, color: "#fff", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}><Icon.vid size={15} /> Resume</button>
        </div>
      </div>

      <div className="rd-card" style={{ marginBottom: 13 }}>
        <h4>Next up</h4>
        {LIVE_UPCOMING.map((s) => (
          <div key={s.topic} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid #efe2d6", borderRadius: 12, marginBottom: 9, background: "#fff" }}>
            <Avatar name={s.tutor} img={s.img} size={44} radius={11} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1a2c33" }}>{s.topic}</div>
              <div style={{ fontSize: 11.5, color: "#888" }}>with {s.tutor} · {s.role}</div>
              <div style={{ display: "flex", gap: 12, marginTop: 5, fontSize: 11.5, color: "#6b7c83" }}>
                <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Icon.cal size={12} /> {s.when}</span>
              </div>
            </div>
            <button onClick={() => openMsg(s.tutor)} title="Message" style={{ background: "#fff", border: "1px solid #f0d7b6", color: "#d97706", borderRadius: 9, width: 36, height: 36, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon.msg size={15} /></button>
            {s.live
              ? <button style={{ background: ACC, color: "#fff", border: "none", borderRadius: 9, padding: "9px 15px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Join</button>
              : <button style={{ background: "#fff", border: "1px solid #e3dccf", color: "#555", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Details</button>}
          </div>
        ))}
      </div>

      <div className="rd-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
          <h4 style={{ margin: 0 }}>Experts you follow</h4>
          <button onClick={() => setTab("explore")} style={{ background: "none", border: "none", color: "#d97706", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Explore →</button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {RECOMMENDED.map((t) => (
            <div key={t.name} style={{ flex: 1, minWidth: 150, display: "flex", gap: 10, alignItems: "center", border: "1px solid #efe2d6", borderRadius: 12, padding: 10 }}>
              <Avatar name={t.name} img={t.img} size={40} radius={10} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                <div style={{ fontSize: 10.5, color: "#999", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon.star size={10} /> {t.rating} · ₹{t.rate}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
