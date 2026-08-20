/**
 * student_dashboard/src/pages/Chat.jsx
 *
 * Student chat inbox. Identity = the active learner profile (resolved server-side
 * from the JWT's active_profile claim). Each child profile has its own inbox.
 *
 * Navigation:
 *   navigate("/chat")                                          → inbox
 *   navigate("/chat", { state: { teacherId } })               → open/start DM with a teacher
 *   navigate("/chat", { state: { courseId, courseTitle } })   → open the course room
 *   navigate("/chat", { state: { conversationId } })          → open a specific conversation (notification deep link)
 */
import { useLocation, useSearchParams } from "react-router-dom";
import ChatPanel from "../shared/ChatPanel";
import "../shared/ChatPanel.css";

// A cross-APP hop (from the public site) can only carry a URL, not router
// state — so a chat deep link from there used to land on the inbox with no
// conversation selected. Accept ?conversation=<id> as an equivalent to
// state.conversationId; in-app navigation keeps using state, which survives
// a shared link being pasted around less readily.
export default function Chat() {
  const { state } = useLocation();
  const [searchParams] = useSearchParams();

  const directTo = state?.teacherId
    ? { kind: "TEACHER", id: state.teacherId }
    : undefined;

  const courseRoom = state?.courseId
    ? { id: state.courseId, title: state.courseTitle || "" }
    : undefined;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      <ChatPanel directTo={directTo} courseRoom={courseRoom} conversationId={state?.conversationId || searchParams.get("conversation")} theme="academy" />
    </div>
  );
}
