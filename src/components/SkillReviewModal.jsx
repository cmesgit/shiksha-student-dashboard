/**
 * SkillReviewModal.jsx — optional post-session review prompt.
 * Shown in the student skill dashboard after a session is completed.
 * Fetches sessions needing a review from /skill/my-reviewable-sessions/
 *
 * Anti-spam: the card is removed the moment a review is accepted, an
 * "already reviewed" rejection ALSO removes it (server enforces one review
 * per session), and any other failure is shown instead of being swallowed.
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

export default function SkillReviewModal({ onDone }) {
  const { api } = useAuth();
  const [sessions, setSessions]     = useState([]);
  const [current]                   = useState(0);
  const [rating, setRating]         = useState(0);
  const [body, setBody]             = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState([]);
  const [error, setError]           = useState("");

  useEffect(() => {
    api.get("/skill/my-reviewable-sessions/")
      .then(r => setSessions(r.data || []))
      .catch(() => {});
  }, [api]);

  const pending = sessions.filter(s => !done.includes(s.session_id));
  if (pending.length === 0) return null;
  const sess = pending[current % pending.length];

  const finish = (id) => {
    setDone(d => [...d, id]); setRating(0); setBody(""); setError("");
    if (onDone) onDone();
  };
  const skip = () => finish(sess.session_id);

  const submit = async () => {
    if (rating === 0 || submitting) return;
    setSubmitting(true); setError("");
    try {
      await api.post(`/skill/sessions/${sess.session_id}/review/`, { rating, body });
      finish(sess.session_id);
    } catch (e) {
      const msg = e?.response?.data;
      const flat = typeof msg === "string" ? msg : JSON.stringify(msg || "");
      if (flat.toLowerCase().includes("already reviewed")) {
        // Server has one — nothing more to do here.
        finish(sess.session_id);
      } else {
        setError("Couldn't submit your review. Please try again.");
      }
    } finally { setSubmitting(false); }
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
      {error && <div style={{marginTop:10,fontSize:12.5,color:"#c0492f",fontWeight:600}}>{error}</div>}
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <button onClick={submit} disabled={rating===0||submitting}
          style={{background:"#0a7d8c",color:"#fff",border:"none",borderRadius:10,padding:"9px 18px",fontSize:13.5,fontWeight:700,cursor:rating===0||submitting?"default":"pointer",opacity:rating===0||submitting?0.6:1}}>
          {submitting?"Submitting…":"Submit review"}
        </button>
        <button onClick={skip} disabled={submitting}
          style={{background:"none",border:"none",color:"#9ca3af",fontSize:13,cursor:"pointer",padding:"9px 8px"}}>
          Skip
        </button>
      </div>
    </div>
  );
}
