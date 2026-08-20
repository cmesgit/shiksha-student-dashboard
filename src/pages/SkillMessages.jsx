// PLACEMENT: student_dashboard/src/pages/SkillMessages.jsx   (REPLACE WHOLE FILE)
// DEPLOY:    /app/student_dashboard/src/pages/SkillMessages.jsx
//
// What changed:
//   Now reads BOTH sources for "open this DM on arrival":
//     1. router state { teacherId, expertName }  — in-app navigation
//        (Message buttons on sessions / session detail).
//     2. URL query ?teacherProfileId=&expertName=&draft=  — cross-app handoff
//        from the public landing page (ExpertProfilePage MessageComposer does a
//        full-page redirect, which DROPS router state, so it must use the query
//        string). The `draft` is pre-filled into the composer; the learner taps
//        Send to deliver it over the live WS.
//
//   teacherId / teacherProfileId = TeacherProfile UUID — exactly what
//   StartDirectView (target_kind=TEACHER) expects.

// Checked against design_handoff_skilldev README "7. Messages" (300px/1fr
// grid, conversation list + thread). Per the Academy redesign's own Messages
// pass, "strip to the mockup" was tried and explicitly reversed when it lost
// real, working chat functionality — that lesson applies here too: this
// keeps the full ChatPanel (categories, attachments, read receipts, etc.)
// rather than rebuilding a minimal two-pane shell. The wrapper below now
// matches the flex pattern this app's own Chat.jsx and the teacher app's
// Chat.jsx/SkillInbox.jsx both already use (`flex:1; min-height:0`) —
// the previous `calc(100vh - 80px)` viewport hack was a stand-in chosen
// because this environment's screenshot tool couldn't verify a swap;
// verified via computed-style checks instead of a screenshot this time.

import { useLocation, useSearchParams } from "react-router-dom";
import ChatPanel from "../shared/ChatPanel";
import "../shared/ChatPanel.css";

export default function SkillMessages() {
  const { state } = useLocation();
  const [sp] = useSearchParams();

  // In-app navigation wins; otherwise fall back to the landing-page query.
  const teacherId =
    state?.teacherId || sp.get("teacherProfileId") || undefined;
  const draft = sp.get("draft") || "";

  const directTo = teacherId ? { kind: "TEACHER", id: teacherId } : undefined;

  // This screen never forwarded conversationId, so it could open the inbox
  // but never a SPECIFIC thread — which is why chat notifications used to be
  // routed to the Academy inbox regardless of track. Now that they land here
  // when the learner is in Skill Dev, this has to honour it, or clicking a
  // message notification would drop them on an unselected list.
  // ?conversation= covers the cross-app hop, which can carry a URL but not
  // router state.
  const conversationId = state?.conversationId || sp.get("conversation") || undefined;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      <ChatPanel
        directTo={directTo}
        conversationId={conversationId}
        initialDraft={draft}
        theme="skill"
      />
    </div>
  );
}
