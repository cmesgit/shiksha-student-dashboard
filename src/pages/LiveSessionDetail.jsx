import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import api from "../api/apiClient";
import ClassroomUI from "../components/live/ClassroomUI";
import ReconnectingBanner from "../components/live/ReconnectingBanner";
import ReviewModal from "../components/live/ReviewModal";

const cacheKey = (id) => "livekit_session_" + id;

function readCache(id) {
  try {
    const raw = sessionStorage.getItem(cacheKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const payload = JSON.parse(atob(parsed.token.split(".")[1]));
    if (payload.exp * 1000 > Date.now() + 30000) return parsed;
    sessionStorage.removeItem(cacheKey(id));
    return null;
  } catch {
    sessionStorage.removeItem(cacheKey(id));
    return null;
  }
}

const centerMsg = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  gap: 16,
  background: "#c9dde1",
};

export default function LiveSessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const joiningRef = useRef(false);

  useEffect(() => {
    if (joiningRef.current) return;
    joiningRef.current = true;
    const controller = new AbortController();
    const join = async () => {
      const cached = readCache(id);
      if (cached) { setData(cached); return; }
      try {
        const res = await api.post(
          "/livestream/sessions/" + id + "/join/",
          {},
          { signal: controller.signal }
        );
        sessionStorage.setItem(cacheKey(id), JSON.stringify(res.data));
        setData(res.data);
      } catch (err) {
        if (err.name === "CanceledError") return;
        console.error(err);
        setError(err?.response?.data?.detail || "You cannot join this session.");
      }
    };
    join();
    return () => controller.abort();
  }, [id]);

  const handleLeave = () => {
    sessionStorage.removeItem(cacheKey(id));
    navigate("/live-sessions");
  };

  // Show the review prompt first — it calls handleLeave itself once
  // submitted or skipped (see spec section 10: live/private sessions show
  // a review modal on leave, group sessions never do).
  const handleControlBarLeave = () => setShowReview(true);

  if (error) {
    return (
      <div style={centerMsg}>
        <p style={{ fontSize: 16, color: "#102a2a", margin: 0 }}>{error}</p>
        <button
          onClick={() => navigate("/live-sessions")}
          style={{
            padding: "10px 24px",
            borderRadius: 999,
            border: "none",
            background: "#005f6f",
            color: "#fff",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Go back
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={centerMsg}>
        <p style={{ fontSize: 16, color: "#102a2a", margin: 0 }}>Connecting...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={data.livekit_url}
      token={data.token}
      connect={true}
      video={data.role === "PRESENTER"}
      audio={true}
    >
      <ReconnectingBanner />
      <ClassroomUI role={data.role} sessionId={id} onLeave={handleControlBarLeave} />
      <RoomAudioRenderer />
      {showReview && <ReviewModal sessionId={id} onDone={handleLeave} />}
    </LiveKitRoom>
  );
}
