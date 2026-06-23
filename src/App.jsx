/**
 * src_student_dashboard/src/App.jsx  (FULL REPLACEMENT)
 *
 * Key changes from the original:
 *  1. RequireStudentAuth → RequireProfile: enforces LEARNER context not just auth.
 *     - Logged in but no profile selected → /pick-profile on marketplace
 *     - Not logged in → /login on marketplace
 *  2. Added <Route path="chat" element={<Chat />} />
 *  3. hooks/useAuth.jsx is now dead — delete it (it called "/me/" without /accounts)
 */
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CourseProvider } from "./contexts/CourseContext";
import { HOME_URL } from "./config/urls";

import StudentLayout from "./layout/StudentLayout";

import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import PrivateDetails from "./pages/PrivateDetails";
import ChangePassword from "./pages/ChangePassword";
import Chat from "./pages/Chat";

import Subjects from "./pages/Subjects";
import SubjectDetails from "./pages/SubjectDetails";
import SubjectsAssignments from "./pages/SubjectsAssignments";
import AssignmentDetail from "./pages/AssignmentDetail";
import SubjectsQuiz from "./pages/SubjectsQuiz";
import QuizList from "./pages/QuizList";
import QuizDetail from "./pages/QuizDetail";
import QuizResult from "./pages/QuizResult";
import QuizAttempts from "./pages/QuizAttempts";
import SubjectsRecordings from "./pages/SubjectsRecordings";
import RecordingsList from "./pages/RecordingsList";
import RecordingDetail from "./pages/RecordingDetail";
import SubjectsStudyMaterial from "./pages/SubjectsStudyMaterial";
import StudyMaterialList from "./pages/StudyMaterialList";
import StudyMaterialDetail from "./pages/StudyMaterialDetail";
import LiveSessionDetail from "./pages/LiveSessionDetail";
import LiveSessions from "./pages/LiveSessions";
import PrivateSessions from "./pages/PrivateSessions";
import PrivateSessionLive from "./pages/PrivateSessionLive";
import GroupSessions from "./pages/GroupSessions";
import GroupSessionLive from "./pages/GroupSessionLive";
import Quiz from "./pages/Quiz";
import Teachers from "./pages/Teachers";
import TeacherDetail from "./pages/TeacherDetail";
import MyCourseDetail from "./pages/MyCourseDetail";

// Skill Dev pages (wired to the Skill Dev sidebar links)
import {
  SkillCoursesPage,
  SkillSessionsPage,
  SkillBookPage,
  SkillExplorePage,
} from "./skill/SkillRoutes";


/**
 * Wraps the whole student app.
 * - Not logged in          → HOME/login
 * - Logged in, no profile  → HOME/pick-profile  (profile picker on marketplace)
 * - Logged in + learner    → render children (the dashboard)
 */
function RequireProfile({ children }) {
  const { isAuthenticated, isLearnerContext, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      window.location.href = HOME_URL + "/login";
    } else if (!isLearnerContext) {
      window.location.href = HOME_URL + "/pick-profile";
    }
  }, [loading, isAuthenticated, isLearnerContext]);

  if (loading) return null;
  if (!isAuthenticated || !isLearnerContext) return null;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <CourseProvider>
        <BrowserRouter>
          <Routes>
            {/* ── All dashboard routes require a learner profile in context ── */}
            <Route
              path="/"
              element={
                <RequireProfile>
                  <StudentLayout />
                </RequireProfile>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="private-details" element={<PrivateDetails />} />
              <Route path="change-password" element={<ChangePassword />} />

              {/* ── NEW: dashboard chat ── */}
              <Route path="chat" element={<Chat />} />

              <Route path="subjects" element={<Subjects />} />
              <Route path="subjects/:subjectId" element={<SubjectDetails />} />

              <Route path="assignments" element={<Subjects mode="assignments" />} />
              <Route path="subjects/:subjectId/assignments" element={<SubjectsAssignments />} />
              <Route path="subjects/:subjectId/assignments/:assignmentId" element={<AssignmentDetail />} />

              <Route path="subjects/quiz" element={<SubjectsQuiz />} />
              <Route path="subjects/quiz/:subjectId" element={<QuizList />} />
              <Route path="subjects/quiz/:subjectId/take/:quizId" element={<QuizDetail />} />
              <Route path="subjects/quiz/:subjectId/result/:quizId" element={<QuizResult />} />
              <Route path="subjects/quiz/:subjectId/attempts/:quizId" element={<QuizAttempts />} />

              <Route path="subjects/recordings" element={<SubjectsRecordings />} />
              <Route path="subjects/recordings/:subjectId" element={<RecordingsList />} />
              <Route path="subjects/recordings/:subjectId/video/:videoId" element={<RecordingDetail />} />

              <Route path="study-material" element={<SubjectsStudyMaterial />} />
              <Route path="study-material/list/:subjectId" element={<StudyMaterialList />} />
              <Route path="study-material/view/:id" element={<StudyMaterialDetail />} />

              <Route path="live-sessions" element={<LiveSessions />} />
              <Route path="live/:id" element={<LiveSessionDetail />} />

              <Route path="private-sessions" element={<PrivateSessions />} />
              <Route path="group-sessions" element={<GroupSessions />} />

              <Route path="quiz" element={<Quiz />} />

              <Route path="teachers" element={<Teachers />} />
              <Route path="teachers/:id" element={<TeacherDetail />} />

              <Route path="my-courses/:courseId" element={<MyCourseDetail />} />

              {/* ── Skill Dev sub-pages (the overview lives on "/" via Dashboard) ── */}
              <Route path="skill-dev/courses" element={<SkillCoursesPage />} />
              <Route path="skill-dev/sessions" element={<SkillSessionsPage />} />
              <Route path="skill-dev/book" element={<SkillBookPage />} />
              <Route path="skill-dev/explore" element={<SkillExplorePage />} />
            </Route>

            {/* ── Fullscreen live routes — no layout wrapper ── */}
            <Route path="/private-session/live/:id" element={<PrivateSessionLive />} />
            <Route path="/group-session/live/:id" element={<GroupSessionLive />} />
          </Routes>
        </BrowserRouter>
      </CourseProvider>
    </AuthProvider>
  );
}
