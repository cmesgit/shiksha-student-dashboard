// Card-grid "Teachers" screen — shares the Cards page visual language with
// Subjects (see design_handoff_academy_dashboard README, "Cards page").
// Message action moved to TeacherDetail's hero (clicking a card opens the
// Detail page, same as every other Cards-page instance); the quick-message
// shortcut that used to live on each row is preserved there.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import PageHeader from "../components/PageHeader";
import { subjectChipPalette as subjectPalette } from "../utils/subjectChips";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import "../styles/subjectCard.css";
import "../styles/teachers.css";

function teacherInitials(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "T";
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export default function Teachers() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  // Per-teacher "years of experience" — not in the list endpoint, so we
  // pull it from the same public-profile endpoint TeacherDetail already
  // uses, per teacher, once the list itself has loaded.
  const [experienceById, setExperienceById] = useState({});

  useEffect(() => {
    api
      .get("/accounts/teachers/")
      .then((res) => setTeachers(res.data || []))
      .catch((err) => setError(err?.response?.data?.detail || "Failed to load teachers"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (teachers.length === 0) return;

    async function fetchExperience() {
      const results = await Promise.allSettled(
        teachers.map((t) =>
          api.get(`/accounts/teachers/${t.id}/`).then((res) => ({ id: t.id, exp: res.data?.experience }))
        )
      );
      const map = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") map[r.value.id] = r.value.exp;
      });
      setExperienceById(map);
    }

    fetchExperience();
  }, [teachers]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? teachers.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(q) ||
          (t.subject || "").toLowerCase().includes(q) ||
          (t.qualification || "").toLowerCase().includes(q)
      )
    : teachers;

  if (loading) return <LoadingState label="Loading teachers" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="teachersPage">
      <div className="teachersHeaderBox">
        <div>
          <PageHeader title="Teachers" />
          <p className="teachersSub">Faculty teaching your batch this term.</p>
        </div>
        <input
          className="teachersSearch"
          type="text"
          placeholder="Search by name, subject, or qualification"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="teachersBodyBox">
        {filtered.length === 0 ? (
          <EmptyState
            plain
            icon="users"
            title={search ? "No teachers match that" : "No teachers yet"}
            message={search ? "Try a different name, subject, or qualification." : "Your course teachers will appear here once they're assigned."}
          />
        ) : (
          <div className="teachersGrid">
            {filtered.map((t) => {
              const { bg, ink } = subjectPalette(t.name);
              const years = experienceById[t.id]?.years;
              const range = experienceById[t.id]?.range;
              const footText = years != null
                ? `${years} yrs experience`
                : range
                ? range
                : t.qualification || null;
              const openProfile = () => navigate(`/teachers/${t.id}`);

              return (
                <div
                  key={t.id}
                  className="cardTile"
                  role="button"
                  tabIndex={0}
                  title={t.name}
                  onClick={openProfile}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openProfile()}
                >
                  <div className="cardTile__top">
                    <div className="cardTile__avatar" style={{ background: bg, color: ink }}>
                      {t.avatar && typeof t.avatar === "string" && t.avatar.length <= 4 ? (
                        <span>{t.avatar}</span>
                      ) : t.avatar ? (
                        <img
                          src={t.avatar}
                          alt={t.name}
                          style={{ width: "100%", height: "100%", borderRadius: 12, objectFit: "cover" }}
                        />
                      ) : (
                        teacherInitials(t.name)
                      )}
                    </div>
                    {t.rating != null && (
                      <span className="teacherCard__rating">★ {t.rating.toFixed(1)}</span>
                    )}
                  </div>

                  <div className="cardTile__body">
                    <h3 className="cardTile__title">{t.name}</h3>
                    <p className="cardTile__meta">{t.subject || "—"}</p>
                  </div>

                  <div className="cardTile__footer">
                    <span className="cardTile__footText">{footText}</span>
                    <button
                      type="button"
                      className="cardTile__btn"
                      tabIndex={-1}
                      onClick={() => navigate(`/teachers/${t.id}`)}
                    >
                      View profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
