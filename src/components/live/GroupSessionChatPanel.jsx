import { useEffect, useRef, useState } from "react";
import { IoSend } from "react-icons/io5";

/**
 * GroupSessionChatPanel.jsx
 *
 * Group-session-only chat panel.
 * Uses gs-* classes from groupSessionLive.css so shared ChatPanel.css is untouched.
 */
export default function GroupSessionChatPanel({
  messages = [],
  onSendMessage,
}) {
  const [input, setInput] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const text = input.trim();
    setInput("");

    if (onSendMessage) {
      try {
        await onSendMessage(text);
      } catch (e) {
        console.error("send failed", e);
      }
    }
  };

  const fmt = (ts) =>
    ts
      ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

  return (
    <div className="gs-chat">
      <div className="gs-chat-header">Chat</div>

      <div className="gs-chat-body">
        <div className="gs-chat-messages" ref={containerRef}>
          {messages.length === 0 && (
            <p className="gs-chat-empty">No messages yet. Say hello!</p>
          )}

          {messages.map((msg, i) => {
            const isMe = !!msg.isMe;

            return (
              <div
                key={msg.id || i}
                className={`gs-chat-row ${isMe ? "gs-chat-row--me" : "gs-chat-row--other"}`}
              >
                <div className={`gs-chat-meta ${isMe ? "gs-chat-meta--me" : "gs-chat-meta--other"}`}>
                  {isMe ? (
                    <>
                      <span className="gs-chat-time">{fmt(msg.time)}</span>
                      <span className="gs-chat-name">You</span>
                    </>
                  ) : (
                    <>
                      <span className="gs-chat-name">{msg.sender}</span>
                      <span className="gs-chat-time">{fmt(msg.time)}</span>
                    </>
                  )}
                </div>

                <div className={`gs-chat-bubble ${isMe ? "gs-chat-bubble--me" : "gs-chat-bubble--other"}`}>
                  <span>{msg.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="gs-chat-input-area">
        <input
          className="gs-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Your message here"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button className="gs-chat-send-btn" onClick={sendMessage} aria-label="Send">
          <IoSend size={22} />
        </button>
      </div>
    </div>
  );
}
