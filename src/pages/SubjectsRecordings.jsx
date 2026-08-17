// src/pages/SubjectsRecordings.jsx
// ──────────────────────────────────────────────────────────────────────────
// Academy "Recordings" — the learner's single recordings hub. Matches the
// design handoff's Recordings screen: a subject-filter pill navbar ("All" +
// one pill per subject) above a 3-column card grid, no separate
// subject-picker step. Reuses the existing subjects/recordings/progress
// endpoints (no new backend calls): fetch the course's subjects, then each
// subject's recordings in parallel, flatten and tag them with their subject,
// then fetch per-recording watch progress in parallel.
//
// Students get no upload/delete actions — those stay teacher-only. The
// per-card action is Watch / Continue / Rewatch depending on watch progress.
// ──────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api/apiClient";
import { useCourse } from "../contexts/CourseContext";
import { LoadingState, EmptyState } from "../components/StateViews";
import { subjectChipSlot } from "../utils/subjectChips";
import "../styles/academyCommon.css";
import "../styles/recordingsHub.css";

const DATE_FMT = { day: "2-digit", month: "short" };
function formatDate(d) {
  if (!d) return "";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-GB", DATE_FMT);
}

function formatDuration(secs) {
  if (!secs) return null;
  const mins = Math.round(secs / 60);
  if (mins < 1) return "<1 min";
  return `${mins} min`;
}

// Derives the footer copy/progress-bar width/button label from a saved
// watch-progress record (or its absence).
function watchState(progress) {
  const pct = progress?.percent_complete ?? null;
  const done = Boolean(progress?.completed) || pct >= 100;
  if (done) return { label: "Watched", width: 100, btnText: "Rewatch" };
  if (pct === null || pct <= 0) return { label: "Not started", width: 0, btnText: "Watch" };
  return { label: `${pct}% watched`, width: pct, btnText: "Continue" };
}

const RECORDING_STATUS_FINISHED = 4;

export default function SubjectsRecordings() {
  const navigate = useNavigate();
  const { activeCourse } = useCourse();
  // Reachable either at /subjects/recordings (browse all, filter via pills)
  // or /subjects/recordings/:subjectId (deep link from SubjectDetails /
  // LiveSessions "see recordings") — same hub, just pre-filtered.
  const { subjectId: subjectIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const preselectSubject = subjectIdParam || searchParams.get("subject") || null;

  const [subjects, setSubjects] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(preselectSubject || "all");

  useEffect(() => {
    if (!activeCourse) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setActiveFilter(preselectSubject || "all");

    const fetchAll = async () => {
      try {
        const subjRes = await api.get(`/courses/${activeCourse.id}/subjects/`);
        const subjectList = subjRes.data || [];
        if (cancelled) return;
        setSubjects(subjectList);

        const perSubject = await Promise.allSettled(
          subjectList.map((s) =>
            api.get(`/courses/subjects/${s.id}/recordings/`).then((res) => ({
              subjectId: s.id,
              subjectName: s.name,
              items: res.data || [],
            }))
          )
        );

        const flat = [];
        perSubject.forEach((result) => {
          if (result.status !== "fulfilled") return;
          const { subjectId, subjectName, items } = result.value;
          items.forEach((item) => flat.push({ ...item, subjectId, subjectName }));
        });
        flat.sort((a, b) => new Date(b.session_date || 0) - new Date(a.session_date || 0));

        if (cancelled) return;
        setRecordings(flat);

        const progressResults = await Promise.allSettled(
          flat.map((r) =>
            api.get(`/courses/recordings/${r.id}/progress/`).then((p) => ({
              id: r.id,
              ...p.data,
            }))
          )
        );

        const map = {};
        progressResults.forEach((result) => {
          if (result.status === "fulfilled") map[result.value.id] = result.value;
        });
        if (!cancelled) setProgressMap(map);
      } catch (err) {
        console.error("Failed to load recordings", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [activeCourse, preselectSubject]);

  // Only show a pill for subjects that actually have a recording.
  const subjectsWithRecordings = useMemo(() => {
    const ids = new Set(recordings.map((r) => r.subjectId));
    return subjects.filter((s) => ids.has(s.id));
  }, [subjects, recordings]);

  // Colour comes from the subject NAME, not its position in the list — keying
  // off the index meant a subject changed colour whenever another subject
  // gained or lost a recording, and disagreed with every other screen.

  const filtered = useMemo(() => {
    if (activeFilter === "all") return recordings;
    return recordings.filter((r) => String(r.subjectId) === String(activeFilter));
  }, [recordings, activeFilter]);

  const handleOpen = (rec) => {
    if (rec.status !== RECORDING_STATUS_FINISHED) return;
    navigate(`/subjects/recordings/${rec.subjectId}/video/${rec.id}`);
  };

  return (
    <div className="ac-page">
      <div className="ac-page__head">
        <h1 className="ac-page__title">Recordings</h1>
        <p className="ac-page__sub">
          Catch up on any class you missed — recordings stay available all term.
        </p>
      </div>

      {loading ? (
        <LoadingState label="Loading recordings" />
      ) : !activeCourse ? (
        <EmptyState
          icon="video"
          title="No course selected"
          message="Enrol in a course to see its recordings."
          action={{ label: "Browse courses", to: "/browse-courses", icon: "search" }}
        />
      ) : recordings.length === 0 ? (
        <EmptyState
          icon="video"
          title="No recordings yet"
          message="Recorded classes will appear here, grouped by subject, once your teachers upload them."
        />
      ) : (
        <>
          <div className="recFilters" data-tour="recordings.filters">
            <button
              type="button"
              className={`recChip${activeFilter === "all" ? " is-active" : ""}`}
              onClick={() => setActiveFilter("all")}
            >
              All
            </button>
            {subjectsWithRecordings.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`recChip${String(activeFilter) === String(s.id) ? " is-active" : ""}`}
                onClick={() => setActiveFilter(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              plain
              icon="video"
              title="No recordings"
              message="Nothing here yet for this subject."
            />
          ) : (
            <div className="recGrid" data-tour="recordings.grid">
              {filtered.map((rec) => {
                const ready = rec.status === RECORDING_STATUS_FINISHED;
                const state = watchState(progressMap[rec.id]);
                const duration = formatDuration(rec.duration_seconds);
                const slot = subjectChipSlot(rec.subjectName);

                return (
                  <div
                    key={rec.id}
                    className={`recCard${ready ? "" : " recCard--pending"}`}
                    role={ready ? "button" : undefined}
                    tabIndex={ready ? 0 : undefined}
                    onClick={() => handleOpen(rec)}
                    onKeyDown={(e) => {
                      if (ready && (e.key === "Enter" || e.key === " ")) handleOpen(rec);
                    }}
                  >
                    <div
                      className="recCard__thumb"
                      style={rec.thumbnail_url ? { backgroundImage: `url(${rec.thumbnail_url})` } : undefined}
                    >
                      {ready ? (
                        <>
                          <span className="recCard__play" aria-hidden="true">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="#2d4560">
                              <polygon points="7 4 20 12 7 20 7 4" />
                            </svg>
                          </span>
                          {duration && <span className="recCard__duration">{duration}</span>}
                        </>
                      ) : (
                        <span className="recCard__pendingLabel">Processing…</span>
                      )}
                    </div>

                    <div className="recCard__body">
                      <div className="recCard__top">
                        <span className={`recCard__chip subj-chip--${slot}`}>{rec.subjectName}</span>
                        <span className="recCard__date">{formatDate(rec.session_date)}</span>
                      </div>

                      <div>
                        <div className="recCard__topic">{rec.title}</div>
                        <div className="recCard__teacher">{rec.uploaded_by_name || "Teacher"}</div>
                      </div>

                      <div className="recCard__footer">
                        {ready ? (
                          <div className="recCard__progressWrap">
                            <div className="recCard__progressBar">
                              <div
                                className="recCard__progressFill"
                                style={{ width: `${Math.min(Math.max(state.width, 0), 100)}%` }}
                              />
                            </div>
                            <span className="recCard__progressLabel">{state.label}</span>
                          </div>
                        ) : (
                          <span className="recCard__progressLabel">Ready once processing finishes</span>
                        )}

                        <div className="recCard__actions">
                          <button
                            type="button"
                            className="recCard__btn"
                            disabled={!ready}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpen(rec);
                            }}
                          >
                            {ready ? state.btnText : "Pending"}
                          </button>
                        </div>
                      </div>
                    </div>
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
