// skill/SkillExplore.jsx — Discover experts (design_handoff_skilldev
// README.md "2. Explore experts"), verified against the live standalone
// prototype: search + category chips row, card grid with intro-video
// thumbnail, mastery pledge strip, Book/View profile actions.
//
// Wired to GET /skill/student/experts/?cat=&search= and GET /skill/categories/
// (unchanged from before). Favourites have no backend model or endpoint
// anywhere (not in WORKFLOW.md §8's API surface either) — kept as a local
// per-browser preference (localStorage), same scope the design's own `favs`
// state key implies.

import { useState, useEffect, useCallback } from "react";
import { Avatar, StarRow } from "./SkillUI";
import { avatarColor } from "./SkillUI";
import { useAuth } from "../contexts/AuthContext";
import { LoadingState } from "../components/StateViews";
import "../styles/skillExplore.css";

// Favourites are PER LEARNER PROFILE. The key used to be a flat
// "skilldev_favs", shared by every child on the account, so one sibling's
// favourited experts showed up as the other's.
const favsKey = (profileId) => `skilldev_favs.${profileId || "anon"}`;
const loadFavs = (profileId) => {
  try { return new Set(JSON.parse(localStorage.getItem(favsKey(profileId)) || "[]")); }
  catch { return new Set(); }
};
const saveFavs = (set, profileId) => {
  try { localStorage.setItem(favsKey(profileId), JSON.stringify([...set])); }
  catch { /* quota / private mode */ }
};

function ExpertCard({ t, favs, toggleFav, onBook, onView }) {
  const [playing, setPlaying] = useState(false);
  const remaining = t.mastery_target ?? 3;
  const isFav = favs.has(t.id);

  return (
    <div className="se-card">
      <div className="se-cardHead">
        <Avatar name={t.name} img={t.img} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="se-nameRow">
            <span className="se-name">{t.name}</span>
          </div>
          <div className="se-sub">{t.role}{t.sessions != null && ` · ${t.sessions} sessions`}</div>
        </div>
        <button
          className={`se-favBtn ${isFav ? "is-fav" : ""}`}
          onClick={() => toggleFav(t.id)}
          aria-label="Save to favorites"
          title="Save to favorites"
        >{isFav ? "♥" : "♡"}</button>
      </div>

      <div
        className="se-thumb"
        style={playing ? undefined : { background: `linear-gradient(135deg, ${avatarColor(t.name)}cc, #1a2c33)` }}
        onClick={() => t.intro_video_embed_url && setPlaying((p) => !p)}
      >
        {playing && t.intro_video_embed_url ? (
          <iframe
            src={t.intro_video_embed_url}
            title={`${t.name} intro`}
            className="se-thumbFrame"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <>
            <span className="se-playDisc">▶</span>
            <span className="se-thumbPill se-thumbPill--top">Intro video</span>
            {/* No duration pill: unlike the mockup's fixture data, no backend
                field stores the intro video's actual length. */}
          </>
        )}
      </div>

      <p className="se-bio">{t.bio || t.subject_description || ""}</p>

      <div className="se-pledge">
        <span className="se-pledgeGlyph">◆</span>
        <span>Complete {remaining} session{remaining === 1 ? "" : "s"} with me to master {t.role}</span>
      </div>

      <div className="se-actions">
        <span className="se-actionsRating"><StarRow n={Math.round(t.rating || 0)} size={11} /> {t.rating ?? "—"}</span>
        {t.reviews_count != null && <span className="se-reviewsCount">({t.reviews_count} reviews)</span>}
        <span style={{ flex: 1 }} />
        <button className="se-btn se-btn--secondary" onClick={() => onView(t.id)}>View profile</button>
        <button className="se-btn se-btn--primary" onClick={() => onBook(t.id)}>Book</button>
      </div>
    </div>
  );
}

export default function SkillExplore({ setTab = () => {} }) {
  const { api, activeProfile } = useAuth();
  const profileId = activeProfile?.id;
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [favsOnly, setFavsOnly] = useState(false);
  const [favs, setFavs] = useState(() => loadFavs(profileId));
  // "Offline near me" — real, working discovery filter (ExpertProfile has a
  // pincode/district/state + class_mode already wired server-side); the
  // design is silent on it, but it's real functionality worth keeping per
  // the established "don't delete what works" rule, not shown in the design.
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [pincode, setPincode] = useState("");

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

  useEffect(() => {
    api.get("/skill/categories/")
      .then(r => { if (Array.isArray(r.data) && r.data.length) setCategories(r.data); })
      .catch(() => {});
    load("all", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = (over = {}) => load(
    (over.cat ?? activeCat) === "all" ? null : (over.cat ?? activeCat),
    over.search ?? search,
    { offline: over.offline ?? offlineOnly, pincode: over.pincode ?? pincode },
  );

  const handleCat = (id) => { setActiveCat(id); setFavsOnly(false); reload({ cat: id }); };
  const handleSearch = (e) => { setSearch(e.target.value); reload({ search: e.target.value }); };
  const toggleOffline = () => { const v = !offlineOnly; setOfflineOnly(v); reload({ offline: v }); };
  const handlePincode = (e) => { setPincode(e.target.value); if (offlineOnly) reload({ pincode: e.target.value }); };

  // Re-read when the child changes: favourites are per profile, and this
  // component is not guaranteed to remount on a profile switch.
  useEffect(() => { setFavs(loadFavs(profileId)); }, [profileId]);

  const toggleFav = (id) => {
    const next = new Set(favs);
    next.has(id) ? next.delete(id) : next.add(id);
    setFavs(next);
    saveFavs(next, profileId);
  };

  const visible = favsOnly ? experts.filter((e) => favs.has(e.id)) : experts;

  const bookTutor = (expertId) => setTab("book", { expertId });
  const viewProfile = (expertId) => setTab(`profile/${expertId}`);

  return (
    <div className="se-screen">
      <div className="se-filterRow">
        <input
          className="se-search"
          value={search} onChange={handleSearch}
          placeholder="Search experts or skills…"
        />
        <span className={`se-chip ${activeCat === "all" ? "is-active" : ""}`} onClick={() => handleCat("all")}>All</span>
        {categories.map((c) => {
          const id = c.slug || c.id;
          return (
            <span key={id} className={`se-chip ${activeCat === id ? "is-active" : ""}`} onClick={() => handleCat(id)}>
              {c.label}
            </span>
          );
        })}
        <span className={`se-chip se-chip--fav ${favsOnly ? "is-active" : ""}`} onClick={() => setFavsOnly((v) => !v)}>
          ♥ Favorites
        </span>
        {/* Real, backend-wired discovery filter (location/class_mode already
            exist server-side) — the design's own fixture screen is silent on
            it, but it's working functionality worth keeping. */}
        <span className={`se-chip ${offlineOnly ? "is-active" : ""}`} onClick={toggleOffline}>
          📍 Offline near me
        </span>
        {offlineOnly && (
          <input
            className="se-pincodeInput"
            value={pincode} onChange={handlePincode}
            placeholder="Pincode (optional)"
            inputMode="numeric"
          />
        )}
      </div>

      {loading ? (
        <LoadingState label="Loading experts" />
      ) : visible.length === 0 ? (
        <div className="se-empty">No experts found. Try a different category.</div>
      ) : (
        <div className="se-grid">
          {visible.map((t) => (
            <ExpertCard key={t.id} t={t} favs={favs} toggleFav={toggleFav} onBook={bookTutor} onView={viewProfile} />
          ))}
        </div>
      )}
    </div>
  );
}
