// src/skill/SkillRoutes.jsx
// Route-level wrappers that adapt the Skill Dev views (which use a
// setTab/openMsg callback API) to this app's react-router navigation.
// Pulls in skillDash.css so the .rd-card / .sp-card / .slot / .pack styles
// are present on every Skill Dev page.

import { useNavigate } from "react-router-dom";
import SkillCourses from "./SkillCourses";
import SkillSessions from "./SkillSessions";
import SkillBookTutor from "./SkillBookTutor";
import SkillExplore from "./SkillExplore";
import "./skillDash.css";

function useSkillNav() {
  const navigate = useNavigate();
  // "dashboard" → the overview (Dashboard renders SkillDevStudentSection when
  // the active track is skill); everything else → its /skill-dev/* route.
  const setTab = (tab) => navigate(tab === "dashboard" ? "/" : `/skill-dev/${tab}`);
  const openMsg = () => navigate("/chat"); // point at your chat/messages route
  return { setTab, openMsg };
}

export function SkillCoursesPage()  { return <SkillCourses />; }
export function SkillSessionsPage() { const n = useSkillNav(); return <SkillSessions setTab={n.setTab} openMsg={n.openMsg} />; }
export function SkillBookPage()     { const n = useSkillNav(); return <SkillBookTutor openMsg={n.openMsg} />; }
export function SkillExplorePage()  { const n = useSkillNav(); return <SkillExplore setTab={n.setTab} />; }
