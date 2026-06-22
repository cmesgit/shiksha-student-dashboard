/**
 * SkillMessages.jsx — learner's message inbox for skill experts.
 * Shows all conversations, lets the learner read + reply.
 * Polling every 15s for new messages (WebSocket can replace later).
 */
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import "../styles/skillMessages.css";

const timeAgo = (d) => {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
};

function ConvItem({ conv, active, onClick }) {
  return (
    <div className={`skm-conv ${active?"skm-conv--active":""} ${conv.unread?"skm-conv--unread":""}`}
      onClick={onClick} role="button" tabIndex={0}>
      <div className="skm-conv__av">{(conv.expert.name||"E")[0]}</div>
      <div className="skm-conv__body">
        <div className="skm-conv__name">{conv.expert.name}</div>
        <div className="skm-conv__preview">{conv.last_message?.body || "Start the conversation"}</div>
      </div>
      <div className="skm-conv__meta">
        <div className="skm-conv__time">{timeAgo(conv.updated_at)}</div>
        {conv.unread > 0 && <span className="skm-unread-dot">{conv.unread}</span>}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  return (
    <div className={`skm-bubble ${msg.from_me?"skm-bubble--me":"skm-bubble--them"}`}>
      <div className="skm-bubble__body">{msg.body}</div>
      <div className="skm-bubble__time">{timeAgo(msg.created_at)}</div>
    </div>
  );
}

function Thread({ convId, expertName, api }) {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const endRef = useRef(null);

  const load = async () => {
    try {
      const r = await api.get(`/skill/conversations/${convId}/`);
      setMessages(r.data.messages || []);
    } catch {}
  };

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [convId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages.length]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await api.post(`/skill/conversations/${convId}/messages/`, { body: text.trim() });
      setMessages(m => [...m, r.data]); setText("");
    } catch {} finally { setSending(false); }
  };

  return (
    <div className="skm-thread">
      <div className="skm-thread__head">
        <div className="skm-thread__av">{(expertName||"E")[0]}</div>
        <div className="skm-thread__name">{expertName}</div>
      </div>
      <div className="skm-thread__msgs">
        {messages.length===0 && <div className="skm-thread__empty">No messages yet. Say hello!</div>}
        {messages.map(m => <MessageBubble key={m.id} msg={m}/>)}
        <div ref={endRef}/>
      </div>
      <div className="skm-thread__compose">
        <input className="skm-compose-input" value={text} onChange={e=>setText(e.target.value)}
          placeholder="Write a message…"
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); }}}/>
        <button className="skm-compose-btn" onClick={send} disabled={sending||!text.trim()}>
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

export default function SkillMessages() {
  const { api } = useAuth();
  const [convs, setConvs]       = useState([]);
  const [active, setActive]     = useState(null);
  const [loading, setLoading]   = useState(true);

  const load = async () => {
    try {
      const r = await api.get("/skill/conversations/");
      setConvs(r.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="skm-page">
      <div className="skm-sidebar">
        <div className="skm-sidebar__head">Messages</div>
        {loading && <div className="skm-sidebar__empty">Loading…</div>}
        {!loading && convs.length===0 && (
          <div className="skm-sidebar__empty">No conversations yet.<br/>Message a teacher from their profile.</div>
        )}
        {convs.map(c => (
          <ConvItem key={c.id} conv={c} active={active?.id===c.id} onClick={() => setActive(c)}/>
        ))}
      </div>
      <div className="skm-main">
        {active
          ? <Thread convId={active.id} expertName={active.expert.name} api={api}/>
          : <div className="skm-main__placeholder">
              <div style={{fontSize:48}}>💬</div>
              <p>Select a conversation to read and reply</p>
            </div>}
      </div>
    </div>
  );
}
