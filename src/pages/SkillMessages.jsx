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
// rather than rebuilding a minimal two-pane shell. The existing
// `calc(100vh - 80px)` height already accounts for this app's real header
// chrome; the design's own "150px" figure is a different app's chrome and
// isn't a safe swap without visual verification this environment can't do
// reliably (computer{screenshot} times out here) — left as-is.

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

  return (
    <div style={{ padding: "20px", height: "calc(100vh - 80px)", boxSizing: "border-box" }}>
      <ChatPanel directTo={directTo} initialDraft={draft} theme="skill" />
    </div>
  );
}
