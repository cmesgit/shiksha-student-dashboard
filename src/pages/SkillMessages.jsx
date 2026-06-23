// PLACEMENT: src student/pages/SkillMessages.jsx
// ACTION:    Replace the entire file.
//
// What changed:
//   The old file was a custom polling-REST inbox (GET /skill/conversations/ every 15s,
//   no WebSocket). This replaces it with the shared ChatPanel already used by Chat.jsx —
//   same live WebSocket inbox (shared/chatClient.js → ws/chat/<id>/) but scoped to the
//   Skill Dev section and navigable from Message buttons on sessions.
//
// Route (already exists, no App.jsx change needed IF /skill-messages is already registered.
// If not — add this inside the RequireProfile / StudentLayout <Route> block in App.jsx,
// after line 144 (the last skill-dev/* route):
//
//   import SkillMessages from "./pages/SkillMessages";
//   <Route path="skill-messages" element={<SkillMessages />} />
//
// Then add a nav entry in Sidebar.jsx SD_NAV array (after the "explore" entry):
//
//   import { FiMessageCircle } from "react-icons/fi";
//   { id: "messages", label: "Messages", Icon: FiMessageCircle, to: "/skill-messages" },

import { useLocation } from "react-router-dom";
import ChatPanel from "../shared/ChatPanel";
import "../shared/ChatPanel.css";

export default function SkillMessages() {
  const { state } = useLocation();

  // When a Message button on a session is clicked, SkillRoutes.openMsg()
  // navigates here with state: { teacherId, expertName }.
  // ChatPanel.directTo tells it to immediately open/start that DM.
  // teacherId = TeacherProfile UUID — what StartDirectView (kind=TEACHER) expects.
  const directTo = state?.teacherId
    ? { kind: "TEACHER", id: state.teacherId }
    : undefined;

  return (
    <div style={{ padding: "20px", height: "calc(100vh - 80px)", boxSizing: "border-box" }}>
      <ChatPanel directTo={directTo} />
    </div>
  );
}
