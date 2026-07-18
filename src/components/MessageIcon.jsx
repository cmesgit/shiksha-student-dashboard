// ============================================================
// STUDENT-DASHBOARD — src/components/MessageIcon.jsx
//
// Global Messages entry point. Lives in the Header (rendered by every
// layout) so it's present on EVERY page — not just the dashboard.
// The badge is the account-wide unread total from useMessageBadge
// (spans both tracks); the click target is track-aware and passed in by
// the Header (/chat for Academy, /skill-messages for Skill-Dev).
//
// Reuses the existing .notif-bell-* CSS from styles/header.css so the
// icon sits and badges identically to the NotificationBell beside it.
// ============================================================

import { useNavigate } from "react-router-dom";
import { FiMessageSquare } from "react-icons/fi";
import useMessageBadge from "../shared/useMessageBadge";

export default function MessageIcon({ to = "/chat" }) {
  const navigate = useNavigate();
  const { unreadCount } = useMessageBadge();

  return (
    <div className="notif-bell-wrap">
      <button
        className="notif-bell-btn"
        onClick={() => navigate(to)}
        aria-label={
          unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"
        }
        title="Messages"
        type="button"
      >
        <FiMessageSquare size={21} color={unreadCount > 0 ? "#2563eb" : undefined} />
        {unreadCount > 0 && (
          <span className="notif-bell-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
