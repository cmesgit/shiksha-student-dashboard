// PLACEMENT: student_dashboard/src/skill/SkillRoutes.jsx  (replace whole file)
//
// Skill Dev is 1-on-1 only. Nav (design_handoff_skilldev): Dashboard, Explore
// experts, My courses, My sessions, Messages, Reviews. Booking/profile pages
// are reached contextually (Explore/Profile/Dashboard "Book"/"View profile"),
// not from the sidebar — `bookFrom` in router state drives their back-link.

import { useNavigate } from "react-router-dom";
import SkillSessions from "./SkillSessions";
import SkillBookTutor from "./SkillBookTutor";
import SkillExplore from "./SkillExplore";
import SkillExpertProfile from "./SkillExpertProfile";
import SkillMyCourses from "./SkillMyCourses";
import SkillReviews from "./SkillReviews";
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

export function SkillSessionsPage() { const n = useSkillNav(); return <SkillSessions setTab={n.setTab} openMsg={n.openMsg} />; }
export function SkillBookPage()     { return <SkillBookTutor />; }
export function SkillExplorePage()  { const n = useSkillNav(); return <SkillExplore setTab={n.setTab} />; }
export function SkillProfilePage()  { return <SkillExpertProfile />; }
export function SkillCoursesPage()  { return <SkillMyCourses />; }
export function SkillReviewsPage()  { return <SkillReviews />; }
