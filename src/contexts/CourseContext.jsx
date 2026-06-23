// src/contexts/CourseContext.jsx  — patch: expose activeTrack derived from activeCourse
// Only change from the original: import courseTrack, compute activeTrack, add to Provider value.

import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/apiClient";
import { useAuth } from "./AuthContext";
import { courseTrack } from "../utils/trackFromCourses"; // ← new import

const CourseContext = createContext();

// Fallback track used ONLY when the learner has no active course yet.
// Dev: "skill" so the Skill Dev side is visible without enrollment.
// Production: set to "academy" (or keep, and rely on real enrollment +
// the locked TrackSwitcher) so unassigned learners don't see it by default.
const DEFAULT_TRACK = "skill";

export function CourseProvider({ children }) {
  const { user, loading: authLoading } = useAuth();

  const [courses,      setCourses]      = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [subjects,     setSubjects]     = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    fetchCourses();
  }, [user, authLoading]);

  useEffect(() => {
    if (activeCourse) fetchSubjects(activeCourse.id);
    else setSubjects([]);
  }, [activeCourse]);

  const fetchCourses = async () => {
    try {
      const res = await api.get("/courses/my/");
      setCourses(res.data);
      if (res.data.length > 0) setActiveCourse(res.data[0]);
    } catch (err) {
      console.error("Failed to fetch courses", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (courseId) => {
    try {
      const res = await api.get(`/courses/${courseId}/subjects/`);
      setSubjects(res.data);
    } catch (err) {
      console.error("Failed to fetch subjects", err);
      setSubjects([]);
    }
  };

  const selectCourse = (courseId) => {
    const selected = courses.find((c) => c.id === courseId);
    if (selected) setActiveCourse(selected);
  };

  // ── NEW: derived track — "academy" | "skill"
  const activeTrack = activeCourse ? courseTrack(activeCourse) : DEFAULT_TRACK;

  return (
    <CourseContext.Provider
      value={{
        courses,
        activeCourse,
        subjects,
        selectCourse,
        loading,
        activeTrack, // ← new
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  return useContext(CourseContext);
}
