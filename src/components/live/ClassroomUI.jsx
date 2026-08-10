import { useTracks, VideoTrack, useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import LiveChatPanel from "./LiveChatPanel";
import NotesPanel from "./NotesPanel";
import ControlBar from "./ControlBar";
import React, { useState, useRef, useEffect } from "react";
import "../../styles/live.css";
import useLiveSessionChat from "../../hooks/useLiveSessionChat";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";

// Small mic glyph reused inside the People tab (mirrors GroupSessionClassroomUI's).
function MicIcon({ on }) {
  return on ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export default function ClassroomUI({
  role,
  sessionId: sessionIdProp,
  onLeave,
}) {
  const isPresenter = role === "PRESENTER";

  const [raisedHands, setRaisedHands] = useState({});
  const [sessionStatus, setSessionStatus] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("chat");
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

  /* ───── SESSION DURATION (own timer — sits in the sidebar, not the bar) ─────
     The lazy useState initializer (not a bare useRef(Date.now())) is what
     the React Compiler's purity check wants: Date.now() only runs once,
     inside React's own controlled first-render bookkeeping. */
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const formatDuration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
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
      } catch {
        /* ignore malformed data-channel payloads */
      }
    };
    room.on("dataReceived", handleData);
    return () => room.off("dataReceived", handleData);
  }, [room]);

  /* ───── TRACKS ─────
     Main stage = the OTHER side's video (teacher's camera, or anyone's
     screen-share). The self camera is always its own PIP tile, per the
     redesign spec — it's no longer only shown while screen-sharing. */
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const localId = room.localParticipant?.identity;
  const isLocalTrack = (t) => t?.participant?.identity === localId;

  const screenTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const remoteCameraTrack = tracks.find((t) => t.source === Track.Source.Camera && !isLocalTrack(t));
  const localCameraTrack = tracks.find((t) => t.source === Track.Source.Camera && isLocalTrack(t));

  // Prefer a screen-share, then the remote camera; fall back to the local
  // camera (e.g. presenter alone in the room) so the stage is never blank
  // while a real track is publishing.
  const mainTrack = screenTrack || remoteCameraTrack || localCameraTrack;
  const selfTrack = mainTrack && mainTrack !== localCameraTrack ? localCameraTrack : null;

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

  const mainParticipant = mainTrack.participant;
  const mainIsLocal = isLocalTrack(mainTrack);
  const mainName = mainIsLocal ? "You" : (mainParticipant?.name || "Teacher");
  const selfInitial = (localName || "?").trim().charAt(0).toUpperCase() || "?";

  /* ───── MAIN UI ───── */
  return (
    <div
      className={"conf-overlay" + (isFullscreen ? " fs-mode" : "")}
      ref={containerRef}
    >
      <div className="conf-body">
        {/* VIDEO AREA */}
        <div className="conf-video-area">
          <div className="conf-main-tile">
            <VideoTrack trackRef={mainTrack} />
            <span className="conf-live-badge">LIVE</span>
            <span className="conf-name-badge">{mainName}</span>
          </div>

          {/* SELF TILE (PIP) — always present */}
          <div className="conf-self-tile">
            {selfTrack ? (
              <VideoTrack trackRef={selfTrack} />
            ) : (
              <div className="conf-self-off">
                <div className="conf-self-avatar">{selfInitial}</div>
                <span>Camera off</span>
              </div>
            )}
            <span className="conf-self-label">You</span>
          </div>

          <button
            className="video-fs-btn"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <MdFullscreenExit size={22} /> : <MdFullscreen size={22} />}
          </button>
        </div>

        {/* RIGHT SIDEBAR — always visible; Chat/Notes/People/Info tabs */}
        <div className="conf-sidebar">
          <div className="conf-info-block">
            <div className="conf-subject">Live Session</div>
            <div className="conf-topic">Class in progress</div>
            <div className="conf-timer-row">
              <span className="conf-timer-dot" />
              <span className="conf-timer-text">{formatDuration(elapsed)}</span>
            </div>
          </div>

          <div className="conf-tabs">
            <button
              type="button"
              className={`conf-tab ${sidebarTab === "chat" ? "conf-tab--active" : ""}`}
              onClick={() => setSidebarTab("chat")}
            >
              Chat
            </button>
            <button
              type="button"
              className={`conf-tab ${sidebarTab === "notes" ? "conf-tab--active" : ""}`}
              onClick={() => setSidebarTab("notes")}
            >
              Notes
            </button>
            <button
              type="button"
              className={`conf-tab ${sidebarTab === "people" ? "conf-tab--active" : ""}`}
              onClick={() => setSidebarTab("people")}
            >
              People
            </button>
            <button
              type="button"
              className={`conf-tab ${sidebarTab === "info" ? "conf-tab--active" : ""}`}
              onClick={() => setSidebarTab("info")}
            >
              Info
            </button>
          </div>

          <div className="conf-panel">
            {sidebarTab === "chat" && (
              <LiveChatPanel
                role={role}
                messages={chatMessages}
                onSendMessage={sendMessage}
                participants={peopleList}
              />
            )}

            {sidebarTab === "notes" && (
              <div className="conf-notes-wrap">
                <div className="conf-notes-hint">Notes are saved automatically.</div>
                <NotesPanel sessionId={sessionId} />
              </div>
            )}

            {sidebarTab === "people" && (
              <div className="conf-ppl-list">
                {peopleList.length === 0 ? (
                  <p className="conf-ppl-empty">No participants yet.</p>
                ) : (
                  peopleList.map((p, i) => (
                    <div key={p.identity || i} className="conf-ppl-card">
                      <div className="conf-ppl-avatar">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.name} />
                        ) : (
                          p.name?.charAt(0)?.toUpperCase() || "?"
                        )}
                      </div>
                      <div className="conf-ppl-info">
                        <div className="conf-ppl-name">{p.isMe ? "You" : p.name}</div>
                        <div className="conf-ppl-role">{p.role}</div>
                      </div>
                      <div className={`conf-ppl-mic ${p.micOn ? "" : "conf-ppl-mic--off"}`}>
                        <MicIcon on={!!p.micOn} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {sidebarTab === "info" && (
              <div className="conf-info-list">
                <div className="conf-info-field">
                  <div className="conf-info-label">Session ID</div>
                  <div className="conf-info-value">{sessionId}</div>
                </div>
                <div className="conf-info-field">
                  <div className="conf-info-label">Your role</div>
                  <div className="conf-info-value">Student</div>
                </div>
                <div className="conf-info-field">
                  <div className="conf-info-label">Participants</div>
                  <div className="conf-info-value">{peopleList.length}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ControlBar
        onLeave={onLeave}
        role={role}
        hideTimer
        hideRailToggle
      />
    </div>
  );
}
