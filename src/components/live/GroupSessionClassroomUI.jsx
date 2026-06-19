/**
 * GroupSessionClassroomUI.jsx
 *
 * Group-session-only live room:
 * - Uses GroupSessionControlBar.jsx instead of shared ControlBar.jsx
 * - Uses GroupSessionChatPanel.jsx instead of shared ChatPanel.jsx
 * - Uses groupSessionLive.css instead of shared live.css
 *
 * This keeps Private Session and normal Live Sessions unchanged.
 */

import { useTracks, VideoTrack, useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import GroupSessionChatPanel from "./GroupSessionChatPanel";
import GroupSessionControlBar from "./GroupSessionControlBar";
import React, { useState, useRef, useEffect } from "react";
import "../../styles/groupSessionLive.css";
import api from "../../api/apiClient";
import { useAuth } from "../../contexts/AuthContext";
import soundManager from "../../utils/soundManager";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return d;
  }
}

function formatTime(t) {
  if (!t) return "—";
  try {
    const [h, m] = String(t).split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "p.m" : "a.m";
    const h12 = hour % 12 || 12;
    return `${h12}:${m || "00"} ${ampm}`;
  } catch {
    return t;
  }
}

function addMinutesToTime(time, minutes) {
  if (!time || !minutes) return "";
  const [h, m] = String(time).split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  d.setMinutes(d.getMinutes() + Number(minutes || 0));
  return d.toTimeString().slice(0, 5);
}

function formatTiming(session) {
  if (!session?.time) return "—";
  const end = addMinutesToTime(session.time, session.durationMinutes || session.duration_minutes || 0);
  return `${formatTime(session.time)}${end ? ` (${formatTime(end)})` : ""}`;
}

function sameId(a, b) {
  return a && b && String(a) === String(b);
}

export default function GroupSessionClassroomUI({
  role,
  session,
  chatConfig,
  onLeave,
  groupSession = false,
  groupSessionRemainingMs = null,
  isHost = false,
  onEndSession = null,
}) {
  const isPresenter = role === "PRESENTER" || role === "teacher";

  const [raisedHands, setRaisedHands] = useState({});
  const [raiseHandToasts, setRaiseHandToasts] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [peopleTab, setPeopleTab] = useState("participants");
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const containerRef = useRef(null);
  const room = useRoomContext();
  const { user } = useAuth();
  const myUserId = user?.id ? String(user.id) : null;
  const hostId = session?.hostId ? String(session.hostId) : null;
  const hostName = session?.hostName || "";

  const togglePanel = (panel) => {
    setActivePanel((current) => (current === panel ? null : panel));
    if (panel === "people") setPeopleTab("participants");
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const el = containerRef.current;
        if (el?.requestFullscreen) await el.requestFullscreen();
        else if (el?.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if (el?.msRequestFullscreen) await el.msRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        else if (document.msExitFullscreen) await document.msExitFullscreen();
      }
    } catch {}
  };

  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fn);
    document.addEventListener("webkitfullscreenchange", fn);

    return () => {
      document.removeEventListener("fullscreenchange", fn);
      document.removeEventListener("webkitfullscreenchange", fn);
    };
  }, []);

  useEffect(() => {
    if (!room) return;

    const events = [
      "trackMuted", "trackUnmuted", "trackPublished", "trackUnpublished",
      "trackSubscribed", "trackUnsubscribed", "participantConnected",
      "participantDisconnected", "localTrackPublished", "localTrackUnpublished",
    ];

    events.forEach((evt) => room.on(evt, bump));
    return () => events.forEach((evt) => room.off(evt, bump));
  }, [room]);

  useEffect(() => {
    if (!room) return;

    const handleData = (payload, participant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));

        if (msg.type === "raise-hand" || msg.type === "RAISE_HAND") {
          const identity = participant.identity;
          const displayName = participant.name || identity;

          setRaisedHands((prev) => ({ ...prev, [identity]: true }));

          const toastId = Date.now() + Math.random();
          setRaiseHandToasts((prev) => [...prev, { id: toastId, identity, displayName }]);

          setTimeout(() => {
            setRaiseHandToasts((prev) => prev.filter((t) => t.id !== toastId));
          }, 5000);
        }

        if (msg.type === "lower-hand" || msg.type === "LOWER_HAND") {
          const identity = participant.identity;
          setRaisedHands((prev) => {
            const u = { ...prev };
            delete u[identity];
            return u;
          });
        }
      } catch {}
    };

    room.on("dataReceived", handleData);
    return () => room.off("dataReceived", handleData);
  }, [room]);

  useEffect(() => {
    if (!chatConfig || !session?.id) return;

    api.get(chatConfig.restGetPath).then((res) => {
      setChatMessages((res.data || []).map((m) => ({
        id: m.id,
        sender: m.sender_name,
        text: m.message,
        isTeacher: m.sender_role === "teacher",
        isMe: myUserId && String(m.sender_id) === myUserId,
        time: new Date(m.created_at),
      })));
    }).catch(() => {});
  }, [session?.id, myUserId, chatConfig?.restGetPath]);

  useEffect(() => {
    if (!chatConfig || !session?.id) return;

    let ws;
    let reconnectTimer;
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;

      const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
      const wsHost = import.meta.env.VITE_WS_HOST || (isLocal ? window.location.host : "api.shikshacom.com");
      const proto = isLocal && window.location.protocol !== "https:" ? "ws:" : "wss:";
      const token = localStorage.getItem("access") || sessionStorage.getItem("access") || "";

      try {
        ws = new WebSocket(`${proto}//${wsHost}${chatConfig.wsPath}${token ? `?token=${token}` : ""}`);

        ws.onmessage = (ev) => {
          try {
            const { data } = JSON.parse(ev.data);
            if (!data) return;

            setChatMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;

              const isMe = myUserId && String(data.sender_id) === myUserId;
              if (!isMe) soundManager.messageReceive?.();

              return [...prev, {
                id: data.id,
                sender: data.sender_name,
                text: data.message,
                isTeacher: data.sender_role === "teacher",
                isMe,
                time: new Date(data.created_at),
              }];
            });
          } catch {}
        };

        ws.onclose = () => {
          if (!unmounted) reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => ws.close();
      } catch {}
    };

    connect();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [session?.id, myUserId, chatConfig?.wsPath]);

  const sendMessage = async (text) => {
    soundManager.messageSend?.();

    if (!chatConfig) return;

    try {
      const res = await api.post(chatConfig.restPostPath, { message: text });
      const msg = res.data;

      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;

        return [...prev, {
          id: msg.id,
          sender: "You",
          text: msg.message,
          isMe: true,
          isTeacher: isPresenter,
          time: new Date(msg.created_at),
        }];
      });
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { sender: "You", text, isMe: true, time: new Date() },
      ]);
    }
  };

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const screenTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const cameraTrack = tracks.find((t) => t.source === Track.Source.Camera);
  const mainTrack = screenTrack || cameraTrack;
  const pipTrack = screenTrack ? cameraTrack : null;

  if (!mainTrack) {
    return (
      <div className="gs-waiting-screen">
        <div className="gs-waiting-card">
          <div className="gs-waiting-pulse" />
          <h2>Enable your camera to start the session</h2>
        </div>
      </div>
    );
  }

  const localId = room.localParticipant?.identity;
  const localName = room.localParticipant?.name || localId || "You";

  const remoteParticipants = room.remoteParticipants
    ? Array.from(room.remoteParticipants.values()).map((p) => {
        const participantIsHost =
          sameId(p.identity, hostId) ||
          (!!hostName && String(p.name || "").trim() === String(hostName).trim());

        return {
          identity: p.identity,
          name: p.name || p.identity,
          role: participantIsHost ? "Host" : "Student",
          micOn: p.isMicrophoneEnabled,
          camOn: p.isCameraEnabled,
          handRaised: !!raisedHands[p.identity],
          isHost: participantIsHost,
          isMe: false,
        };
      })
    : [];

  const peopleList = [
    {
      identity: localId,
      name: localName,
      role: isHost ? "Host" : "Student",
      micOn: room.localParticipant?.isMicrophoneEnabled,
      camOn: room.localParticipant?.isCameraEnabled,
      handRaised: false,
      isHost,
      isMe: true,
    },
    ...remoteParticipants,
  ];

  const joinRequests = [];

  return (
    <div
      className={
        "gs-room" +
        (isFullscreen ? " gs-room--fs" : "") +
        (!activePanel ? " gs-room--panel-closed" : "")
      }
      ref={containerRef}
    >
      {raiseHandToasts.length > 0 && (
        <div className="gs-rh-toasts">
          {raiseHandToasts.map((t) => (
            <div key={t.id} className="gs-rh-toast">
              <span>✋ <strong>{t.displayName || t.identity}</strong> raised their hand</span>
            </div>
          ))}
        </div>
      )}

      <div className="gs-main">
        <div className="gs-stage">
          <VideoTrack trackRef={mainTrack} />

          {pipTrack && (
            <div className="gs-pip-camera">
              <VideoTrack trackRef={pipTrack} />
            </div>
          )}

          <button
            className="gs-video-fs-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <MdFullscreenExit size={22} /> : <MdFullscreen size={22} />}
          </button>
        </div>

        <GroupSessionControlBar
          onLeave={onLeave}
          role={role}
          activePanel={activePanel}
          onTogglePanel={togglePanel}
          session={session}
          isHost={isHost}
          onHostEndSession={onEndSession}
        />
      </div>

      {activePanel && (
        <div className="gs-right-sidebar">
          {activePanel === "chat" && (
            <GroupSessionChatPanel
              messages={chatMessages}
              onSendMessage={sendMessage}
            />
          )}

          {activePanel === "people" && (
            <div className="gs-ppl-panel">
              <div className="gs-ppl-tabs">
                <button
                  type="button"
                  className={`gs-ppl-tab ${peopleTab === "participants" ? "gs-ppl-tab--active" : ""}`}
                  onClick={() => setPeopleTab("participants")}
                >
                  Participants ({peopleList.length})
                </button>

                <button
                  type="button"
                  className={`gs-ppl-tab ${peopleTab === "requests" ? "gs-ppl-tab--active" : ""}`}
                  onClick={() => setPeopleTab("requests")}
                >
                  Join Requests ({joinRequests.length})
                </button>
              </div>

              {peopleTab === "participants" && (
                <div className="gs-ppl-list">
                  {peopleList.length === 0 ? (
                    <p className="gs-ppl-empty">No participants yet.</p>
                  ) : (
                    peopleList.map((p, i) => (
                      <div
                        key={p.identity || i}
                        className={"gs-ppl-card" + (p.isHost ? " gs-ppl-card--host" : "")}
                      >
                        <div className="gs-ppl-avatar">
                          {p.avatarUrl
                            ? <img src={p.avatarUrl} alt={p.name} />
                            : p.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>

                        <div className="gs-ppl-info">
                          <div className="gs-ppl-name">{p.isMe ? "You" : p.name}</div>
                          <div className="gs-ppl-role">{p.role}</div>
                        </div>

                        <div className="gs-ppl-actions">
                          <div className={`gs-ppl-mic ${p.micOn ? "gs-ppl-mic--on" : "gs-ppl-mic--off"}`}>
                            {p.micOn ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/></svg>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {peopleTab === "requests" && (
                <div className="gs-ppl-list">
                  <p className="gs-ppl-empty">No join requests yet.</p>
                </div>
              )}
            </div>
          )}

          {activePanel === "info" && (
            <div className="gs-info-panel">
              <div className="gs-info-header">
                <h3>Session Information</h3>
              </div>

              <div className="gs-info-body">
                <div className="gs-info-field"><span className="gs-info-label">Session ID:</span><span className="gs-info-value">{session?.shortCode || session?.id || "—"}</span></div>
                <div className="gs-info-field"><span className="gs-info-label">Session Type:</span><span className="gs-info-value">{session?.sessionType === "instant" ? "Instant Group" : "Study Group"}</span></div>
                <div className="gs-info-field"><span className="gs-info-label">Host:</span><span className="gs-info-value">{session?.hostName || localName || "—"}</span></div>

                <div className="gs-info-gap" />

                <div className="gs-info-field"><span className="gs-info-label">Subject:</span><span className="gs-info-value">{session?.subject || session?.subjectName || "—"}</span></div>
                <div className="gs-info-field"><span className="gs-info-label">Topic:</span><span className="gs-info-value">{session?.topic || "(Entered by Host)"}</span></div>

                <div className="gs-info-gap" />

                <div className="gs-info-field"><span className="gs-info-label">Date:</span><span className="gs-info-value">{formatDate(session?.date)}</span></div>
                <div className="gs-info-field"><span className="gs-info-label">Session Timing:</span><span className="gs-info-value">{formatTiming(session)}</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
