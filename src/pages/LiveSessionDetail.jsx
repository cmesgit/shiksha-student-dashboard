import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import api from "../api/apiClient";
import ClassroomUI from "../components/live/ClassroomUI";
import ReconnectingBanner from "../components/live/ReconnectingBanner";

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

export default function LiveSessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
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

  if (error) return (
    <div style={{ padding: 20 }}>
      <p style={{ color: "red" }}>{error}</p>
      <button onClick={() => navigate("/live-sessions")}>Go back</button>
    </div>
  );

  if (!data) return <div style={{ padding: 20 }}>Joining session...</div>;

  return (
    <LiveKitRoom
      serverUrl={data.livekit_url}
      token={data.token}
      connect={true}
      video={data.role === "PRESENTER"}
      audio={true}
    >
      <ReconnectingBanner />
      <ClassroomUI role={data.role} sessionId={id} onLeave={handleLeave} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
