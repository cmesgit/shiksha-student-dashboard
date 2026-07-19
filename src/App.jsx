/**
 * PLACEMENT: src student/App.jsx
 * ACTION:    Replace the entire file.
 *
 * Changes from previous version:
 *   - Added import for SkillMessages
 *   - Added import for SkillSessionDetail
 *   - Added import for SkillSessionLive  (NEW)
 *   - Added <Route path="skill-messages" element={<SkillMessages />} />
 *   - Added <Route path="skill-dev/sessions/:id" element={<SkillSessionDetail />} />
 *   - Added fullscreen <Route path="/skill-session/live/:id" element={<SkillSessionLive />} />  (NEW)
 */
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CourseProvider } from "./contexts/CourseContext";
import DocumentTitle from "./components/DocumentTitle";
import { HOME_URL } from "./config/urls";

import StudentLayout from "./layout/StudentLayout";

import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import PrivateDetails from "./pages/PrivateDetails";
import ChangePassword from "./pages/ChangePassword";
import Chat from "./pages/Chat";
import SkillMessages from "./pages/SkillMessages";
import SkillSessionDetail from "./pages/SkillSessionDetail";
import SkillSessionLive from "./pages/SkillSessionLive";

import Subjects from "./pages/Subjects";
import SubjectDetails from "./pages/SubjectDetails";
import SubjectsAssignments from "./pages/SubjectsAssignments";
import AssignmentDetail from "./pages/AssignmentDetail";
import SubjectsQuiz from "./pages/SubjectsQuiz";
import QuizList from "./pages/QuizList";
import QuizDetail from "./pages/QuizDetail";
import QuizPractice from "./pages/QuizPractice";
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
import Progress from "./pages/Progress";
import AssignmentsSubjects from "./pages/AssignmentsSubjects";
import MyCourses from "./pages/MyCourses";
import BrowseCourses from "./pages/BrowseCourses";
import MyCounselling from "./pages/counselling/MyCounselling";
import CounsellingAssessment from "./pages/counselling/CounsellingAssessment";

import {
  
  SkillSessionsPage,
  SkillBookPage,
  SkillExplorePage,
  SkillReviewsPage,
} from "./skill/SkillRoutes";


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
          <DocumentTitle />
          <Routes>
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

              <Route path="chat" element={<Chat />} />
              <Route path="skill-messages" element={<SkillMessages />} />

              <Route path="subjects" element={<Subjects />} />
              <Route path="subjects/:subjectId" element={<SubjectDetails />} />

              {/* Top-level Progress (mockup nav item). Progress falls back to
                  the active course when no :courseId is present. */}
              <Route path="progress" element={<Progress />} />

              {/* Top-level Assignments landing (subject picker). Replaces the
                  old redirect to /subjects so the nav item is a real page. */}
              <Route path="assignments" element={<AssignmentsSubjects />} />
              <Route path="subjects/:subjectId/assignments" element={<SubjectsAssignments />} />
              <Route path="subjects/:subjectId/assignments/:assignmentId" element={<AssignmentDetail />} />

              <Route path="subjects/quiz" element={<SubjectsQuiz />} />
              <Route path="subjects/quiz/:subjectId" element={<QuizList />} />
              <Route path="subjects/quiz/:subjectId/take/:quizId" element={<QuizDetail />} />
              <Route path="subjects/quiz/:subjectId/practice/:quizId" element={<QuizPractice />} />
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

              <Route path="my-courses" element={<MyCourses />} />
              <Route path="my-courses/:courseId" element={<MyCourseDetail />} />
              <Route path="my-courses/:courseId/progress" element={<Progress />} />
              <Route path="browse-courses" element={<BrowseCourses />} />

              {/* ── Counselling ──
                  /counseling/* (US spelling) matches the backend's
                  notification link_urls exactly, so bell clicks
                  deep-link to the right appointment/report. */}
              <Route path="counseling" element={<MyCounselling />} />
              <Route path="counseling/appointments" element={<MyCounselling />} />
              <Route path="counseling/appointments/:id" element={<MyCounselling />} />
              <Route path="counseling/appointments/:id/assessment" element={<CounsellingAssessment />} />
              <Route path="counseling/reports" element={<MyCounselling initialTab="reports" />} />
              <Route path="counselling/*" element={<Navigate to="/counseling" replace />} />

              {/* ── Skill Dev ── */}
              
              <Route path="skill-dev/sessions" element={<SkillSessionsPage />} />
              <Route path="skill-dev/sessions/:id" element={<SkillSessionDetail />} />
              <Route path="skill-dev/book" element={<SkillBookPage />} />
              <Route path="skill-dev/explore" element={<SkillExplorePage />} />
              <Route path="skill-dev/reviews" element={<SkillReviewsPage />} />
            </Route>

            {/* Fullscreen live routes */}
            <Route path="/private-session/live/:id" element={<PrivateSessionLive />} />
            <Route path="/group-session/live/:id" element={<GroupSessionLive />} />
            {/* Skill-dev 1-on-1 LiveKit room (separate from Academy private sessions) */}
            <Route path="/skill-session/live/:id" element={<SkillSessionLive />} />
          </Routes>
        </BrowserRouter>
      </CourseProvider>
    </AuthProvider>
  );
}
