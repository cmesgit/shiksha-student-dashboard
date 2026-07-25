import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { useAuth } from "../contexts/AuthContext";
import privateSession from "../api/privateSessionService";
import PrivateClassroomUI from "../components/live/PrivateClassroomUI";
import ReconnectingBanner from "../components/live/ReconnectingBanner";
import ReviewModal from "../components/live/ReviewModal";
import "../styles/privateSessions.css";

const fullscreenWrap = {
  width: "100vw",
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "#c9dde1",
  boxSizing: "border-box",
  padding: "14px",
};

const liveKitWrap = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

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

export default function PrivateSessionLive() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessionData, setSessionData] = useState(null);
  const [livekitData, setLivekitData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const detail = await privateSession.getSessionDetail(id);
        if (cancelled) return;
        setSessionData(detail);

        if (detail.status === "ongoing") {
          const joinData = await privateSession.joinSession(id);
          if (cancelled) return;
          setLivekitData(joinData);
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "Unable to join session. It may not have started yet."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleLeave = () => navigate("/private-sessions");

  // Both the explicit Leave button and an unexpected room disconnect route
  // through the review prompt first (spec: live/private sessions show a
  // review modal on leave, group sessions never do) — handleLeave itself
  // does the actual navigation once the modal is done.
  const handleControlBarLeave = () => setShowReview(true);

  if (loading) {
    return (
      <div style={centerMsg}>
        <p style={{ fontSize: 16, color: "#102a2a", margin: 0 }}>
          Joining private session...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={centerMsg}>
        <h2 style={{ margin: 0, color: "#102a2a" }}>Unable to join session</h2>
        <p style={{ color: "#475569", margin: 0 }}>{error}</p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => navigate("/private-sessions")}
            style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#015865", color: "#fff", fontWeight: 600, cursor: "pointer" }}
          >
            Back to Private Sessions
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "10px 24px", borderRadius: 8, border: "2px solid #94a3b8", background: "transparent", color: "#475569", fontWeight: 600, cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!livekitData) {
    return (
      <div style={centerMsg}>
        <h2 style={{ margin: 0, color: "#102a2a" }}>Session not started yet</h2>
        <p style={{ color: "#475569", margin: 0 }}>
          The teacher hasn't started this session. Please wait and try again.
        </p>
        <button
          onClick={() => navigate("/private-sessions")}
          style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#015865", color: "#fff", fontWeight: 600, cursor: "pointer" }}
        >
          Back to Private Sessions
        </button>
      </div>
    );
  }

  return (
    <div style={fullscreenWrap}>
      <LiveKitRoom
        serverUrl={livekitData.livekit_url}
        token={livekitData.token}
        connect={true}
        video={true}
        audio={true}
        style={liveKitWrap}
        onDisconnected={handleControlBarLeave}
      >
        <ReconnectingBanner />
        <PrivateClassroomUI
          role="STUDENT"
          sessionId={id}
          onLeave={handleControlBarLeave}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
      {showReview && <ReviewModal sessionId={id} onDone={handleLeave} sessionType="private" />}
    </div>
  );
}
