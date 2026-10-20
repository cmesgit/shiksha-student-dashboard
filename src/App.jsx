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
import { lazy, useEffect } from "react";
import RouteContent from "./components/RouteContent";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CourseProvider, useCourse } from "./contexts/CourseContext";
import DocumentTitle from "./components/DocumentTitle";
import { LoadingState } from "./components/StateViews";
import { HOME_URL } from "./config/urls";
import { TourProvider } from "./tour/TourProvider";
import { tourRegistry } from "./tour/tourRegistry";

import StudentLayout from "./layout/StudentLayout";

import Dashboard from "./pages/Dashboard";
const Profile = lazy(() => import("./pages/Profile"));
const PrivateDetails = lazy(() => import("./pages/PrivateDetails"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Chat = lazy(() => import("./pages/Chat"));
const SkillMessages = lazy(() => import("./pages/SkillMessages"));
const SkillSessionDetail = lazy(() => import("./pages/SkillSessionDetail"));
const SkillSessionLive = lazy(() => import("./pages/SkillSessionLive"));

const Subjects = lazy(() => import("./pages/Subjects"));
const SubjectDetails = lazy(() => import("./pages/SubjectDetails"));
const SubjectsAssignments = lazy(() => import("./pages/SubjectsAssignments"));
const AssignmentDetail = lazy(() => import("./pages/AssignmentDetail"));
const QuizHub = lazy(() => import("./pages/QuizHub"));
const QuizMock = lazy(() => import("./pages/QuizMock"));
const QuizPractice = lazy(() => import("./pages/QuizPractice"));
const QuizResult = lazy(() => import("./pages/QuizResult"));
const QuizAttempts = lazy(() => import("./pages/QuizAttempts"));
const ChapterPractice = lazy(() => import("./pages/ChapterPractice"));
const SubjectsRecordings = lazy(() => import("./pages/SubjectsRecordings"));
const RecordingDetail = lazy(() => import("./pages/RecordingDetail"));
const StudyMaterialList = lazy(() => import("./pages/StudyMaterialList"));
const StudyMaterialDetail = lazy(() => import("./pages/StudyMaterialDetail"));
const LiveSessionDetail = lazy(() => import("./pages/LiveSessionDetail"));
const LiveSessions = lazy(() => import("./pages/LiveSessions"));
const PrivateSessions = lazy(() => import("./pages/PrivateSessions"));
const PrivateSessionLive = lazy(() => import("./pages/PrivateSessionLive"));
const GroupSessions = lazy(() => import("./pages/GroupSessions"));
const GroupSessionLive = lazy(() => import("./pages/GroupSessionLive"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Teachers = lazy(() => import("./pages/Teachers"));
const TeacherDetail = lazy(() => import("./pages/TeacherDetail"));
const MyCourseDetail = lazy(() => import("./pages/MyCourseDetail"));
const Progress = lazy(() => import("./pages/Progress"));
const MyCourses = lazy(() => import("./pages/MyCourses"));
const BrowseCourses = lazy(() => import("./pages/BrowseCourses"));
const BlogFeed = lazy(() => import("./pages/BlogFeed"));
const MyCounselling = lazy(() => import("./pages/counselling/MyCounselling"));
const CounsellingAssessment = lazy(() => import("./pages/counselling/CounsellingAssessment"));

import {
  
  SkillSessionsPage,
  SkillBookPage,
  SkillExplorePage,
  SkillProfilePage,
  SkillCoursesPage,
  SkillReviewsPage,
} from "./skill/SkillRoutes";


// Bridges CourseContext's activeTrack into TourProvider's generic `track`
// prop — TourProvider itself never imports an app-specific context (it's
// the same file across all three apps), so each app's own mount site is
// responsible for supplying its own notion of "track."
function TourMount({ children }) {
  const { activeTrack } = useCourse();
  return (
    <TourProvider registry={tourRegistry} track={activeTrack}>
      {children}
    </TourProvider>
  );
}

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

  // A visible state, NOT a bare `null`. This mirrors the teacher app's
  // ProtectedTeacherRoute, whose own header records why: "a null return during
  // the bootstrap window (or just before a redirect fires) is a blank white
  // screen — which is exactly what made the teacher dashboard look broken."
  // The teacher app was fixed; the student app kept returning null, so every
  // student cold load was a white page for the length of the /me/ round-trip.
  // LoadingState (components/StateViews) is the app's existing token-styled
  // state card — it supplies the trailing "…", role="status" and the
  // reduced-motion spinner, so none of that is re-implemented here.
  if (loading) return <LoadingState label="Loading your dashboard" />;
  if (!isAuthenticated) return <LoadingState label="Redirecting to sign in" />;
  if (!isLearnerContext) return <LoadingState label="Taking you to the profile picker" />;
  return children;
}

export default function App() {
  // BrowserRouter is outermost so CourseProvider can derive activeTrack from
  // the current route (see trackFromPath) — the chrome has to follow the page
  // you are actually on, not just the remembered choice.
  return (
    <BrowserRouter>
      <AuthProvider>
        <CourseProvider>
          <DocumentTitle />
          <TourMount>
          <RouteContent>
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

              {/* Assignments is one flat, subject-filterable list (design
                  screen 11) — no subject-picker step. The :subjectId variant
                  is kept so existing deep links (and the dashboard's
                  per-assignment links) still resolve; it renders the same
                  screen with that subject's pill preselected. */}
              <Route path="assignments" element={<SubjectsAssignments />} />
              <Route path="subjects/:subjectId/assignments" element={<SubjectsAssignments />} />
              <Route path="subjects/:subjectId/assignments/:assignmentId" element={<AssignmentDetail />} />

              {/* Quizzes is one flat, subject-filterable list (design handoff:
                  section 12 "Quizzes") — no picker step, matching how
                  Assignments already collapsed. The optional :subjectId
                  route still resolves so older deep links (and the
                  Dashboard's per-quiz links) preselect that subject's pill. */}
              <Route path="subjects/quiz" element={<QuizHub />} />
              <Route path="subjects/quiz/:subjectId" element={<QuizHub />} />
              <Route path="subjects/quiz/:subjectId/take/:quizId" element={<QuizMock />} />
              <Route path="subjects/quiz/:subjectId/practice/:quizId" element={<QuizPractice />} />
              <Route path="subjects/quiz/:subjectId/result/:quizId" element={<QuizResult />} />
              <Route path="subjects/quiz/:subjectId/attempts/:quizId" element={<QuizAttempts />} />
              {/* Chapter practice (Phase 8, S1's "Practise" button). Keyed by
                  PracticeSession id, not a quiz — it has no subject segment
                  because a practice set belongs to a chapter, not a quiz. */}
              <Route path="subjects/quiz/practice-session/:sessionId" element={<ChapterPractice />} />

              <Route path="subjects/recordings" element={<SubjectsRecordings />} />
              <Route path="subjects/recordings/:subjectId" element={<SubjectsRecordings />} />
              <Route path="subjects/recordings/:subjectId/video/:videoId" element={<RecordingDetail />} />

              {/* Study Material is one flat, subject-filterable list (design
                  screen 13) — no subject-picker step. The /list/:subjectId
                  variant is kept so existing deep links still resolve. */}
              <Route path="study-material" element={<StudyMaterialList />} />
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
              <Route path="blogs" element={<BlogFeed />} />

              {/* ── Counselling ──
                  /counseling/* (US spelling) matches the backend's
                  notification link_urls exactly, so bell clicks
                  deep-link to the right appointment/report. */}
              <Route path="counseling" element={<MyCounselling />} />
              <Route path="counseling/appointments" element={<MyCounselling initialTab="upcoming" />} />
              <Route path="counseling/appointments/:id" element={<MyCounselling initialTab="upcoming" />} />
              <Route path="counseling/history" element={<MyCounselling initialTab="past" />} />
              <Route path="counseling/notifications" element={<MyCounselling initialTab="notifications" />} />
              <Route path="counseling/appointments/:id/assessment" element={<CounsellingAssessment />} />
              <Route path="counseling/reports" element={<MyCounselling initialTab="reports" />} />
              <Route path="counselling/*" element={<Navigate to="/counseling" replace />} />

              {/* ── Skill Dev ── */}
              
              <Route path="skill-dev/sessions" element={<SkillSessionsPage />} />
              <Route path="skill-dev/sessions/:id" element={<SkillSessionDetail />} />
              <Route path="skill-dev/book" element={<SkillBookPage />} />
              <Route path="skill-dev/explore" element={<SkillExplorePage />} />
              <Route path="skill-dev/profile/:expertId" element={<SkillProfilePage />} />
              <Route path="skill-dev/courses" element={<SkillCoursesPage />} />
              <Route path="skill-dev/reviews" element={<SkillReviewsPage />} />

              {/* Bare /skill-dev was never a route, so anything linking to it
                  (the bell's cross-track peek did) rendered nothing at all.
                  Send it to the Skill Dev home. */}
              <Route path="skill-dev" element={<Navigate to="/" replace />} />
            </Route>


            {/* Fullscreen live routes.
                GUARDED. These sit outside the layout (no chrome), and because
                the layout is what carried <RequireProfile>, they were the ONLY
                three unguarded routes in the app — a logged-out visitor opening
                the URL mounted the LiveKit room, which fires its token request
                on mount and then renders a broken room instead of redirecting
                to login. The teacher app already wraps all four of its
                equivalents (TeacherRoutes.jsx), so this was a one-sided
                divergence, not a deliberate exemption.
                No track gate here: unlike the teacher app, a student's
                CourseContext track is a UI preference, not an entitlement —
                the backend scopes each room by enrollment. */}
            <Route path="/private-session/live/:id" element={<RequireProfile><PrivateSessionLive /></RequireProfile>} />
            <Route path="/group-session/live/:id" element={<RequireProfile><GroupSessionLive /></RequireProfile>} />
            {/* Skill-dev 1-on-1 LiveKit room (separate from Academy private sessions) */}
            <Route path="/skill-session/live/:id" element={<RequireProfile><SkillSessionLive /></RequireProfile>} />

            {/* Catch-all, genuinely last. Without it React Router matches
                nothing and renders a COMPLETELY BLANK page — no layout, no
                header, no way back — which is exactly what one wrong link
                (the bell's cross-track peek) produced. Redirecting home is
                the safe default in an app where every route needs auth. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </RouteContent>
          </TourMount>
        </CourseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
