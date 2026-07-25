import { useTracks, VideoTrack, useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import LiveChatPanel from "./LiveChatPanel";
import NotesPanel from "./NotesPanel";
import ControlBar from "./ControlBar";
import React, { useState, useRef, useEffect } from "react";
import "../../styles/live.css";
import useLiveSessionChat from "../../hooks/useLiveSessionChat";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";

export default function ClassroomUI({
  role,
  sessionId: sessionIdProp,
  onLeave,
}) {
  const isPresenter = role === "PRESENTER";

  const [raisedHands, setRaisedHands] = useState({});
  const [sessionStatus, setSessionStatus] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const containerRef = useRef(null);
  const room = useRoomContext();

  const sessionId =
    sessionIdProp ||
    window.location.pathname.split("/").filter(Boolean).pop();

  const {
    messages: chatMessages,
    sendMessage,
    sessionStatus: hookStatus,
  } = useLiveSessionChat(sessionId);

  useEffect(() => {
    setSessionStatus(hookStatus);
  }, [hookStatus]);

  /* ───── PANEL TOGGLE ───── */
  const togglePanel = (panel) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  /* ───── FULLSCREEN ───── */
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
    } catch (e) {
      console.error("Fullscreen failed:", e);
    }
  };

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    document.addEventListener("webkitfullscreenchange", onFSChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFSChange);
      document.removeEventListener("webkitfullscreenchange", onFSChange);
    };
  }, []);

  /* ───── RE-RENDER ON TRACK CHANGES ───── */
  useEffect(() => {
    if (!room) return;
    const events = [
      "trackMuted", "trackUnmuted", "trackPublished", "trackUnpublished",
      "trackSubscribed", "trackUnsubscribed", "participantConnected",
      "participantDisconnected", "localTrackPublished", "localTrackUnpublished",
    ];
    events.forEach((evt) => room.on(evt, bump));
    return () => { events.forEach((evt) => room.off(evt, bump)); };
  }, [room]);

  /* ───── LOCAL RAISE HAND ───── */
  useEffect(() => {
    const handleLocal = (e) => {
      const { type, identity } = e.detail;
      if (type === "raise-hand") setRaisedHands((prev) => ({ ...prev, [identity]: true }));
      if (type === "lower-hand") setRaisedHands((prev) => { const u = { ...prev }; delete u[identity]; return u; });
    };
    window.addEventListener("raise-hand-local", handleLocal);
    return () => window.removeEventListener("raise-hand-local", handleLocal);
  }, []);

  /* ───── REMOTE RAISE HAND ───── */
  useEffect(() => {
    const handleData = (payload, participant) => {
      try {
        const text = new TextDecoder().decode(payload);
        const msg = JSON.parse(text);
        if (msg.type === "raise-hand") {
          setRaisedHands((prev) => ({ ...prev, [participant.identity]: true }));
        }
        if (msg.type === "lower-hand") {
          setRaisedHands((prev) => {
            const updated = { ...prev };
            delete updated[participant.identity];
            return updated;
          });
        }
      } catch {}
    };
    room.on("dataReceived", handleData);
    return () => room.off("dataReceived", handleData);
  }, [room]);

  /* ───── TRACKS ───── */
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const screenTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const cameraTrack = tracks.find((t) => t.source === Track.Source.Camera);
  const mainTrack = screenTrack || cameraTrack;
  const pipTrack = screenTrack ? cameraTrack : null;

  /* ───── PAUSED ───── */
  if (!isPresenter && sessionStatus === "PAUSED") {
    return (
      <div className="ls-paused">
        <div className="ls-paused__icon">&#9208;</div>
        <h2>Session paused by teacher</h2>
        <p>Please wait, the session will resume shortly</p>
      </div>
    );
  }

  /* ───── WAITING ───── */
  if (!mainTrack) {
    return (
      <div className="waiting-screen">
        <div className="waiting-card">
          <div className="waiting-pulse" />
          <h2>
            {isPresenter
              ? "Enable your camera to start the session"
              : "Waiting for teacher to start..."}
          </h2>
          {!isPresenter && (
            <p>You will be connected as soon as the session begins</p>
          )}
        </div>
      </div>
    );
  }

  /* ───── PARTICIPANTS LIST ───── */
  const remoteParticipants = room.remoteParticipants
    ? Array.from(room.remoteParticipants.values()).map((p) => ({
        identity: p.identity,
        name: p.name || p.identity,
        role: "Teacher",
        micOn: p.isMicrophoneEnabled,
        camOn: p.isCameraEnabled,
        handRaised: !!raisedHands[p.identity],
        isTeacher: true,
        isMe: false,
      }))
    : [];

  const localId = room.localParticipant?.identity;
  const localName = room.localParticipant?.name || localId || "You";

  const peopleList = [
    ...remoteParticipants,
    {
      identity: localId,
      name: "You",
      role: "Student",
      micOn: room.localParticipant?.isMicrophoneEnabled,
      camOn: room.localParticipant?.isCameraEnabled,
      handRaised: false,
      isTeacher: false,
      isMe: true,
    },
  ];

  /* ───── MAIN UI ───── */
  return (
    <div
      className={
        "classroom-layout" +
        (isFullscreen ? " fs-mode" : "") +
        (!activePanel ? " panel-closed" : "")
      }
      ref={containerRef}
    >
      {/* LEFT COLUMN */}
      <div className="classroom-main">
        <div className="main-stage">
          <VideoTrack trackRef={mainTrack} />
          {pipTrack && (
            <div className="pip-camera">
              <VideoTrack trackRef={pipTrack} />
            </div>
          )}
          <button
            className="video-fs-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <MdFullscreenExit size={22} /> : <MdFullscreen size={22} />}
          </button>
        </div>

        <ControlBar
          onLeave={onLeave}
          role={role}
          activePanel={activePanel}
          onTogglePanel={togglePanel}
        />
      </div>

      {activePanel && (
        <div className="right-sidebar">

          {/* CHAT */}
          {activePanel === "chat" && (
            <LiveChatPanel
              role={role}
              messages={chatMessages}
              onSendMessage={sendMessage}
              participants={peopleList}
            />
          )}

          {/* NOTES */}
          {activePanel === "notes" && <NotesPanel sessionId={sessionId} />}

          {/* PEOPLE */}
          {activePanel === "people" && (
            <div className="ppl-panel">
              <div className="ppl-header">
                Participants ({peopleList.length})
              </div>
              <div className="ppl-list">
                {peopleList.length === 0 ? (
                  <p className="ppl-empty">No participants yet.</p>
                ) : (
                  peopleList.map((p, i) => (
                    <div
                      key={p.identity || i}
                      className={"ppl-card" + (p.isTeacher ? " ppl-card--teacher" : "")}
                    >
                      <div className="ppl-avatar">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.name} />
                        ) : (
                          p.name?.charAt(0)?.toUpperCase() || "?"
                        )}
                      </div>
                      <div className="ppl-info">
                        <div className="ppl-name">{p.isMe ? "You" : p.name}</div>
                        <div className="ppl-role">{p.role}</div>
                      </div>
                      <div className="ppl-actions">
                        {/* Mic indicator only — no controls for student */}
                        <div className={`ppl-mic ${p.micOn ? "ppl-mic--on" : "ppl-mic--off"}`}>
                          {p.micOn ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                              <line x1="12" y1="19" x2="12" y2="23"/>
                              <line x1="8" y1="23" x2="16" y2="23"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="1" y1="1" x2="23" y2="23"/>
                              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
                              <line x1="12" y1="19" x2="12" y2="23"/>
                              <line x1="8" y1="23" x2="16" y2="23"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* INFO */}
          {activePanel === "info" && (
            <div className="side-panel">
              <div className="side-panel__header">
                <h3>Session Info</h3>
                <button
                  className="side-panel__close"
                  onClick={() => setActivePanel(null)}
                  aria-label="Close"
                >✕</button>
              </div>
              <div className="side-panel__body">
                <div className="side-panel__field">
                  <div className="side-panel__field-label">Session ID</div>
                  <div className="side-panel__field-value">{sessionId}</div>
                </div>
                <div className="side-panel__field">
                  <div className="side-panel__field-label">Your role</div>
                  <div className="side-panel__field-value">Student</div>
                </div>
                <div className="side-panel__field">
                  <div className="side-panel__field-label">Participants</div>
                  <div className="side-panel__field-value">{peopleList.length}</div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
