// PLACEMENT: student_dashboard/src/skill/SkillRoutes.jsx  (replace whole file)
// DEPLOY:    /app/student_dashboard/src/skill/SkillRoutes.jsx
//
// WHAT CHANGED: SkillExplorePage now also receives openMsg, so the new
// "Message" button on each expert card can open a DM with that expert
// (before booking). Everything else is unchanged.

import { useNavigate } from "react-router-dom";
import SkillCourses from "./SkillCourses";
import SkillSessions from "./SkillSessions";
import SkillBookTutor from "./SkillBookTutor";
import SkillExplore from "./SkillExplore";
import "./skillDash.css";

function useSkillNav() {
  const navigate = useNavigate();

  // setTab(tab, state?) — optional state is forwarded as react-router nav state
  // so e.g. Explore can tell the Book tab WHICH expert was selected.
  const setTab = (tab, state) =>
    navigate(tab === "dashboard" ? "/" : `/skill-dev/${tab}`, state ? { state } : undefined);

  // openMsg(teacherId, expertName)
  // teacherId = TeacherProfile UUID (expert_teacher_id / teacher_profile_id).
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
export function SkillExplorePage()  { const n = useSkillNav(); return <SkillExplore setTab={n.setTab} openMsg={n.openMsg} />; }
