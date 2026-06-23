// skill/SkillCourses.jsx — Self-paced courses (skillTab === "courses").
// Udemy-style: continue banner, in-progress cards with expandable curriculum,
// completed list with the learner's review + certificate.

import { useState } from "react";
import { Icon } from "./skillIcons";
import { Avatar, StarRow, Rating } from "./skillUI";
import { SP_COURSES, SP_DONE } from "./skillData";

const ACC = "#ff8f01";

export default function SkillCourses() {
  const [open, setOpen] = useState(0); // expanded curriculum index
  const lead = SP_COURSES[0];
  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1 }}>
      {/* continue where you left off */}
      <div className="rd-card" style={{ marginBottom: 14, background: "linear-gradient(105deg,#2a1c0b,#46300f)", border: "none", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Avatar name={lead.expert} img={lead.img} size={54} radius={12} />
          <div style={{ flex: 1, minWidth: 190 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".5px", textTransform: "uppercase", color: "#ffb968" }}>Continue where you left off</div>
            <div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 3 }}>{lead.title}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 2 }}>{lead.resume.mod} · {lead.resume.lesson}</div>
            <div style={{ marginTop: 10, height: 6, borderRadius: 100, background: "rgba(255,255,255,.18)", maxWidth: 380, overflow: "hidden" }}>
              <div style={{ width: `${lead.pct}%`, height: "100%", background: ACC, borderRadius: 100 }} />
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.6)", marginTop: 5 }}>{lead.resume.at} · {lead.pct}% complete</div>
          </div>
          <button style={{ background: ACC, color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}><Icon.vid size={15} /> Resume lesson</button>
        </div>
      </div>

      {/* in-progress course cards */}
      <div className="rd-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>My courses · self-paced</h4>
          <span style={{ fontSize: 11.5, color: "#999" }}>{SP_COURSES.length} in progress</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
          {SP_COURSES.map((c, i) => (
            <div key={c.title} className="sp-card">
              <div className="sp-thumb" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}b0)` }}>
                <Icon.vid size={26} />
                <span style={{ position: "absolute", top: 9, left: 10, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", background: "rgba(255,255,255,.22)", padding: "3px 8px", borderRadius: 100 }}>{c.cat}</span>
                <span style={{ position: "absolute", bottom: 9, right: 10, fontSize: 10, fontWeight: 700, background: "rgba(0,0,0,.28)", padding: "3px 8px", borderRadius: 100 }}>{c.total} lessons · {c.hrs}</span>
              </div>
              <div style={{ padding: 13 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a" }}>{c.title}</div>
                <div style={{ fontSize: 11.5, color: "#888", marginTop: 2 }}>Expert · {c.expert}</div>
                <div style={{ marginTop: 7 }}><Rating v={c.rating} reviews={c.reviews} /></div>
                <div style={{ margin: "11px 0 6px", height: 7, borderRadius: 100, background: "#f0e6dc", overflow: "hidden" }}><div style={{ width: `${c.pct}%`, height: "100%", background: ACC, borderRadius: 100 }} /></div>
                <div style={{ fontSize: 11, color: "#999" }}>{c.done} of {c.total} lessons · {c.pct}%</div>
                <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                  <button style={{ flex: 1, background: ACC, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Continue</button>
                  <button onClick={() => setOpen(open === i ? -1 : i)} style={{ background: "#fff", border: "1px solid #e3dccf", color: "#555", borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {open === i ? "Hide" : "Curriculum"} <span style={{ transition: "transform .15s", transform: open === i ? "rotate(90deg)" : "none", display: "flex" }}><Icon.arrow size={12} /></span>
                  </button>
                </div>
                {open === i && (
                  <div style={{ marginTop: 12 }}>
                    {c.modules.map((m, mi) => (
                      <div key={mi} className="sp-mod">
                        <span style={{ width: 24, height: 24, borderRadius: 7, background: m.done ? "#2f9d4218" : m.cur ? "#ff8f0118" : "#f1ece6", color: m.done ? "#2f9d42" : m.cur ? "#d97706" : "#999", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{m.done ? <Icon.check size={13} /> : mi + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a2c33" }}>{m.t}</div>
                          <div style={{ fontSize: 10.5, color: "#999" }}>{m.n} videos · {m.d}</div>
                        </div>
                        {m.cur && <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", color: "#d97706", background: "#ff8f0118", padding: "3px 8px", borderRadius: 100, flexShrink: 0 }}>In progress</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* completed + reviews */}
      <div className="rd-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>Completed</h4>
          <span style={{ fontSize: 11.5, color: "#999" }}>certificate &amp; your review</span>
        </div>
        {SP_DONE.map((c) => (
          <div key={c.title} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 0", borderBottom: "1px solid #eee" }}>
            <Avatar name={c.expert} img={c.img} size={44} radius={10} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" }}>{c.title}</div>
              <div style={{ fontSize: 11.5, color: "#888" }}>Expert · {c.expert} · {c.date}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 10.5, color: "#999" }}>Your review:</span><StarRow n={c.myRating} />
              </div>
            </div>
            <button style={{ background: "#fff", border: "1px solid #f0d7b6", color: "#d97706", borderRadius: 8, padding: "7px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}><Icon.award size={13} /> Certificate</button>
          </div>
        ))}
      </div>
    </div>
  );
}
