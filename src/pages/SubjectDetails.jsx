import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../api/apiClient";
import { useCourse } from "../contexts/CourseContext";
import { LoadingState, EmptyState } from "../components/StateViews";
import { subjectChipPalette, subjectInitials } from "../utils/subjectChips";
import AssignmentCard from "../components/AssignmentCard";
import { fmtClockTime, dayLabel, startsInText } from "../utils/sessionTime";
import "../styles/academyCommon.css";
import "../styles/subjectDetails.css";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";

function getFileExt(name = "") {
  const ext = name.split(".").pop();
  return ext ? ext.toUpperCase() : "FILE";
}

function triggerDownload(file) {
  if (!file?.file_url) return;
  const a = document.createElement("a");
  a.href = file.file_url;
  a.download = file.file_name || "";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function SubjectDetails() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const { activeCourse } = useCourse();

  const [subjectDetails, setSubjectDetails] = useState(null);
  const [chapterProgress, setChapterProgress] = useState(null); // { chaptersTotal, chaptersDone, percent, chapters }
  const [recordings, setRecordings] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errStatus, setErrStatus] = useState(null);

  useEffect(() => {
    if (!subjectId) return;
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/courses/subjects/${subjectId}/dashboard/`);
        if (!alive) return;
        setSubjectDetails(res.data);
        setErrStatus(null);
      } catch (err) {
        console.error("Failed to load subject details", err);
        if (!alive) return;
        setSubjectDetails(null);
        setErrStatus(err?.response?.status ?? 0);
      } finally {
        if (alive) setLoading(false);
      }

      // Per-chapter "covered" progress comes from the batch-progress payload
      // (the same one Progress.jsx uses) — pull out just this subject's slice.
      try {
        const params = activeCourse ? { course: activeCourse.id } : {};
        const bp = await api.get("/courses/my-batch-progress/", { params });
        if (!alive) return;
        const match = (bp.data?.subjects || []).find((s) => s.id === subjectId);
        if (match) {
          setChapterProgress({
            chaptersTotal: match.chapters_total,
            chaptersDone: match.chapters_done,
            percent: match.percent,
            chapters: match.chapters || [],
          });
        }
      } catch {
        // Batch progress is supplementary — no batch assigned yet is a
        // normal state, not an error worth surfacing here.
      }

      try {
        const rec = await api.get(`/courses/subjects/${subjectId}/recordings/`);
        if (alive) setRecordings((rec.data || []).slice(0, 4));
      } catch {
        if (alive) setRecordings([]);
      }

      try {
        const mat = await api.get(`/materials/subjects/${subjectId}/materials/`);
        if (alive) setMaterials((mat.data || []).slice(0, 4));
      } catch {
        if (alive) setMaterials([]);
      }

      try {
        const asn = await api.get(`/assignments/subject/${subjectId}/`);
        if (alive) setAssignments((asn.data || []).slice(0, 4));
      } catch {
        if (alive) setAssignments([]);
      }
    })();

    return () => { alive = false; };
  }, [subjectId, activeCourse]);

  if (loading) return <div className="ac-page"><LoadingState label="Loading subject" /></div>;

  if (!subjectDetails) {
    const notEnrolled = errStatus === 403;
    return (
      <div className="ac-page">
        <EmptyState
          icon="book"
          title={notEnrolled ? "You're not enrolled in this course" : "Subject not found"}
          message={
            notEnrolled
              ? "This subject belongs to a course you don't have active access to. Enrol or renew your subscription to open it."
              : "This subject may have been removed, or the link is out of date."
          }
          action={
            notEnrolled
              ? { label: "Browse courses", to: "/browse-courses" }
              : { label: "Back to subjects", to: "/subjects" }
          }
        />
      </div>
    );
  }

  const teachers = subjectDetails.teachers || [];
  const primaryTeacher = teachers[0];
  const { bg, ink } = subjectChipPalette(subjectDetails.name);

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
        <div className="sd-hero__avatar" style={{ background: bg, color: ink }}>
          {subjectInitials(subjectDetails.name)}
        </div>
        <div className="sd-hero__main">
          <h1 className="sd-hero__title">{subjectDetails.name}</h1>
          <p className="sd-hero__meta">
            {primaryTeacher?.name ? `Taught by ${primaryTeacher.name}` : "No teacher assigned"}
            {subjectDetails.studentsCount != null ? ` · ${subjectDetails.studentsCount} students` : ""}
          </p>
        </div>
      </div>

      <div className="sd-statRow">
        <div className="sd-stat">
          <strong className={chapterProgress ? "" : "sd-stat__value--empty"}>{chapterProgress ? `${chapterProgress.percent}%` : "—"}</strong>
          <span>Syllabus covered</span>
        </div>
        <div className="sd-stat">
          <strong className={chapterProgress ? "" : "sd-stat__value--empty"}>{chapterProgress ? chapterProgress.chaptersDone : "—"}</strong>
          <span>Chapters done</span>
        </div>
        <div className="sd-stat">
          <strong className={subjectDetails.quizAvgPct != null ? "" : "sd-stat__value--empty"}>{subjectDetails.quizAvgPct != null ? `${subjectDetails.quizAvgPct}%` : "—"}</strong>
          <span>Avg quiz score</span>
        </div>
        <div className="sd-stat">
          <strong className={subjectDetails.upcomingSessions?.length ? "" : "sd-stat__value--empty"}>
            {subjectDetails.upcomingSessions?.length
              ? dayLabel(new Date(subjectDetails.upcomingSessions[0].start_time))
              : "—"}
          </strong>
          <span>Next class</span>
        </div>
      </div>

      <div className="sd-grid">
        {/* Left column */}
        <div className="sd-detailMain">
          <div className="sd-card">
            <div className="sd-card__headRow">
              <h3 className="sd-card__heading">Chapters</h3>
              {chapterProgress && (
                <span className="sd-card__sub">
                  {chapterProgress.chaptersDone}/{chapterProgress.chaptersTotal} covered · {chapterProgress.percent}%
                </span>
              )}
            </div>
            {!chapterProgress || chapterProgress.chapters.length === 0 ? (
              <p className="sd-empty">
                {chapterProgress ? "No chapters added yet." : "Chapter progress isn't tracked for this subject yet — you're not on a batch with a syllabus plan."}
              </p>
            ) : (
              <ul className="sd-chapterList">
                {chapterProgress.chapters.map((c) => (
                  <li key={c.id} className={`sd-chapterRow${c.is_covered ? " sd-chapterRow--done" : ""}`}>
                    <div className="sd-chapterRow__main">
                      <span className="sd-chapterRow__tick" aria-hidden="true">{c.is_covered ? "✓" : "○"}</span>
                      <span className="sd-chapterRow__title">{c.title}</span>
                      {c.is_covered && c.covered_at && (
                        <span className="sd-chapterRow__date">{fmtDate(c.covered_at)}</span>
                      )}
                    </div>
                    {c.note && <p className="sd-chapterRow__note">“{c.note}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sd-card">
            <div className="sd-card__headRow">
              <h3 className="sd-card__heading">Recordings</h3>
              <button type="button" className="sd-card__link" onClick={() => navigate(`/subjects/recordings/${subjectId}`)}>
                View all ({subjectDetails.recordingsCount ?? 0})
              </button>
            </div>
            {recordings.length === 0 ? (
              <p className="sd-empty">No recordings for this subject yet.</p>
            ) : (
              <ul className="sd-recordingList">
                {recordings.map((r) => (
                  <li
                    key={r.id}
                    className="sd-recordingRow"
                    onClick={() => navigate(`/subjects/recordings/${subjectId}/video/${r.id}`)}
                  >
                    <span className="sd-recordingRow__title">{r.title}</span>
                    <span className="sd-recordingRow__date">{fmtDate(r.session_date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="sd-card">
            <div className="sd-card__headRow">
              <h3 className="sd-card__heading">Study Material</h3>
              <button type="button" className="sd-card__link" onClick={() => navigate(`/study-material/list/${subjectId}`)}>
                View all ({subjectDetails.studyMaterialsCount ?? 0})
              </button>
            </div>
            {materials.length === 0 ? (
              <p className="sd-empty">No study material for this subject yet.</p>
            ) : (
              <ul className="sd-materialList">
                {materials.map((m) => {
                  const file = m.files?.[0];
                  return (
                    <li key={m.id} className="sd-materialRow">
                      <span className="sd-materialRow__ext">{getFileExt(file?.file_name)}</span>
                      <div className="sd-materialRow__main">
                        <span className="sd-materialRow__title">{m.title}</span>
                        <span className="sd-materialRow__meta">
                          {file?.file_size ? `${file.file_size} · ` : ""}added {fmtDate(m.created_at)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="sd-materialRow__btn"
                        disabled={!file}
                        onClick={() => triggerDownload(file)}
                      >
                        Download
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="sd-card">
            <div className="sd-card__headRow">
              <h3 className="sd-card__heading">Assignments</h3>
              <button type="button" className="sd-card__link" onClick={() => navigate(`/subjects/${subjectId}/assignments`)}>
                View all ({subjectDetails.assignments?.total ?? 0})
              </button>
            </div>
            {assignments.length === 0 ? (
              <p className="sd-empty">No assignments for this subject yet.</p>
            ) : (
              <div className="sd-assignmentList">
                {assignments.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    id={a.id}
                    subjectId={subjectId}
                    title={a.title}
                    teacher={a.teacher || primaryTeacher?.name || "—"}
                    due={a.due_date}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="sd-detailSide">
          <div className="sd-card">
            <h3 className="sd-card__heading">About this subject</h3>
            {primaryTeacher ? (
              <div className="sd-about">
                <p className="sd-about__bio">{primaryTeacher.bio || "No bio provided yet."}</p>
                <div className="sd-about__row"><span>Qualification</span><strong>{primaryTeacher.qualification || "—"}</strong></div>
                <div className="sd-about__row"><span>Rating</span><strong>{primaryTeacher.rating ?? "—"}</strong></div>
              </div>
            ) : (
              <p className="sd-empty">No teacher assigned to this subject yet.</p>
            )}
          </div>

          <div className="sd-card">
            <h3 className="sd-card__heading">Upcoming classes</h3>
            {subjectDetails.upcomingSessions?.length > 0 ? (
              <ul className="sd-upcomingList">
                {subjectDetails.upcomingSessions.map((session) => {
                  const dt = new Date(session.start_time);
                  const isLive = session.status === "LIVE";
                  return (
                    <li key={session.id} className={`sd-upcomingRow${isLive ? " sd-upcomingRow--live" : ""}`}>
                      <div className="sd-upcomingRow__main">
                        <span className="sd-upcomingRow__title">{session.title}</span>
                        <span className="sd-upcomingRow__time">
                          {isLive ? "Live now" : `${dayLabel(dt)} · ${fmtClockTime(dt)} · ${startsInText(dt)}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="sd-upcomingRow__btn"
                        onClick={() => navigate(`/live/${session.id}`)}
                      >
                        {isLive ? "Join" : "Details"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="sd-empty">No upcoming live classes scheduled.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
