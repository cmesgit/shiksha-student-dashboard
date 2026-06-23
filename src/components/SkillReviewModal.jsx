/**
 * SkillReviewModal.jsx — optional post-session review prompt.
 * Shown in the student skill dashboard after a session is completed.
 * Fetches sessions needing a review from /skill/my-reviewable-sessions/
 */
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

function Stars({ value, onChange }) {
  return (
    <div style={{display:"flex",gap:4}}>
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          style={{background:"none",border:"none",cursor:"pointer",fontSize:28,color:n<=value?"#ff8f01":"#d1d5db",padding:2}}
          onClick={() => onChange(n)}>★</button>
      ))}
    </div>
  );
}

export default function SkillReviewModal() {
  const { api } = useAuth();
  const [sessions, setSessions]   = useState([]);
  const [current, setCurrent]     = useState(0);
  const [rating, setRating]       = useState(0);
  const [body, setBody]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]           = useState([]);

  useEffect(() => {
    api.get("/skill/my-reviewable-sessions/")
      .then(r => { const d = r.data||[]; setSessions(d); })
      .catch(() => {});
  }, []);

  const pending = sessions.filter(s => !done.includes(s.session_id));
  if (pending.length === 0) return null;
  const sess = pending[current % pending.length];

  const skip = () => { setDone(d => [...d, sess.session_id]); setRating(0); setBody(""); };

  const submit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await api.post(`/skill/sessions/${sess.session_id}/review/`, { rating, body });
      setDone(d => [...d, sess.session_id]); setRating(0); setBody("");
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:"22px 20px",marginBottom:20,boxShadow:"0 4px 16px rgba(10,125,140,.08)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <span style={{fontSize:24}}>⭐</span>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:"#111827"}}>How was your session with {sess.expert_name}?</div>
          <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Your review helps other students — it's completely optional.</div>
        </div>
      </div>
      <Stars value={rating} onChange={setRating} />
      {rating > 0 && (
        <textarea value={body} onChange={e=>setBody(e.target.value)} rows={2}
          placeholder="Share what you learnt or how the session felt…"
          style={{width:"100%",boxSizing:"border-box",marginTop:10,border:"1.5px solid #d1d5db",borderRadius:10,padding:"8px 12px",fontSize:13.5,fontFamily:"inherit",outline:"none",resize:"vertical"}} />
      )}
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <button onClick={submit} disabled={rating===0||submitting}
          style={{background:"#0a7d8c",color:"#fff",border:"none",borderRadius:10,padding:"9px 18px",fontSize:13.5,fontWeight:700,cursor:"pointer"}}>
          {submitting?"Submitting…":"Submit review"}
        </button>
        <button onClick={skip}
          style={{background:"none",border:"none",color:"#9ca3af",fontSize:13,cursor:"pointer",padding:"9px 8px"}}>
          Skip
        </button>
      </div>
    </div>
  );
}
