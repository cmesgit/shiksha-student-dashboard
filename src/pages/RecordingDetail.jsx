import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { LoadingState, EmptyState, ErrorState } from "../components/StateViews";
import api from "../api/apiClient";
import NotesViewModal from "../components/live/NotesViewModal";
import { BUNNY_LIBRARY_ID } from "../config/urls";
import "../styles/academyCommon.css";
import "../styles/recordingDetail.css";
const SAVE_INTERVAL_MS = 15000; // save progress every 15 seconds

export default function RecordingDetail() {
  const navigate = useNavigate();
  const { videoId } = useParams();  // videoId = recording UUID (DB id)

  const [videoData, setVideoData]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [startTime, setStartTime]   = useState(0);
  const [progressPct, setProgressPct] = useState(null);
  const [showNotes, setShowNotes] = useState(false);

  const progressIntervalRef = useRef(null);
  const currentPositionRef  = useRef(0);
  const playerWrapRef       = useRef(null);

  // ── 1. load recording + saved progress ───────────────────────────────────
  useEffect(() => {
    if (!videoId) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [recRes, progRes] = await Promise.all([
          api.get(`/courses/recordings/${videoId}/`),
          api.get(`/courses/recordings/${videoId}/progress/`),
        ]);

        setVideoData(recRes.data);

        const savedPosition = progRes.data.last_position || 0;
        const pct = progRes.data.percent_complete;

        // Only resume if more than 10 seconds in (avoid resuming from the very start)
        setStartTime(savedPosition > 10 ? Math.floor(savedPosition) : 0);
        setProgressPct(pct);
        currentPositionRef.current = savedPosition;

      } catch (err) {
        console.error("Failed to load recording", err);
        setVideoData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [videoId]);

  // ── 2. save progress periodically via postMessage from Bunny iframe ──────
  // Bunny player emits: { event: "timeupdate", currentTime: N, duration: N }
  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.data || typeof e.data !== "object") return;
      const { event, currentTime, duration } = e.data;

      if (event === "timeupdate" && typeof currentTime === "number") {
        currentPositionRef.current = currentTime;

        if (duration && duration > 0) {
          setProgressPct(Math.round((currentTime / duration) * 100));
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ── 3. auto-save on interval ─────────────────────────────────────────────
  const saveProgress = useCallback(async () => {
    const pos = currentPositionRef.current;
    if (!videoId || pos <= 0) return;
    try {
      await api.post(`/courses/recordings/${videoId}/progress/save/`, {
        last_position: pos,
      });
    } catch (err) {
      console.error("Failed to save progress", err);
    }
  }, [videoId]);

  useEffect(() => {
    progressIntervalRef.current = setInterval(saveProgress, SAVE_INTERVAL_MS);
    return () => {
      clearInterval(progressIntervalRef.current);
      saveProgress(); // save on unmount (page leave)
    };
  }, [saveProgress]);

  // ── 4. fullscreen toggle for the player ──────────────────────────────────
  const handleFullscreen = () => {
    const el = playerWrapRef.current;
    if (!el) return;
    const request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.msRequestFullscreen;
    if (request) request.call(el);
  };

  const formatDuration = (secs) => {
    if (!secs) return "N/A";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m} min ${s > 0 ? `${s}s` : ""}`.trim();
    return `${s}s`;
  };

  return (
    <div className="ac-page recDetail">
      <button type="button" className="ac-linkbtn recDetail__back" onClick={() => navigate(-1)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Recordings
      </button>

      {loading ? (
        <LoadingState label="Loading video" />
      ) : !videoData ? (
        <EmptyState
          icon="video"
          title="Recording not found"
          message="This recording may have been removed or you no longer have access to it."
        />
      ) : (
        <>
          <div className="ac-page__headRow">
            <div className="ac-page__head">
              <h1 className="ac-page__title">{videoData.title}</h1>
              <p className="ac-page__sub">{videoData.uploaded_by_name || "Teacher"}</p>
            </div>
            <button type="button" className="ac-linkbtn" onClick={() => setShowNotes(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M9 13h6M9 17h6" />
              </svg>
              My notes
            </button>
          </div>

          <div className="recDetail__player">
            <div className="recDetail__video" ref={playerWrapRef}>
              {BUNNY_LIBRARY_ID ? (
                <iframe
                  src={`https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoData.bunny_video_id}?autoplay=false&start=${startTime}`}
                  loading="lazy"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="recDetail__videoElement"
                  title={videoData.title}
                />
              ) : (
                <ErrorState
                  title="Playback isn't configured"
                  message="This recording can't be played right now — the video library isn't set up. Contact support."
                />
              )}
              <button
                type="button"
                className="recDetail__fullscreenBtn"
                onClick={handleFullscreen}
                aria-label="Fullscreen"
                title="Fullscreen"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                  <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
              </button>
            </div>

            {progressPct !== null && (
              <div className="recDetail__progressWrap">
                <div className="recDetail__progressBar">
                  <div
                    className="recDetail__progressFill"
                    style={{ width: `${Math.min(Math.max(progressPct, 0), 100)}%` }}
                  />
                </div>
                <span className="recDetail__progressLabel">
                  {progressPct >= 100 ? "Watched" : `${progressPct}% watched`}
                </span>
              </div>
            )}
          </div>

          <div className="recDetail__meta">
            <div className="recDetail__metaItem">
              <span className="recDetail__metaLabel">Date recorded</span>
              <span className="recDetail__metaValue">{videoData.session_date || "N/A"}</span>
            </div>
            <div className="recDetail__metaItem">
              <span className="recDetail__metaLabel">Duration</span>
              <span className="recDetail__metaValue">{formatDuration(videoData.duration_seconds)}</span>
            </div>
          </div>
        </>
      )}

      {showNotes && (
        <NotesViewModal sessionId={videoId} sessionType="recording" onClose={() => setShowNotes(false)} />
      )}
    </div>
  );
}
