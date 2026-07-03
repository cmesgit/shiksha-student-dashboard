// PLACEMENT: student_dashboard/src/skill/SkillRoutes.jsx  (replace whole file)
//
// Skill Dev is 1-on-1 only — the self-paced "SkillCourses" page has been
// removed. The learner nav is: Skill Dashboard, My Sessions, Explore,
// My Reviews, Messages. Booking happens inside Explore, so there is no
// standalone Book page in the nav (the /skill-dev/book route still exists and
// is reached from Explore + the dashboard "Book" buttons).

import { useNavigate } from "react-router-dom";
import SkillSessions from "./SkillSessions";
import SkillBookTutor from "./SkillBookTutor";
import SkillExplore from "./SkillExplore";
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
export function SkillBookPage()     { const n = useSkillNav(); return <SkillBookTutor openMsg={n.openMsg} />; }
export function SkillExplorePage()  { const n = useSkillNav(); return <SkillExplore setTab={n.setTab} openMsg={n.openMsg} />; }
export function SkillReviewsPage()  { return <SkillReviews />; }
