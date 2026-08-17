import { useTracks, VideoTrack, useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import LiveChatPanel from "./LiveChatPanel";
import NotesPanel from "./NotesPanel";
import FilesPanel from "./FilesPanel";
import Whiteboard from "./Whiteboard";
import ControlBar from "./ControlBar";
import React, { useState, useRef, useEffect } from "react";
import "../../styles/live.css";
import useLiveSessionChat from "../../hooks/useLiveSessionChat";
import { useAuth } from "../../contexts/AuthContext";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";

export default function PrivateClassroomUI({
  role = "STUDENT",
  sessionId: sessionIdProp,
  onLeave,
  unrestricted = false,   // 1-on-1 skill call → both sides publish freely
}) {
  const [, setRaisedHands] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const containerRef = useRef(null);
  const room = useRoomContext();
  const { user } = useAuth();
  const myUserId = user?.id ? String(user.id) : null;

  const sessionId =
    sessionIdProp ||
    window.location.pathname.split("/").filter(Boolean).pop();

  const { messages: chatMessages, sendMessage } = useLiveSessionChat(sessionId);

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
    } catch (e) { console.error("Fullscreen failed:", e); }
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

  /* ───── REMOTE DATA ───── */
  useEffect(() => {
    const handleData = (payload, participant) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === "raise-hand") setRaisedHands((prev) => ({ ...prev, [participant.identity]: true }));
        if (msg.type === "lower-hand") setRaisedHands((prev) => { const u = { ...prev }; delete u[participant.identity]; return u; });
      } catch {}
    };
    room.on("dataReceived", handleData);
    return () => room.off("dataReceived", handleData);
  }, [room]);

  /* ───── TRACKS (proper 1-on-1: remote = main, local = self-view) ───── */
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const localId = room.localParticipant?.identity;
  const isLocal = (t) => t?.participant?.identity === localId;

  const screenTrack  = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const remoteCamera = tracks.find((t) => t.source === Track.Source.Camera && !isLocal(t));
  const localCamera  = tracks.find((t) => t.source === Track.Source.Camera && isLocal(t));

  // Main stage shows a screen share (from either side) if present, otherwise the
  // OTHER person's camera. Your own camera is always the small self-view.
  const mainTrack = screenTrack || remoteCamera;
  const selfTrack = localCamera;

  const hasRemote = !!(room.remoteParticipants && room.remoteParticipants.size > 0);

  /* ───── WAITING (only until the other person joins) ───── */
  if (!hasRemote) {
    return (
      <div className="waiting-screen">
        <div className="waiting-card">
          <div className="waiting-pulse" />
          <h2>Waiting for {role === "PRESENTER" ? "your student" : "your teacher"} to join…</h2>
          <p>The call will connect as soon as they arrive.</p>
        </div>
      </div>
    );
  }

  /* ───── PARTICIPANTS ───── */
  const remoteParticipants = room.remoteParticipants
    ? Array.from(room.remoteParticipants.values()).map((p) => ({
        identity: p.identity,
        name: p.name || p.identity,
        role: "Teacher",
        micOn: p.isMicrophoneEnabled,
        isTeacher: true,
        isMe: false,
      }))
    : [];

  const localName = room.localParticipant?.name || localId || "You";

  const peopleList = [
    ...remoteParticipants,
    {
      identity: localId,
      name: localName,
      role: "Student",
      micOn: room.localParticipant?.isMicrophoneEnabled,
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
      <div className="classroom-main">
        <div className="main-stage">
          {whiteboardOpen ? (
            <Whiteboard />
          ) : mainTrack ? (
            <VideoTrack trackRef={mainTrack} />
          ) : (
            <div className="camera-off-tile" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#cbd5e1", fontSize: 16 }}>
              {role === "PRESENTER" ? "Your student's" : "Your teacher's"} camera is off
            </div>
          )}

          {/* Self-view: your own camera, always small — unaffected by the
              whiteboard swap, same as it already is during screen-share. */}
          {selfTrack && (
            <div className="pip-camera">
              <VideoTrack trackRef={selfTrack} />
            </div>
          )}

          <button
            className="video-fs-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <MdFullscreenExit size={22} /> : <MdFullscreen size={22} />}
          </button>
        </div>

        <ControlBar
          onLeave={onLeave}
          role={role}
          unrestricted={unrestricted}
          activePanel={activePanel}
          onTogglePanel={togglePanel}
          whiteboardOpen={whiteboardOpen}
          onToggleWhiteboard={() => setWhiteboardOpen((v) => !v)}
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
            />
          )}

          {/* NOTES */}
          {activePanel === "notes" && <NotesPanel sessionId={sessionId} sessionType="private" />}

          {/* FILES */}
          {activePanel === "files" && (
            <FilesPanel sessionId={sessionId} sessionType="private" isHost={false} currentUserId={myUserId} />
          )}

          {/* PEOPLE */}
          {activePanel === "people" && (
            <div className="ppl-panel">
              <div className="ppl-header">
                Participants ({peopleList.length})
              </div>
              <div className="ppl-list">
                {peopleList.map((p, i) => (
                  <div
                    key={p.identity || i}
                    className={"ppl-card" + (p.isTeacher ? " ppl-card--teacher" : "")}
                  >
                    <div className="ppl-avatar">
                      {p.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="ppl-info">
                      <div className="ppl-name">{p.isMe ? "You" : p.name}</div>
                      <div className="ppl-role">{p.role}</div>
                    </div>
                    <div className="ppl-actions">
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
                ))}
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
