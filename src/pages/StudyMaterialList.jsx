// src/pages/StudyMaterialList.jsx
// ──────────────────────────────────────────────────────────────────────────
// Academy "Study Material" — one flat, filterable list of every material
// across the learner's subjects. Matches the design handoff's Study Materials
// screen (Academy Dashboard.dc.html lines 1155–1213): a subject-pill filter
// row on the left, a Newest/Oldest sort on the right, then edge-to-edge rows
// of [file-type badge · title / "subject · teacher" · size · date · View ·
// Download]. Manage/Delete is teacher-only and not rendered here.
//
// There is deliberately NO subject-picker step any more. The design reaches
// this screen straight from the nav, so `pages/SubjectsStudyMaterial.jsx` (the
// picker) is gone and `/study-material` lands here.
//
// Data: ONE request — GET /materials/student/courses/:courseId/materials/
// returns every material across the course's subjects. That endpoint is also
// stricter than the per-subject one this screen used to fan out over: it
// applies batch isolation (course-wide materials plus this learner's own
// batch), so the fan-out was showing other batches' handouts.
//
// It's a new endpoint, so until the backend carrying it is deployed we fall
// back to the old per-subject fan-out and this screen works against both.
//
// The filter dimension is now SUBJECT, per the design. It used to be chapter,
// only because the route was already scoped to a single subject; chapter is
// still shown on a material's detail page.
//
// The route still accepts an optional :subjectId so older deep links keep
// working — it just preselects that subject's pill instead of scoping the fetch.
// ──────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCourse } from "../contexts/CourseContext";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import "../styles/academyCommon.css";
import "../styles/academyScreens.css";
import "../styles/studyMaterial.css";
import api from "../api/apiClient";

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

const teacherLabelFor = (subject) =>
  subject?.teachers?.length
    ? subject.teachers.map((t) => t.name).join(", ")
    : "No teacher assigned";

export default function StudyMaterialList() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const { activeCourse, subjects } = useCourse();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // "" = All subjects. Seeded from the route so a deep link preselects.
  const [subjectFilter, setSubjectFilter] = useState(subjectId ? String(subjectId) : "");
  const [sortOrder, setSortOrder] = useState("newest");
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    setSubjectFilter(subjectId ? String(subjectId) : "");
  }, [subjectId]);

  useEffect(() => {
    const list = subjects || [];
    if (!activeCourse || list.length === 0) {
      setMaterials([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const byId = new Map(list.map((s) => [String(s.id), s]));

    // Shape one API row into what this screen renders. `subject` is the
    // owning Subject from CourseContext (for the teacher label).
    const toRow = (item, subject) => ({
      id: item.id,
      subjectId: subject?.id ?? item.subject_id,
      subjectName: subject?.name ?? item.subject_name,
      teacherLabel: teacherLabelFor(subject),
      chapter: item.chapter_title || "No chapter",
      title: item.title,
      date: new Date(item.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      dateRaw: new Date(item.created_at).getTime(),
      files: item.files || [],
      isNew: Date.now() - new Date(item.created_at) < 7 * 24 * 60 * 60 * 1000,
    });

    // Legacy path: one request per subject, flattened client-side. Only used
    // when the batched endpoint isn't available yet (see below).
    async function fetchPerSubject() {
      const perSubject = await Promise.all(
        list.map((s) =>
          api
            .get(`/materials/subjects/${s.id}/materials/`)
            .then((res) => (res.data || []).map((item) => toRow(item, s)))
            // A subject that fails degrades to empty rather than rejecting the
            // whole screen.
            .catch(() => [])
        )
      );
      return perSubject.flat();
    }

    async function fetchAll() {
      setLoading(true);
      setError(false);
      try {
        let rows;
        try {
          const res = await api.get(
            `/materials/student/courses/${activeCourse.id}/materials/`
          );
          rows = (res.data || []).map((item) =>
            toRow(item, byId.get(String(item.subject_id)))
          );
        } catch (err) {
          // Fall back ONLY when the endpoint isn't deployed yet. Any other
          // status is a real failure and must surface — silently retrying via
          // the per-subject fan-out would mask it, and that path applies no
          // batch isolation.
          if (err?.response?.status !== 404) throw err;
          rows = await fetchPerSubject();
        }
        if (cancelled) return;
        setMaterials(rows);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch study materials:", err);
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [activeCourse, subjects]);

  // Only offer a pill for subjects that actually have material.
  const subjectsWithMaterial = useMemo(() => {
    const ids = new Set(materials.map((m) => String(m.subjectId)));
    return (subjects || []).filter((s) => ids.has(String(s.id)));
  }, [subjects, materials]);

  const rows = useMemo(
    () =>
      materials
        .filter((m) => !subjectFilter || String(m.subjectId) === subjectFilter)
        .sort((a, b) =>
          sortOrder === "oldest" ? a.dateRaw - b.dateRaw : b.dateRaw - a.dateRaw
        ),
    [materials, subjectFilter, sortOrder]
  );

  const handleView = (item) => {
    setLoadingId(item.id);
    setTimeout(() => {
      setLoadingId(null);
      navigate(`/study-material/view/${item.id}`);
    }, 300);
  };

  const handleDownload = (item) => {
    if (item.files.length === 1) {
      triggerDownload(item.files[0]);
    } else {
      // Multiple (or zero) files — no single file to hand the browser, so send
      // the student to the detail page to pick one.
      navigate(`/study-material/view/${item.id}`);
    }
  };

  if (loading) return <div className="ac-screen"><LoadingState label="Loading study material" /></div>;
  if (error) {
    return (
      <div className="ac-screen">
        <ErrorState message="Couldn't load your study material. Please try again in a moment." />
      </div>
    );
  }

  return (
    <div className="ac-screen">
      <div className="ac-head">
        <div>
          <h1 className="ac-head__title">Study Material</h1>
          <p className="ac-head__sub">
            Notes, worksheets and reference material shared by your teachers.
          </p>
        </div>
      </div>

      {materials.length === 0 ? (
        <EmptyState
          icon="file"
          title="No study material yet"
          message="Notes, PDFs, and resources will appear here once your teachers add them."
        />
      ) : (
        <>
          <div className="ac-filterBar">
            <div className="ac-pills">
              <button
                type="button"
                className={`ac-pill${subjectFilter === "" ? " is-active" : ""}`}
                onClick={() => setSubjectFilter("")}
              >
                All
              </button>
              {subjectsWithMaterial.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`ac-pill${subjectFilter === String(s.id) ? " is-active" : ""}`}
                  onClick={() => setSubjectFilter(String(s.id))}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <select
              className="ac-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              aria-label="Sort study material"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {rows.length === 0 ? (
            <section className="ac-listCard">
              <div className="ac-emptyRow">No material for this subject</div>
            </section>
          ) : (
            <section className="ac-listCard ac-listCard--flush">
              {rows.map((item) => {
                const singleFile = item.files.length === 1 ? item.files[0] : null;
                const multiCount = item.files.length > 1 ? item.files.length : 0;
                const ext = singleFile
                  ? getFileExt(singleFile.file_name)
                  : multiCount ? "DOCS" : "FILE";
                const isPdf = ext === "PDF";
                const sizeLabel = singleFile
                  ? singleFile.file_size || "—"
                  : multiCount ? `${multiCount} files` : "—";

                return (
                  <div key={item.id} className="ac-row ac-row--flush">
                    <div className={`ac-fileBadge${isPdf ? " ac-fileBadge--pdf" : ""}`}>
                      {ext}
                    </div>

                    <div className="ac-row__body">
                      <div className="ac-row__topic">
                        {item.title}
                        {item.isNew && <span className="sm-newTag">NEW</span>}
                      </div>
                      <div className="ac-row__sub">
                        {item.subjectName} · {item.teacherLabel}
                      </div>
                    </div>

                    <span className="ac-row__col">{sizeLabel}</span>
                    <span className="ac-row__col">{item.date}</span>

                    <button
                      type="button"
                      className="ac-btn"
                      onClick={() => handleView(item)}
                      disabled={loadingId === item.id}
                    >
                      {loadingId === item.id ? "Opening…" : "View"}
                    </button>
                    <button
                      type="button"
                      className="ac-btn ac-btn--withIcon"
                      onClick={() => handleDownload(item)}
                    >
                      <svg
                        className="ac-btn__icon"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </button>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
