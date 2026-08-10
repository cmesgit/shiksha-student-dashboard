// Teacher profile — the "Detail page" pattern (design_handoff_academy_dashboard
// README, "Detail page"): back link, hero strip, 4-stat row, then a
// two-column body. Reuses SubjectDetails.jsx's already-converted sd- shapes
// (hero/stat/grid/card) rather than re-declaring them; only what's genuinely
// teacher-specific (course/skill rows, education/experience key-value rows)
// lives in teachers.css.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/apiClient";
import { LoadingState, EmptyState } from "../components/StateViews";
import { subjectChipPalette } from "../utils/subjectChips";
import "../styles/academyCommon.css";
import "../styles/academyScreens.css";
import "../styles/subjectDetails.css";
import "../styles/teachers.css";

function teacherInitials(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "T";
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export default function TeacherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/accounts/teachers/${id}/`)
      .then((res) => setTeacher(res.data))
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 404) setError("Teacher not found");
        else setError(err?.response?.data?.detail || "Failed to load teacher");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="ac-page"><LoadingState label="Loading teacher" /></div>;

  if (error) {
    const notFound = error === "Teacher not found";
    return (
      <div className="ac-page">
        <EmptyState
          icon="users"
          title={notFound ? "Teacher not found" : "Couldn't load this teacher"}
          message={
            notFound
              ? "This teacher profile may have been removed, or the link is out of date."
              : error
          }
          action={{ label: "Back to Teachers", to: "/teachers" }}
        />
      </div>
    );
  }

  if (!teacher) return null;

  const edu = teacher.education || {};
  const exp = teacher.experience || {};
  const courses = teacher.courses || [];
  const skills = teacher.skills || [];

  const hasEducation =
    edu.highest_degree || edu.field_of_study || edu.year_of_completion ||
    (edu.certifications && edu.certifications.length);

  const hasExperience =
    exp.range || exp.employment_status || exp.current_institution ||
    exp.current_position || exp.previous_institution || exp.years;

  const expValue = exp.years != null ? `${exp.years} yrs` : exp.range || "—";
  const expMeta = exp.years != null ? `${exp.years} yrs experience` : exp.range || null;
  const metaParts = [teacher.subject, "Faculty", expMeta].filter(Boolean);

  const { bg: avatarBg, ink: avatarInk } = subjectChipPalette(teacher.name);
  const avatarIsEmoji = teacher.avatar && typeof teacher.avatar === "string" && teacher.avatar.length <= 4;
  const avatarIsImage = teacher.avatar && !avatarIsEmoji;

  return (
    <div className="ac-page">
      <button type="button" className="sd-back" onClick={() => navigate(-1)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      {/* Hero strip */}
      <div className="sd-hero">
        <div className="sd-hero__avatar" style={{ background: avatarBg, color: avatarInk }}>
          {avatarIsEmoji ? (
            <span>{teacher.avatar}</span>
          ) : avatarIsImage ? (
            <img
              src={teacher.avatar}
              alt={teacher.name}
              style={{ width: "100%", height: "100%", borderRadius: 12, objectFit: "cover" }}
            />
          ) : (
            teacherInitials(teacher.name)
          )}
        </div>
        <div className="sd-hero__main">
          <div className="td-hero__titleRow">
            <h1 className="sd-hero__title">{teacher.name}</h1>
            {teacher.rating != null && (
              <span className="teacherCard__rating">★ {teacher.rating.toFixed(1)}</span>
            )}
          </div>
          <p className="sd-hero__meta">{metaParts.join(" · ")}</p>
        </div>
        <button
          type="button"
          className="ac-btn ac-btn--primary"
          onClick={() => navigate("/chat", { state: { teacherId: id } })}
        >
          Message
        </button>
      </div>

      <div className="sd-statRow">
        <div className="sd-stat"><strong>{expValue}</strong><span>Experience</span></div>
        <div className="sd-stat">
          <strong>{teacher.rating != null ? `★ ${teacher.rating.toFixed(1)}` : "—"}</strong>
          <span>Student rating</span>
        </div>
        <div className="sd-stat"><strong>{courses.length}</strong><span>Subjects taught</span></div>
        <div className="sd-stat"><strong>{skills.length}</strong><span>Skills</span></div>
      </div>

      <div className="sd-grid">
        {/* Left column */}
        <div className="sd-detailMain">
          {courses.length > 0 && (
            <div className="sd-card">
              <h3 className="sd-card__heading">Teaches</h3>
              <ul className="teacher-detail__courses">
                {courses.map((c, i) => (
                  <li key={i} className="teacher-detail__course">
                    <div className="teacher-detail__course-subject">{c.subject}</div>
                    <div className="teacher-detail__chips">
                      {c.classes?.map((cls) => (
                        <span key={`cls-${cls}`} className="teacher-detail__chip">{cls}</span>
                      ))}
                      {c.boards?.map((b) => (
                        <span key={`b-${b}`} className="teacher-detail__chip teacher-detail__chip--muted">{b}</span>
                      ))}
                      {c.streams?.map((s) => (
                        <span key={`s-${s}`} className="teacher-detail__chip teacher-detail__chip--muted">{s}</span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {skills.length > 0 && (
            <div className="sd-card">
              <h3 className="sd-card__heading">Skills</h3>
              <ul className="teacher-detail__skills">
                {skills.map((s, i) => (
                  <li key={i} className="teacher-detail__skill">
                    <div className="teacher-detail__skill-name">{s.name}</div>
                    {s.related_subject && (
                      <div className="teacher-detail__skill-subject">{s.related_subject}</div>
                    )}
                    {s.description && (
                      <p className="teacher-detail__skill-desc">{s.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right rail — About, then Educational background, then Experience */}
        <div className="sd-detailSide">
          {teacher.bio && (
            <div className="sd-card">
              <h3 className="sd-card__heading">About</h3>
              <p className="sd-about__bio">{teacher.bio}</p>
            </div>
          )}

          {hasEducation && (
            <div className="sd-card">
              <h3 className="sd-card__heading">Educational background</h3>
              <div className="teacher-detail__kv">
                {edu.highest_degree && (
                  <div className="teacher-detail__kvRow"><span>Highest degree</span><strong>{edu.highest_degree}</strong></div>
                )}
                {edu.field_of_study && (
                  <div className="teacher-detail__kvRow"><span>Field of study</span><strong>{edu.field_of_study}</strong></div>
                )}
                {edu.year_of_completion && (
                  <div className="teacher-detail__kvRow"><span>Year of completion</span><strong>{edu.year_of_completion}</strong></div>
                )}
                {edu.certifications && edu.certifications.length > 0 && (
                  <div className="teacher-detail__kvRow"><span>Certifications</span><strong>{edu.certifications.join(", ")}</strong></div>
                )}
              </div>
            </div>
          )}

          {hasExperience && (
            <div className="sd-card">
              <h3 className="sd-card__heading">Experience</h3>
              <div className="teacher-detail__kv">
                {exp.range && (
                  <div className="teacher-detail__kvRow"><span>Years teaching</span><strong>{exp.range}</strong></div>
                )}
                {exp.employment_status && (
                  <div className="teacher-detail__kvRow"><span>Status</span><strong>{exp.employment_status}</strong></div>
                )}
                {exp.current_position && (
                  <div className="teacher-detail__kvRow"><span>Current position</span><strong>{exp.current_position}</strong></div>
                )}
                {exp.current_institution && (
                  <div className="teacher-detail__kvRow"><span>Current institution</span><strong>{exp.current_institution}</strong></div>
                )}
                {exp.previous_institution && (
                  <div className="teacher-detail__kvRow"><span>Previous institution</span><strong>{exp.previous_institution}</strong></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
