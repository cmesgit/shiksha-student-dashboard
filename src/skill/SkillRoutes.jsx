// PLACEMENT: src student/skill/SkillRoutes.jsx
// ACTION:    Replace the entire file.
//
// Changes from original:
//   - openMsg now takes (teacherId, expertName) and navigates to
//     /skill-messages with that state — opens the WS chat DM directly.
//     Previously it just navigated to /chat with no state (blank inbox).

import { useNavigate } from "react-router-dom";
import SkillCourses from "./SkillCourses";
import SkillSessions from "./SkillSessions";
import SkillBookTutor from "./SkillBookTutor";
import SkillExplore from "./SkillExplore";
import "./skillDash.css";

function useSkillNav() {
  const navigate = useNavigate();

  const setTab = (tab) => navigate(tab === "dashboard" ? "/" : `/skill-dev/${tab}`);

  // openMsg(teacherId, expertName)
  // teacherId = TeacherProfile UUID (from expert_teacher_id in session objects)
  // Navigates to SkillMessages which passes directTo={{ kind:"TEACHER", id:teacherId }}
  // into the shared ChatPanel — opens that DM immediately.
  const openMsg = (teacherId, expertName) => {
    navigate("/skill-messages", {
      state: teacherId ? { teacherId, expertName } : undefined,
    });
  };

  return { setTab, openMsg };
}

export function SkillCoursesPage()  { return <SkillCourses />; }
export function SkillSessionsPage() { const n = useSkillNav(); return <SkillSessions setTab={n.setTab} openMsg={n.openMsg} />; }
export function SkillBookPage()     { const n = useSkillNav(); return <SkillBookTutor openMsg={n.openMsg} />; }
export function SkillExplorePage()  { const n = useSkillNav(); return <SkillExplore setTab={n.setTab} />; }
