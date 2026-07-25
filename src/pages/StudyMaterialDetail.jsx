// src/pages/StudyMaterialDetail.jsx
// ──────────────────────────────────────────────────────────────────────────
// Academy "Study Material" detail — the files that belong to one material.
// The design handoff's "Study Materials" screen treats each material as a
// single file (one row, one badge, one size); this app's backend allows a
// material to carry several files, so this page is the drill-down that
// lists them individually. Restyled to reuse the same row pattern, badge
// colours, and button style as the list screen (sm-badge / sm-row / sm-btn
// from studyMaterial.css) so the two screens read as one system. Students
// only get View + Download here — Manage/Delete is teacher-only and isn't
// part of this page.
// ──────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/apiClient";
import { LoadingState, EmptyState } from "../components/StateViews";
import "../styles/academyCommon.css";
import "../styles/studyMaterial.css";
import "../styles/studyMaterialDetail.css";

function getFileExt(name = "") {
  const ext = name.split(".").pop();
  return ext ? ext.toUpperCase() : "FILE";
}

export default function StudyMaterialDetail() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [copiedNote, setCopiedNote] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api.get(`/materials/materials/${id}/`)
      .then((res) => setMaterial(res.data))
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleView = (file) => {
    setViewingId(file.id);
    setTimeout(() => {
      setViewingId(null);
      window.open(file.file_url, "_blank", "noopener,noreferrer");
    }, 300);
  };

  const handleCopyNote = () => {
    if (!material?.description) return;
    navigator.clipboard.writeText(material.description).then(() => {
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="ac-page">
        <LoadingState label="Loading study material" />
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="ac-page">
        <button type="button" className="ac-linkbtn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <EmptyState icon="alert" title="Couldn't load this material" message="Please try again in a moment." />
      </div>
    );
  }

  const files = material.files || [];
  const dateLabel = new Date(material.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="ac-page">

      <div className="ac-page__head">
        <div className="ac-page__headRow">
          <div>
            <h1 className="ac-page__title">{material.title}</h1>
            <p className="ac-page__sub">
              {material.chapter_title || "No chapter"} · added {dateLabel} · {files.length} file{files.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button type="button" className="ac-linkbtn" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        </div>
      </div>

      <div className="smd-grid">

        <div className="smd-note tk-card">
          <div className="smd-note-label-row">
            <p className="smd-note-label">Note</p>
            <button
              type="button"
              className={`smd-copy-btn${copiedNote ? " copied" : ""}`}
              onClick={handleCopyNote}
              title="Copy note"
              disabled={!material.description}
            >
              {copiedNote ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="smd-note-box">{material.description || "No note provided"}</div>
        </div>

        <div className="smd-files tk-card">
          <div className="smd-files-header">
            <span>Files</span>
            <span className="smd-files-count">{files.length}</span>
          </div>

          {files.length === 0 ? (
            <EmptyState plain icon="file" title="No files attached" />
          ) : (
            <div className="sm-list">
              {files.map((file) => {
                const ext = getFileExt(file.file_name);
                const isPdf = ext === "PDF";
                return (
                  <div key={file.id} className="sm-row">
                    <div className={`sm-badge${isPdf ? " sm-badge--pdf" : " sm-badge--doc"}`}>{ext}</div>

                    <div className="sm-rowMain">
                      <div className="sm-rowTitle" title={file.file_name}>{file.file_name}</div>
                    </div>

                    <span className="sm-rowMeta">{file.file_size || "—"}</span>

                    <button
                      type="button"
                      className={`sm-btn${viewingId === file.id ? " is-loading" : ""}`}
                      onClick={() => handleView(file)}
                    >
                      {viewingId === file.id ? "Opening…" : "View"}
                    </button>

                    <a
                      href={file.file_url}
                      download={file.file_name}
                      className="sm-btn"
                      title="Download"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
