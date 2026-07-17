import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import PageHeader from "../components/PageHeader";
import api from "../api/apiClient";
import { LoadingState } from "../components/StateViews";
import "../styles/recordingDetail.css";

const LIBRARY_ID = import.meta.env.VITE_BUNNY_LIBRARY_ID;
const SAVE_INTERVAL_MS = 15000; // save progress every 15 seconds

export default function RecordingDetail() {
  const navigate = useNavigate();
  const { videoId } = useParams();  // videoId = recording UUID (DB id)

  const [videoData, setVideoData]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [startTime, setStartTime]   = useState(0);
  const [progressPct, setProgressPct] = useState(null);

  const progressIntervalRef = useRef(null);
  const currentPositionRef  = useRef(0);

  // ── 1. load recording + saved progress ───────────────────────────────────
  useEffect(() => {
    if (!videoId) return;

    const fetchAll = async () => {
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

  // ── render ────────────────────────────────────────────────────────────────
  if (loading) return <LoadingState label="Loading video" />;
  if (!videoData) return <div style={{ padding: 20 }}>Video not found.</div>;

  const videoUrl =
    `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoData.bunny_video_id}` +
    `?autoplay=false&start=${startTime}`;

  const teacher = videoData.uploaded_by_name || "Teacher";

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
    <div className="recordingDetailPage">

      <button className="recordingDetailBack" onClick={() => navigate(-1)}>
        &lt; Back
      </button>

      <div className="recordingDetailHeaderBox">
        <PageHeader title={videoData.title} />
      </div>

      <div className="recordingDetailBodyBox">

        <div className="recordingDetailPlayer">
          <div className="recordingDetailVideo">
            <iframe
              src={videoUrl}
              loading="lazy"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="recordingDetailVideoElement"
              title={videoData.title}
            />
          </div>

          {/* Progress bar under video */}
          {progressPct !== null && (
            <div className="recordingDetailProgressWrap">
              <div className="recordingDetailProgressBar">
                <div
                  className="recordingDetailProgressFill"
                  style={{ width: `${Math.min(progressPct, 100)}%` }}
                />
              </div>
              <span className="recordingDetailProgressLabel">
                {progressPct >= 100 ? "✓ Completed" : `${progressPct}% watched`}
              </span>
            </div>
          )}
        </div>

        <div className="recordingDetailInfo">

          <div className="recordingDetailInfoLeft">
            <p className="recordingDetailInfoTitle">{videoData.title}</p>
            <p className="recordingDetailInfoTeacher">{teacher}</p>
          </div>

          <div className="recordingDetailInfoRight">
            <p className="recordingDetailInfoDate">
              Date Recorded:<br />
              {videoData.session_date || "N/A"}
            </p>
            <p className="recordingDetailInfoDuration">
              Duration:<br />
              {formatDuration(videoData.duration_seconds)}
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}