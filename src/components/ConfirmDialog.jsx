/**
 * FILE: STUDENT_DASHBOARD/src/components/ConfirmDialog.jsx
 *
 * A small, centered confirmation modal used across the Group Sessions flow
 * (and anywhere else that needs a confirm step) so we never have to fall
 * back to the browser's native `window.confirm()` dialog, which renders
 * at the top of the page and looks unpolished.
 *
 * Usage:
 *   const [dlg, setDlg] = useState(null);
 *   setDlg({
 *     title: "Cancel group session?",
 *     message: "Invitees will be notified. This cannot be undone.",
 *     confirmLabel: "Yes, cancel",
 *     danger: true,
 *     onConfirm: () => { ... },
 *   });
 *   // render <ConfirmDialog dialog={dlg} onClose={() => setDlg(null)} />
 *
 * The dialog stays visually consistent with the sg__* Group Session theme
 * but uses its own `cd__*` classes so it can be dropped in anywhere
 * without interfering with existing page styles.
 */

import { useEffect } from "react";
import "../styles/confirmDialog.css";

export default function ConfirmDialog({ dialog, onClose }) {
  // Close on Escape
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog, onClose]);

  if (!dialog) return null;

  const {
    title = "Are you sure?",
    message = "",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger = false,
    busy = false,
    tone,   // e.g. "skill" — retints --cd-primary/--cd-danger via CSS, see confirmDialog.css
    onConfirm,
  } = dialog;

  const handleConfirm = () => {
    if (busy) return;
    onConfirm?.();
  };

  return (
    <div
      className={`cd__overlay${tone ? ` cd__overlay--${tone}` : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cd__title"
      onClick={onClose}
    >
      <div className="cd__dialog" onClick={(e) => e.stopPropagation()}>
        <h4 id="cd__title" className="cd__title">{title}</h4>
        {message && <p className="cd__message">{message}</p>}
        <div className="cd__actions">
          <button
            type="button"
            className="cd__btn cd__btn--ghost"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`cd__btn ${danger ? "cd__btn--danger" : "cd__btn--primary"}`}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
