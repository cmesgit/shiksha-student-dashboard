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

// Persist the learner's explicit Academy⟷Skill choice so it survives reloads.
// Cleared once they select a specific course (track becomes course-driven again).
const TRACK_OVERRIDE_KEY = "shiksha.learner.trackOverride";

function readTrackOverride() {
  try {
    const v = localStorage.getItem(TRACK_OVERRIDE_KEY);
    return v === "academy" || v === "skill" ? v : null;
  } catch {
    return null; // storage unavailable (SSR / private mode)
  }
}

function writeTrackOverride(track) {
  try {
    if (track === "academy" || track === "skill") {
      localStorage.setItem(TRACK_OVERRIDE_KEY, track);
    } else {
      localStorage.removeItem(TRACK_OVERRIDE_KEY);
    }
  } catch {
    /* storage unavailable — fall back to in-memory state only */
  }
}

export function CourseProvider({ children }) {
  const { user, loading: authLoading } = useAuth();

  const [courses,      setCourses]      = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [subjects,     setSubjects]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  // Manual track chosen via the header switch. Used when there's no course to
  // derive the track from (e.g. dev, no enrollment yet). Cleared once a real
  // course of that track is selected, so enrolled users are course-driven.
  const [trackOverride, setTrackOverride] = useState(readTrackOverride);

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
    if (selected) {
      setActiveCourse(selected);
      setTrackOverride(null);
      writeTrackOverride(null); // course now drives the track
    }
  };

  // Header switch: choose a track directly (and remember it across reloads).
  const setTrack = (track) => {
    setTrackOverride(track);
    writeTrackOverride(track);
  };

  // ── Derived track — "academy" | "skill"
  // Priority: manual switch → active course → DEFAULT_TRACK fallback.
  const activeTrack =
    trackOverride || (activeCourse ? courseTrack(activeCourse) : DEFAULT_TRACK);

  return (
    <CourseContext.Provider
      value={{
        courses,
        activeCourse,
        subjects,
        selectCourse,
        loading,
        activeTrack, // ← new
        setTrack,    // ← new
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  return useContext(CourseContext);
}
