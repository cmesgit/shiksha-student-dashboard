import { useRoomContext } from "@livekit/components-react";
import { useState, useEffect } from "react";

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
      className={"raise-hand-btn" + (raised ? " raised" : "")}
      onClick={toggleHand}
      title={raised ? "Lower hand" : "Raise hand"}
    >
      {raised ? "👇 Lower Hand" : "✋ Raise Hand"}
    </button>
  );
}
