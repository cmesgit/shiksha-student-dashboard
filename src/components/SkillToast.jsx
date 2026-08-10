// components/SkillToast.jsx
//
// Every mutation in the Skill Dev design toasts (bottom-centre, ~2s), but
// neither app has a shared toast anywhere — each screen hand-rolls its own
// state/timer/markup. Scoped to Skill Dev's layout, not an app-wide toast
// system: mount <SkillToast/> once at the Skill Dev layout root and call
// useSkillToast() from any descendant.
import { useCallback, useRef, useState } from "react";
import { SkillToastContext } from "./SkillToastContext.js";

export function SkillToastProvider({ children }) {
  const [msg, setMsg] = useState("");
  const timer = useRef(null);

  const showToast = useCallback((text, ms = 2000) => {
    clearTimeout(timer.current);
    setMsg(text);
    timer.current = setTimeout(() => setMsg(""), ms);
  }, []);

  return (
    <SkillToastContext.Provider value={showToast}>
      {children}
      {msg && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: "var(--ink)", color: "#fff", padding: "10px 18px",
          borderRadius: "var(--r-md)", fontSize: 12.5, fontWeight: 600,
          boxShadow: "var(--sh-dropdown)", zIndex: 1200, animation: "toastIn .25s ease both",
        }}>{msg}</div>
      )}
    </SkillToastContext.Provider>
  );
}
