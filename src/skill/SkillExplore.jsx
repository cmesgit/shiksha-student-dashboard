// PLACEMENT: student_dashboard/src/skill/SkillExplore.jsx  (replace whole file)
// skill/SkillExplore.jsx — Discover (skillTab === "explore").
// Wired to GET /skill/student/experts/?cat=&search= and GET /skill/categories/
// (category chips now come from the backend — no hardcoded SKILL_CATEGORIES).

import { useState, useEffect, useCallback } from "react";
import { Icon } from "./skillIcons";
import { Avatar } from "./skillUI";
import { useAuth } from "../contexts/AuthContext";

const ACC = "#125027";

export default function SkillExplore({ setTab = () => {} }) {
  const { api }      = useAuth();
  const [experts,    setExperts]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeCat,  setActiveCat]  = useState("all");
  const [search,     setSearch]     = useState("");
  const [categories, setCategories] = useState([]);
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [pincode,    setPincode]    = useState("");

  const load = useCallback((cat, q, opts = {}) => {
    setLoading(true);
    const params = {};
    if (cat && cat !== "all") params.cat = cat;
    if (q && q.trim()) params.search = q.trim();
    if (opts.offline) params.offline = 1;
    if (opts.pincode && opts.pincode.trim()) params.pincode = opts.pincode.trim();
    api.get("/skill/student/experts/", { params })
      .then(r => setExperts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setExperts([]))
      .finally(() => setLoading(false));
  }, [api]);

  // Load categories from backend too
  useEffect(() => {
    api.get("/skill/categories/")
      .then(r => { if (Array.isArray(r.data) && r.data.length) setCategories(r.data); })
      .catch(() => {});
    load("all", "");
  }, []);

  const reload = (over = {}) => load(
    (over.cat ?? activeCat) === "all" ? null : (over.cat ?? activeCat),
    over.search ?? search,
    { offline: over.offline ?? offlineOnly, pincode: over.pincode ?? pincode },
  );

  const handleCat = (id) => { setActiveCat(id); reload({ cat: id }); };
  const handleSearch = (e) => { setSearch(e.target.value); reload({ search: e.target.value }); };
  const toggleOffline = () => { const v = !offlineOnly; setOfflineOnly(v); reload({ offline: v }); };
  const handlePincode = (e) => { setPincode(e.target.value); if (offlineOnly) reload({ pincode: e.target.value }); };

  return (
    <div style={{ padding: "14px 18px 22px", overflow: "auto", flex: 1 }}>
      {/* Category chips */}
      <div className="rd-card" style={{ marginBottom: 14 }}>
        <h4>Browse by category</h4>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <span
            onClick={() => handleCat("all")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 100, fontSize: 12, fontWeight: 600, border: `1.5px solid ${activeCat === "all" ? ACC : "#ccc"}`, background: activeCat === "all" ? ACC : "#fff", color: activeCat === "all" ? "#fff" : "#555", cursor: "pointer" }}
          >
            All
          </span>
          {categories.map((c) => {
            const id = c.slug || c.id;
            return (
              <span key={id} onClick={() => handleCat(id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 100, fontSize: 12, fontWeight: 600, border: `1.5px solid ${activeCat === id ? c.color : c.color + "55"}`, background: activeCat === id ? c.color : "#fff", color: activeCat === id ? "#fff" : c.color, cursor: "pointer" }}>
                {c.label}
              </span>
            );
          })}
        </div>
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f7f1de", padding: "8px 12px", borderRadius: 10, border: "1px solid #e8dfc8" }}>
          <Icon.search size={14} />
          <input
            value={search} onChange={handleSearch}
            placeholder="Search by name or skill…"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12.5, fontFamily: "inherit" }}
          />
        </div>

        {/* Offline / near-me filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span
            onClick={toggleOffline}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1.5px solid ${offlineOnly ? ACC : "#ccc"}`, background: offlineOnly ? ACC : "#fff", color: offlineOnly ? "#fff" : "#555" }}
          >
            📍 Offline near me
          </span>
          {offlineOnly && (
            <input
              value={pincode} onChange={handlePincode}
              placeholder="Pincode (optional)"
              inputMode="numeric"
              style={{ width: 150, border: "1px solid #e8dfc8", outline: "none", background: "#fff", fontSize: 12.5, fontFamily: "inherit", borderRadius: 10, padding: "7px 12px" }}
            />
          )}
        </div>
      </div>

      {/* Expert grid */}
      <div className="rd-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h4 style={{ margin: 0 }}>
            {activeCat === "all" ? "All experts" : categories.find(c => (c.slug || c.id) === activeCat)?.label || "Experts"}
          </h4>
          <span style={{ fontSize: 11.5, color: "#999" }}>
            {loading ? "Loading…" : `${experts.length} available`}
          </span>
        </div>

        {loading ? (
          <div style={{ fontSize: 12, color: "#888", padding: "12px 0" }}>Loading…</div>
        ) : experts.length === 0 ? (
          <div style={{ fontSize: 12, color: "#888", padding: "12px 0" }}>No experts found. Try a different category.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {experts.map((t) => (
              <div key={t.id} style={{ display: "flex", gap: 12, alignItems: "center", border: "1px solid #efe2d6", borderRadius: 13, padding: 12 }}>
                <Avatar name={t.name} img={t.img} size={46} radius={11} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {t.name}
                    {t.advertised && (
                      <span title="Featured" style={{ fontSize: 9, fontWeight: 800, color: "#b46a00", background: "#ff8f0122", padding: "1px 6px", borderRadius: 100 }}>
                        Featured
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.role}</div>
                  <div style={{ fontSize: 11, color: "#6b7c83", marginTop: 3, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Icon.star size={11} /> {t.rating ?? "—"} · ₹{t.rate}
                  </div>
                  {t.offline && (
                    <div style={{ fontSize: 10.5, color: "#125027", marginTop: 3 }}>
                      📍 Offline{t.location?.city ? ` · ${t.location.city}` : t.location?.district ? ` · ${t.location.district}` : ""}
                    </div>
                  )}
                </div>
                <button onClick={() => setTab("book", { expertId: t.id })} style={{ background: ACC, color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  View
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
