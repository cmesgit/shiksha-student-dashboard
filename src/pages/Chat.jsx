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
import { useLocation } from "react-router-dom";
import ChatPanel from "../shared/ChatPanel";
import "../shared/ChatPanel.css";

export default function Chat() {
  const { state } = useLocation();

  const directTo = state?.teacherId
    ? { kind: "TEACHER", id: state.teacherId }
    : undefined;

  const courseRoom = state?.courseId
    ? { id: state.courseId, title: state.courseTitle || "" }
    : undefined;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      <ChatPanel directTo={directTo} courseRoom={courseRoom} conversationId={state?.conversationId} theme="academy" />
    </div>
  );
}
