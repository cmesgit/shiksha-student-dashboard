// skill/SkillExplore.jsx — Discover (skillTab === "explore").
// Category chips + recommended experts grid.

import { Icon } from "./skillIcons";
import { Avatar } from "./skillUI";
import { SKILL_CATEGORIES, RECOMMENDED, BOOK_TUTORS } from "./skillData";

const ACC = "#125027";

export default function SkillExplore({ setTab = () => {} }) {
  const experts = RECOMMENDED.concat(
    BOOK_TUTORS.map((t) => ({ name: t.name, role: t.role, img: t.img, rating: t.rating, rate: t.rate, id: t.id }))
  ).slice(0, 4);
  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1 }}>
      <div className="rd-card" style={{ marginBottom: 14 }}>
        <h4>Browse by category</h4>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SKILL_CATEGORIES.map((c) => (
            <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 100, fontSize: 12, fontWeight: 600, border: `1.5px solid ${c.color}55`, background: "#fff", color: c.color, cursor: "pointer" }}>{c.label}</span>
          ))}
        </div>
      </div>

      <div className="rd-card">
        <h4>Recommended experts</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {experts.map((t) => (
            <div key={t.name} style={{ display: "flex", gap: 12, alignItems: "center", border: "1px solid #efe2d6", borderRadius: 13, padding: 12 }}>
              <Avatar name={t.name} img={t.img} size={46} radius={11} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.role}</div>
                <div style={{ fontSize: 11, color: "#6b7c83", marginTop: 3, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon.star size={11} /> {t.rating} · ₹{t.rate}</div>
              </div>
              <button onClick={() => setTab("book")} style={{ background: ACC, color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>View</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
