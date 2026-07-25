import { useRoomContext } from "@livekit/components-react";
import { useState, useEffect } from "react";

// Rendered as a normal control-bar button (matches the mic/camera/screen
// buttons' icon+label shape) rather than a floating overlay — spec section
// 10 puts raise-hand in the persistent bottom bar alongside the other
// controls, not as a panel-only extra.
export default function RaiseHandButton() {
  const room = useRoomContext();
  const [raised, setRaised] = useState(false);

  // Teacher can force lower hand
  useEffect(() => {
    const handleData = (payload) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));
        if (msg.type === "lower-hand") setRaised(false);
      } catch {}
    };
    room.on("dataReceived", handleData);
    return () => room.off("dataReceived", handleData);
  }, [room]);

  const toggleHand = async () => {
    const type = raised ? "lower-hand" : "raise-hand";
    try {
      const encoder = new TextEncoder();
      await room.localParticipant.publishData(
        encoder.encode(JSON.stringify({ type })),
        { reliable: true }
      );
      setRaised(!raised);
      // Dispatch custom event so ClassroomUI updates raisedHands for local participant
      window.dispatchEvent(new CustomEvent("raise-hand-local", {
        detail: { type, identity: room.localParticipant.identity }
      }));
    } catch (e) {
      console.error("raise-hand failed", e);
    }
  };

  return (
    <button
      className="cb-btn"
      onClick={toggleHand}
      title={raised ? "Lower hand" : "Raise hand"}
    >
      <div className={`cb-icon ${raised ? "cb-icon--active" : ""}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 12V4.5a1.5 1.5 0 0 1 3 0V11" />
          <path d="M11 11V2.5a1.5 1.5 0 0 1 3 0V11" />
          <path d="M14 11.5V4.5a1.5 1.5 0 0 1 3 0V15" />
          <path d="M17 8.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2a7 7 0 0 1-6.29-3.94l-2.4-4.79a1.5 1.5 0 0 1 2.63-1.45L8 12" />
        </svg>
      </div>
      <span className="cb-label">{raised ? "Lower" : "Raise"}</span>
    </button>
  );
}
