// skill/SkillCourses.jsx — Self-paced courses (skillTab === "courses").
// Wired to GET /skill/student/dashboard/ (courses) +
//          POST /skill/my-courses/<id>/progress/  (mark lecture done)

import { useState, useEffect } from "react";
import { Icon } from "./skillIcons";
import { Avatar, StarRow, Rating } from "./skillUI";
import { useAuth } from "../contexts/AuthContext";

const ACC = "#ff8f01";

export default function SkillCourses() {
  const { api } = useAuth();
  const [courses,   setCourses]   = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [open,      setOpen]      = useState(0);
  const [advancing, setAdvancing] = useState({});

  useEffect(() => {
    api.get("/skill/student/dashboard/")
      .then(r => {
        setCourses(r.data.skill_courses    || []);
        setCompleted(r.data.completed_courses || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Mark the next lecture done — POST /skill/my-courses/<id>/progress/
  const markProgress = async (courseId, enrollmentId) => {
    setAdvancing(a => ({ ...a, [courseId]: true }));
    try {
      // We don't have a specific lecture_id here (UI doesn't expose individual lecture IDs yet).
      // The endpoint requires lecture_id; for now just navigate to the course.
      // When the course player is built, pass the actual lecture UUID.
      // TODO: navigate to /my-courses/<courseId> for the full player
      window.location.href = `/my-courses/${courseId}`;
    } finally {
      setAdvancing(a => { const n = { ...a }; delete n[courseId]; return n; });
    }
  };

  const lead = courses[0];

  if (loading) {
    return (
      <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1 }}>
        <div style={{ fontSize: 12, color: "#888" }}>Loading courses…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1 }}>
      {/* Continue where you left off */}
      {lead ? (
        <div className="rd-card" style={{ marginBottom: 14, background: "linear-gradient(105deg,#2a1c0b,#46300f)", border: "none", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <Avatar name={lead.expert} img={lead.img} size={54} radius={12} />
            <div style={{ flex: 1, minWidth: 190 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".5px", textTransform: "uppercase", color: "#ffb968" }}>Continue where you left off</div>
              <div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 3 }}>{lead.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 2 }}>
                {lead.resume.mod} · {lead.resume.lesson}
              </div>
              <div style={{ marginTop: 10, height: 6, borderRadius: 100, background: "rgba(255,255,255,.18)", maxWidth: 380, overflow: "hidden" }}>
                <div style={{ width: `${lead.pct}%`, height: "100%", background: ACC, borderRadius: 100 }} />
              </div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.6)", marginTop: 5 }}>{lead.resume.at} · {lead.pct}% complete</div>
            </div>
            <button
              onClick={() => markProgress(lead.id, lead.enrollment_id)}
              style={{ background: ACC, color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <Icon.vid size={15} /> Resume lesson
            </button>
          </div>
        </div>
      ) : (
        <div className="rd-card" style={{ marginBottom: 14, textAlign: "center", padding: "24px 16px" }}>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 10 }}>No courses in progress yet.</div>
        </div>
      )}

      {/* In-progress cards */}
      {courses.length > 0 && (
        <div className="rd-card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h4 style={{ margin: 0 }}>My courses · self-paced</h4>
            <span style={{ fontSize: 11.5, color: "#999" }}>{courses.length} in progress</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
            {courses.map((c, i) => (
              <div key={c.id} className="sp-card">
                <div className="sp-thumb" style={{ background: `linear-gradient(135deg, ${c.color || "#0a808a"}, ${c.color || "#0a808a"}b0)` }}>
                  <Icon.vid size={26} />
                  <span style={{ position: "absolute", top: 9, left: 10, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".4px", background: "rgba(255,255,255,.22)", padding: "3px 8px", borderRadius: 100 }}>
                    {c.cat}
                  </span>
                  <span style={{ position: "absolute", bottom: 9, right: 10, fontSize: 10, fontWeight: 700, background: "rgba(0,0,0,.28)", padding: "3px 8px", borderRadius: 100 }}>
                    {c.total} lessons · {c.hrs}
                  </span>
                </div>
                <div style={{ padding: 13 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a" }}>{c.title}</div>
                  <div style={{ fontSize: 11.5, color: "#888", marginTop: 2 }}>Expert · {c.expert}</div>
                  {c.rating && (
                    <div style={{ marginTop: 7 }}><Rating v={c.rating} reviews={c.reviews} /></div>
                  )}
                  <div style={{ margin: "11px 0 6px", height: 7, borderRadius: 100, background: "#f0e6dc", overflow: "hidden" }}>
                    <div style={{ width: `${c.pct}%`, height: "100%", background: ACC, borderRadius: 100 }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#999" }}>{c.done} of {c.total} lessons · {c.pct}%</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                    <button
                      onClick={() => markProgress(c.id, c.enrollment_id)}
                      disabled={advancing[c.id]}
                      style={{ flex: 1, background: ACC, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                    >
                      {advancing[c.id] ? "…" : "Continue"}
                    </button>
                    <button
                      onClick={() => setOpen(open === i ? -1 : i)}
                      style={{ background: "#fff", border: "1px solid #e3dccf", color: "#555", borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      {open === i ? "Hide" : "Curriculum"}
                      <span style={{ transition: "transform .15s", transform: open === i ? "rotate(90deg)" : "none", display: "flex" }}>
                        <Icon.arrow size={12} />
                      </span>
                    </button>
                  </div>
                  {open === i && c.modules && (
                    <div style={{ marginTop: 12 }}>
                      {c.modules.map((m, mi) => (
                        <div key={mi} className="sp-mod">
                          <span style={{ width: 24, height: 24, borderRadius: 7, background: m.done ? "#2f9d4218" : m.cur ? "#ff8f0118" : "#f1ece6", color: m.done ? "#2f9d42" : m.cur ? "#d97706" : "#999", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                            {m.done ? <Icon.check size={13} /> : mi + 1}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1a2c33" }}>{m.t}</div>
                            <div style={{ fontSize: 10.5, color: "#999" }}>{m.n} videos · {m.d}</div>
                          </div>
                          {m.cur && (
                            <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", color: "#d97706", background: "#ff8f0118", padding: "3px 8px", borderRadius: 100, flexShrink: 0 }}>
                              In progress
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed courses */}
      {completed.length > 0 && (
        <div className="rd-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>Completed</h4>
            <span style={{ fontSize: 11.5, color: "#999" }}>certificate &amp; your review</span>
          </div>
          {completed.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 0", borderBottom: "1px solid #eee" }}>
              <Avatar name={c.expert} img={c.img} size={44} radius={10} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1a1a1a" }}>{c.title}</div>
                <div style={{ fontSize: 11.5, color: "#888" }}>Expert · {c.expert}</div>
              </div>
              <button style={{ background: "#fff", border: "1px solid #f0d7b6", color: "#d97706", borderRadius: 8, padding: "7px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <Icon.award size={13} /> Certificate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
