import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../api/apiClient";
import { LoadingState, ErrorState, EmptyState } from "../components/StateViews";
import { subjectChipSlot } from "../utils/subjectChips";
import { useToast } from "../contexts/ToastContext";
import TourHeaderButton from "../tour/TourHeaderButton";
import "../styles/academyCommon.css";
import "../styles/assignmentDetail.css";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB") : "";

const fmtDueShort = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "";

export default function AssignmentDetail() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { subjectId, assignmentId } = useParams();
  const { showToast } = useToast();

  const [assignment, setAssignment] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!assignmentId) return;

    const fetchAssignment = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/assignments/${assignmentId}/`);
        const data = res.data;

        setAssignment(data);

        if (
          data.submission_status === "SUBMITTED" ||
          data.status === "SUBMITTED"
        ) {
          setIsSubmitted(true);
          setSubmittedAt(
            data.submitted_at ? new Date(data.submitted_at) : null
          );
        } else {
          setIsSubmitted(false);
          setSubmittedAt(null);
        }
      } catch (err) {
        console.error("Assignment detail error:", err);
        setError(err.response?.data?.detail || "Unable to load assignment.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [assignmentId]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    const allowedExtensions = [".pdf", ".doc", ".docx"];

    const fileName = file.name.toLowerCase();

    const isValidMime = allowedMimeTypes.includes(file.type);
    const isValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidMime && !isValidExtension) {
      showToast({ type: "error", message: "Only PDF, DOC, and DOCX files are allowed." });
      return;
    }

    setUploadedFile(file);
  };

  const handleSubmit = async () => {
    if (!uploadedFile) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("file", uploadedFile);

      await api.post(`/assignments/${assignment.id}/submit/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const res = await api.get(`/assignments/${assignmentId}/`);
      const updated = res.data;

      setAssignment(updated);
      setIsSubmitted(true);
      setSubmittedAt(
        updated.submitted_at ? new Date(updated.submitted_at) : new Date()
      );
      setUploadedFile(null);
    } catch (err) {
      console.error("Submission error:", err);
      showToast({ type: "error", message: err.response?.data?.detail || "Submission failed." });
    } finally {
      setSubmitting(false);
    }
  };

  const backHref = subjectId ? `/subjects/${subjectId}/assignments` : "/assignments";

  const stKey = useMemo(() => {
    if (!assignment) return "due";
    if (isSubmitted) return "submitted";
    if (assignment.due_date && new Date(assignment.due_date).getTime() < Date.now()) return "overdue";
    return "due";
  }, [assignment, isSubmitted]);

  const stLabel =
    stKey === "submitted" ? "Submitted" : stKey === "overdue" ? "Overdue" : `Due ${fmtDueShort(assignment?.due_date)}`;

  if (loading) return <LoadingState label="Loading assignment" />;
  if (error) return <ErrorState message={error} />;
  if (!assignment)
    return (
      <EmptyState
        icon="file"
        title="Assignment not found"
        message="This assignment may have been removed, or the link is out of date."
        action={{ label: "Back", onClick: () => navigate(-1) }}
      />
    );

  const legacyAttachmentName = assignment.attachment
    ? assignment.attachment.split("/").pop()
    : null;

  const hasAnyAttachment = Boolean(assignment.attachment) || (assignment.files?.length > 0);

  return (
    <div className="ac-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <button type="button" className="asg-back" onClick={() => navigate(backHref)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Assignments
        </button>
        <TourHeaderButton pathname={pathname} />
      </div>

      <div className="asg-detailGrid">
        {/* ── Main column ─────────────────────────────────────────── */}
        <div className="asg-detailMain">
          <div className="asg-card">
            <div className="asg-row__tags" style={{ marginBottom: 12 }}>
              {assignment.subject_name && (
                <span className={`asg-chip asg-chip--${subjectChipSlot(assignment.subject_name)}`}>
                  {assignment.subject_name}
                </span>
              )}
              <span className={`asg-statusChip asg-statusChip--${stKey}`} data-tour="assignment.status-chip">{stLabel}</span>
            </div>
            <h1 className="asg-detailTitle">{assignment.title}</h1>
            <div className="asg-detailMetaRow">
              {assignment.teacher_name && (
                <span>Posted by <strong>{assignment.teacher_name}</strong></span>
              )}
              <span>Due <strong>{fmtDate(assignment.due_date)}</strong></span>
            </div>
          </div>

          <div className="asg-card">
            <h3 className="asg-cardHeading">Instructions</h3>
            <p className="asg-description">{assignment.description}</p>
          </div>

          <div className="asg-card">
            <h3 className="asg-cardHeading">Attachments</h3>

            {legacyAttachmentName && (
              <div className="asg-attachmentRow">
                <div className="asg-attachmentIcon">FILE</div>
                <div className="asg-attachmentMeta">
                  <div className="asg-attachmentName">{legacyAttachmentName}</div>
                  <div className="asg-attachmentSub">
                    Posted by {assignment.teacher_name || "your teacher"}
                  </div>
                </div>
                <div className="asg-attachmentActions">
                  <button
                    type="button"
                    className="asg-ghostBtn"
                    onClick={() => window.open(assignment.attachment, "_blank")}
                  >
                    View
                  </button>
                  <a href={assignment.attachment} download className="asg-ghostBtn">
                    Download
                  </a>
                </div>
              </div>
            )}

            {assignment.files?.map((f) => (
              <div className="asg-attachmentRow" key={f.id}>
                <div className="asg-attachmentIcon">FILE</div>
                <div className="asg-attachmentMeta">
                  <div className="asg-attachmentName">{f.original_filename}</div>
                  <div className="asg-attachmentSub">
                    Posted by {assignment.teacher_name || "your teacher"}
                  </div>
                </div>
                <div className="asg-attachmentActions">
                  <button
                    type="button"
                    className="asg-ghostBtn"
                    onClick={() => window.open(f.url, "_blank")}
                  >
                    View
                  </button>
                  <a href={f.url} download className="asg-ghostBtn">
                    Download
                  </a>
                </div>
              </div>
            ))}

            {!hasAnyAttachment && (
              <p className="asg-noAttachment">No file attached to this assignment.</p>
            )}
          </div>
        </div>

        {/* ── Side column ─────────────────────────────────────────── */}
        <div className="asg-detailSide">
          <div className="asg-card">
            <h3 className="asg-cardHeading">Your submission</h3>

            {isSubmitted ? (
              <div className="asg-submittedHero">
                <div className="asg-submittedTick">✓</div>
                <div className="asg-submittedLabel">Submitted</div>
                {assignment.marks_obtained != null ? (
                  <div className="asg-gradedBlock">
                    <div style={{ fontSize: 22, fontWeight: 700 }}>
                      {assignment.marks_obtained}/{assignment.max_marks}
                    </div>
                    {assignment.feedback && (
                      <p className="asg-submittedText">{assignment.feedback}</p>
                    )}
                    {assignment.graded_at && (
                      <p className="asg-submittedText" style={{ fontSize: 12, opacity: 0.7 }}>
                        Graded {fmtDate(assignment.graded_at)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="asg-submittedText">
                    Your work has been submitted. You'll receive feedback once graded.
                  </p>
                )}

                {submittedAt && (
                  <div className="asg-submittedMetaRow">
                    <span>Submitted {fmtDate(submittedAt)}</span>
                    {assignment.submission_status_label && (
                      <span className={`asg-lateChip ${assignment.submission_status_label === "Late" ? "asg-lateChip--late" : ""}`}>
                        {assignment.submission_status_label}
                      </span>
                    )}
                  </div>
                )}

                {assignment.submitted_file && (
                  <div className="asg-attachmentRow asg-attachmentRow--tight">
                    <div className="asg-attachmentIcon">FILE</div>
                    <div className="asg-attachmentMeta">
                      <div className="asg-attachmentName">
                        {assignment.submitted_file.split("/").pop()}
                      </div>
                    </div>
                    <div className="asg-attachmentActions">
                      <button
                        type="button"
                        className="asg-ghostBtn"
                        onClick={() => window.open(assignment.submitted_file, "_blank")}
                      >
                        View
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="asg-submitForm">
                <label className="asg-dropzone" data-tour="assignment.upload-zone">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    hidden
                    onChange={handleFileUpload}
                  />
                  {uploadedFile ? (
                    <div className="asg-dropzone__chosen">
                      <div className="asg-attachmentIcon">FILE</div>
                      <div className="asg-attachmentMeta">
                        <div className="asg-attachmentName">{uploadedFile.name}</div>
                        <div className="asg-attachmentSub asg-attachmentSub--ready">Ready to submit</div>
                      </div>
                    </div>
                  ) : (
                    <div className="asg-dropzone__empty">
                      <div className="asg-dropzone__icon" aria-hidden="true">📎</div>
                      <div className="asg-dropzone__label">Click to upload your work</div>
                      <div className="asg-dropzone__hint">PDF, DOC, DOCX</div>
                    </div>
                  )}
                </label>

                {uploadedFile && (
                  <button
                    type="button"
                    className="asg-removeFileBtn"
                    onClick={() => setUploadedFile(null)}
                  >
                    Remove file
                  </button>
                )}

                <button
                  type="button"
                  className="asg-submitBtn"
                  onClick={handleSubmit}
                  disabled={!uploadedFile || submitting}
                >
                  {submitting ? "Submitting…" : "Submit assignment"}
                </button>
              </div>
            )}
          </div>

          <div className="asg-card">
            <h3 className="asg-cardHeading">Details</h3>
            <div className="asg-detailsList">
              {assignment.subject_name && (
                <div className="asg-detailsRow">
                  <span>Subject</span>
                  <strong>{assignment.subject_name}</strong>
                </div>
              )}
              {assignment.chapter_name && (
                <div className="asg-detailsRow">
                  <span>Chapter</span>
                  <strong>{assignment.chapter_name}</strong>
                </div>
              )}
              {assignment.teacher_name && (
                <div className="asg-detailsRow">
                  <span>Posted by</span>
                  <strong>{assignment.teacher_name}</strong>
                </div>
              )}
              <div className="asg-detailsRow">
                <span>Assigned on</span>
                <strong>{fmtDate(assignment.assigned_on)}</strong>
              </div>
              <div className="asg-detailsRow">
                <span>Due date</span>
                <strong>{fmtDate(assignment.due_date)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
