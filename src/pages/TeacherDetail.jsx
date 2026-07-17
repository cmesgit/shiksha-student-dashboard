// PLACEMENT: student_dashboard/src/pages/TeacherDetail.jsx  (replace whole file)
// DEPLOY:    /app/student_dashboard/src/pages/TeacherDetail.jsx
//
// WHAT CHANGED: added a "Message" button to the teacher's profile card. The
// route param `id` is the teacher's user id; StartDirectView accepts a User id
// for TEACHER targets, so we pass it straight through as teacherId.

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/apiClient";
import { LoadingState } from "../components/StateViews";
import "../styles/teachers.css";

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

  if (loading) return <LoadingState label="Loading" />;
  if (error) return <div className="teachers-error">{error}</div>;
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

  return (
    <div className="teacher-detail-page">
      <button className="teacher-detail__back" onClick={() => navigate(-1)}>← Back</button>

      <div className="teacher-detail__card">
        <div className="teacher-detail__avatar">
          {teacher.avatar ? (
            typeof teacher.avatar === "string" && teacher.avatar.length <= 4 ? (
              <span className="teacher-detail__emoji">{teacher.avatar}</span>
            ) : (
              <img src={teacher.avatar} alt={teacher.name} />
            )
          ) : (
            <span className="teacher-detail__fallback">
              {teacher.name?.[0]?.toUpperCase() || "T"}
            </span>
          )}
        </div>
        <h1 className="teacher-detail__name">{teacher.name}</h1>
        {teacher.subject && <p className="teacher-detail__subject">{teacher.subject}</p>}
        {teacher.qualification && (
          <p className="teacher-detail__qual">{teacher.qualification}</p>
        )}
        {teacher.rating != null && (
          <p className="teacher-detail__rating">★ {teacher.rating.toFixed(1)}</p>
        )}

        <button
          type="button"
          onClick={() => navigate("/chat", { state: { teacherId: id } })}
          style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg,#1b9c85,#1dcaab)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          💬 Message
        </button>
      </div>

      {teacher.bio && (
        <section className="teacher-detail__section">
          <h2>About</h2>
          <p className="teacher-detail__bio">{teacher.bio}</p>
        </section>
      )}

      {hasEducation && (
        <section className="teacher-detail__section">
          <h2>Education</h2>
          <dl className="teacher-detail__dl">
            {edu.highest_degree && (
              <>
                <dt>Highest degree</dt>
                <dd>{edu.highest_degree}</dd>
              </>
            )}
            {edu.field_of_study && (
              <>
                <dt>Field of study</dt>
                <dd>{edu.field_of_study}</dd>
              </>
            )}
            {edu.year_of_completion && (
              <>
                <dt>Year of completion</dt>
                <dd>{edu.year_of_completion}</dd>
              </>
            )}
            {edu.certifications && edu.certifications.length > 0 && (
              <>
                <dt>Certifications</dt>
                <dd>{edu.certifications.join(", ")}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {hasExperience && (
        <section className="teacher-detail__section">
          <h2>Experience</h2>
          <dl className="teacher-detail__dl">
            {exp.range && (
              <>
                <dt>Years teaching</dt>
                <dd>{exp.range}</dd>
              </>
            )}
            {exp.employment_status && (
              <>
                <dt>Status</dt>
                <dd>{exp.employment_status}</dd>
              </>
            )}
            {exp.current_position && (
              <>
                <dt>Current position</dt>
                <dd>{exp.current_position}</dd>
              </>
            )}
            {exp.current_institution && (
              <>
                <dt>Current institution</dt>
                <dd>{exp.current_institution}</dd>
              </>
            )}
            {exp.previous_institution && (
              <>
                <dt>Previous institution</dt>
                <dd>{exp.previous_institution}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      {courses.length > 0 && (
        <section className="teacher-detail__section">
          <h2>Teaches</h2>
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
        </section>
      )}

      {skills.length > 0 && (
        <section className="teacher-detail__section">
          <h2>Skills</h2>
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
        </section>
      )}
    </div>
  );
}
