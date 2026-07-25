// src/pages/StudyMaterialList.jsx
// ──────────────────────────────────────────────────────────────────────────
// Academy "Study Material" — materials for one subject. Restyled to match
// the design handoff's "Study Materials" screen: a chapter-filter pill row
// (the design's flat subject-pills, adapted — this page is already scoped
// to one subject via the route, so chapters are the meaningful filter
// dimension here) plus a Newest/Oldest sort, and rows built from the design
// tokens (file-type badge, title, "chapter · teacher", size, date, View +
// Download — no Manage/Delete, that's teacher-only).
//
// Data comes from the existing GET /materials/subjects/:id/materials/ call;
// subject name + teacher come from CourseContext's already-fetched
// `subjects` list (no new endpoints).
// ──────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCourse } from "../contexts/CourseContext";
import { LoadingState, EmptyState } from "../components/StateViews";
import "../styles/academyCommon.css";
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

export default function StudyMaterialList() {

  const navigate = useNavigate();
  const { subjectId } = useParams();
  const { subjects } = useCourse();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [chapterFilter, setChapterFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");
  const [loadingId, setLoadingId] = useState(null);

  const subject = useMemo(
    () => subjects?.find((s) => String(s.id) === String(subjectId)),
    [subjects, subjectId]
  );
  const teacherLabel = subject?.teachers?.length
    ? subject.teachers.map((t) => t.name).join(", ")
    : "No teacher assigned";

  useEffect(() => {
    if (!subjectId) return;

    setLoading(true);
    setError(false);

    api.get(`/materials/subjects/${subjectId}/materials/`)
      .then((res) => {
        const list = (res.data || []).map((item) => ({
          id: item.id,
          chapter: item.chapter_title || "No chapter",
          title: item.title,
          date: new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          dateRaw: new Date(item.created_at).getTime(),
          files: item.files || [],
          isNew: (Date.now() - new Date(item.created_at)) < 7 * 24 * 60 * 60 * 1000,
        }));
        setMaterials(list);
      })
      .catch((err) => {
        console.error("Failed to fetch study materials:", err);
        setError(true);
      })
      .finally(() => setLoading(false));

  }, [subjectId]);

  const chapterChips = useMemo(() => {
    const unique = [...new Set(materials.map((m) => m.chapter))];
    return ["All", ...unique];
  }, [materials]);

  const rows = useMemo(() => {
    return materials
      .filter((m) => chapterFilter === "All" || m.chapter === chapterFilter)
      .sort((a, b) => sortOrder === "oldest" ? a.dateRaw - b.dateRaw : b.dateRaw - a.dateRaw);
  }, [materials, chapterFilter, sortOrder]);

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
      // Multiple (or zero) files — no single file to hand the browser,
      // so send the student to the detail page to pick one.
      navigate(`/study-material/view/${item.id}`);
    }
  };

  return (
    <div className="ac-page">

      <div className="ac-page__head">
        <div className="ac-page__headRow">
          <div>
            <h1 className="ac-page__title">{subject?.name || "Study Material"}</h1>
            <p className="ac-page__sub">Notes, worksheets and reference material shared by {teacherLabel}.</p>
          </div>
          <button type="button" className="ac-linkbtn" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading study material" />
      ) : error ? (
        <EmptyState icon="alert" title="Couldn't load this subject's material" message="Please try again in a moment." />
      ) : materials.length === 0 ? (
        <EmptyState
          icon="file"
          title="No study material yet"
          message="Notes, PDFs, and resources will appear here once your teacher adds them."
        />
      ) : (
        <>
          <div className="sm-toolbar">
            <div className="sm-chipRow">
              {chapterChips.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`sm-chip${chapterFilter === c ? " is-active" : ""}`}
                  onClick={() => setChapterFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <select
              className="sm-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              aria-label="Sort study material"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {rows.length === 0 ? (
            <EmptyState plain icon="file" title="No material in this chapter" />
          ) : (
            <div className="sm-list">
              {rows.map((item) => {
                const singleFile = item.files.length === 1 ? item.files[0] : null;
                const multiCount = item.files.length > 1 ? item.files.length : 0;
                const ext = singleFile ? getFileExt(singleFile.file_name) : (multiCount ? "DOCS" : "FILE");
                const isPdf = ext === "PDF";
                const sizeLabel = singleFile ? (singleFile.file_size || "—") : (multiCount ? `${multiCount} files` : "—");

                return (
                  <div key={item.id} className="sm-row">
                    <div className={`sm-badge${isPdf ? " sm-badge--pdf" : " sm-badge--doc"}`}>{ext}</div>

                    <div className="sm-rowMain">
                      <div className="sm-rowTitle">
                        {item.title}
                        {item.isNew && <span className="sm-newTag">NEW</span>}
                      </div>
                      <div className="sm-rowSub">{item.chapter} · {teacherLabel}</div>
                    </div>

                    <span className="sm-rowMeta">{sizeLabel}</span>
                    <span className="sm-rowMeta">{item.date}</span>

                    <button
                      type="button"
                      className={`sm-btn${loadingId === item.id ? " is-loading" : ""}`}
                      onClick={() => handleView(item)}
                    >
                      {loadingId === item.id ? "Opening…" : "View"}
                    </button>
                    <button type="button" className="sm-btn" onClick={() => handleDownload(item)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
  );
}
