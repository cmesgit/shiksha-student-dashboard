// PLACEMENT: student_dashboard/src/pages/Teachers.jsx  (replace whole file)
// DEPLOY:    /app/student_dashboard/src/pages/Teachers.jsx
//
// WHAT CHANGED: each teacher row gets a "Message" button that opens a 1:1 chat
// with that teacher. The teachers API returns the teacher's user id as `id`;
// StartDirectView accepts a User id for TEACHER targets (resolves to the
// TeacherProfile server-side), so we pass t.id straight through as teacherId.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import "../styles/teachers.css";

export default function Teachers() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get("/accounts/teachers/")
      .then((res) => setTeachers(res.data || []))
      .catch((err) => setError(err?.response?.data?.detail || "Failed to load teachers"))
      .finally(() => setLoading(false));
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? teachers.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(q) ||
          (t.subject || "").toLowerCase().includes(q) ||
          (t.qualification || "").toLowerCase().includes(q)
      )
    : teachers;

  const messageTeacher = (e, t) => {
    e.stopPropagation(); // don't trigger the row's navigate-to-profile
    navigate("/chat", { state: { teacherId: t.id } });
  };

  if (loading) return <LoadingState label="Loading teachers" />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="teachers-page">
      <div className="teachers-header">
        <h1>Teachers</h1>
        <input
          className="teachers-search"
          type="text"
          placeholder="Search by name, subject, or qualification"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="teachers-container">
        {filtered.length === 0 ? (
          <EmptyState
            plain
            icon="users"
            title={search ? "No teachers match that" : "No teachers yet"}
            message={search ? "Try a different name, subject, or qualification." : "Your course teachers will appear here once they're assigned."}
          />
        ) : (
          <div className="teachers-list">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                className="teacher-row"
                onClick={() => navigate(`/teachers/${t.id}`)}
              >
                <div className="teacher-row__avatar">
                  {t.avatar ? (
                    typeof t.avatar === "string" && t.avatar.length <= 4 ? (
                      <span className="teacher-row__emoji">{t.avatar}</span>
                    ) : (
                      <img src={t.avatar} alt={t.name} />
                    )
                  ) : (
                    <span className="teacher-row__fallback">
                      {t.name?.[0]?.toUpperCase() || "T"}
                    </span>
                  )}
                </div>
                <div className="teacher-row__info">
                  <div className="teacher-row__name">{t.name}</div>
                  <div className="teacher-row__meta">
                    {t.subject && <span>{t.subject}</span>}
                    {t.qualification && <span> • {t.qualification}</span>}
                  </div>
                </div>
                {t.rating != null && (
                  <div className="teacher-row__rating">★ {t.rating.toFixed(1)}</div>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => messageTeacher(e, t)}
                  onKeyDown={(e) => { if (e.key === "Enter") messageTeacher(e, t); }}
                  style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, background: "#125027", color: "#fff", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  💬 Message
                </span>
                <span className="teacher-row__chevron">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
