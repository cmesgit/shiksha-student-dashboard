// STUDENT — src/contexts/CourseContext.jsx  (FULL REPLACEMENT)
// ─────────────────────────────────────────────────────────────
// WHAT CHANGED vs the previous version
// ────────────────────────────────────
// 1. DEFAULT_TRACK is "academy". The old "skill" value was a labelled
//    dev convenience ("Production: set to academy") that shipped — a
//    brand-new academy learner with no enrollment landed on the Skill
//    Dev home and had to find the header toggle to reach their own
//    product.
// 2. The manual Academy⟷Skill override is now stored PER LEARNER
//    PROFILE (shiksha.learner.trackOverride.<profileId>). One key was
//    shared by every profile on the account, so a sibling switching
//    to Skill Dev silently changed which home the other sibling
//    landed on. The legacy un-keyed value is migrated on first read,
//    then removed.
// 3. PROFILE SWITCHES RESET COURSE STATE. Courses are refetched when
//    the active profile changes (the /courses/my/ endpoint is now
//    profile-scoped server-side), and the previous activeCourse is
//    kept ONLY if it exists in the new profile's list — no more
//    carrying Child A's course into Child B's session.
//
// Everything else (subjects fetch, selectCourse clearing the
// override, refreshCourses) is unchanged.

import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/apiClient";
import { useAuth } from "./AuthContext";
import { courseTrack } from "../utils/trackFromCourses";

const CourseContext = createContext();

// Fallback track when the learner has no active course AND no manual
// choice. Academy is the primary funnel; Skill Dev is one tap away on
// the (always-unlocked) LearnerTrackSwitcher.
const DEFAULT_TRACK = "academy";

const TRACK_OVERRIDE_BASE = "shiksha.learner.trackOverride";
const LEGACY_OVERRIDE_KEY = TRACK_OVERRIDE_BASE; // pre-fix shared key

const overrideKey = (profileId) =>
  profileId ? `${TRACK_OVERRIDE_BASE}.${profileId}` : LEGACY_OVERRIDE_KEY;

function readTrackOverride(profileId) {
  try {
    let v = localStorage.getItem(overrideKey(profileId));
    // One-time migration: adopt the legacy shared value for THIS
    // profile, then delete it so siblings stop inheriting it.
    if (!v && profileId) {
      const legacy = localStorage.getItem(LEGACY_OVERRIDE_KEY);
      if (legacy === "academy" || legacy === "skill") {
        localStorage.setItem(overrideKey(profileId), legacy);
        localStorage.removeItem(LEGACY_OVERRIDE_KEY);
        v = legacy;
      }
    }
    return v === "academy" || v === "skill" ? v : null;
  } catch {
    return null; // storage unavailable (SSR / private mode)
  }
}

function writeTrackOverride(profileId, track) {
  try {
    const key = overrideKey(profileId);
    if (track === "academy" || track === "skill") {
      localStorage.setItem(key, track);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    /* storage unavailable — in-memory state only */
  }
}

export function CourseProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const activeProfileId = user?.active_profile?.id || null;

  const [courses,       setCourses]       = useState([]);
  const [activeCourse,  setActiveCourse]  = useState(null);
  const [subjects,      setSubjects]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [trackOverride, setTrackOverride] = useState(() =>
    readTrackOverride(activeProfileId)
  );

  // Re-read the per-profile override + refetch courses whenever the
  // ACTIVE PROFILE changes (login, switch, or teacher→learner return).
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    setTrackOverride(readTrackOverride(activeProfileId));
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, activeProfileId]);

  useEffect(() => {
    if (activeCourse) fetchSubjects(activeCourse.id);
    else setSubjects([]);
  }, [activeCourse]);

  const fetchCourses = async () => {
    try {
      const res = await api.get("/courses/my/");
      const list = res.data || [];
      setCourses(list);
      // Keep the previous SELECTION (by id) ONLY if this profile still has
      // it — but swap in the freshly-fetched object, not the stale one, so
      // refreshCourses() (e.g. right after picking a batch, or enrolling)
      // actually reflects on the active course instead of silently no-op'ing.
      setActiveCourse((prev) => {
        if (prev) {
          const fresh = list.find((c) => c.id === prev.id);
          if (fresh) return fresh;
        }
        return list.length > 0 ? list[0] : null;
      });
      return list;
    } catch (err) {
      console.error("Failed to fetch courses", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Re-pull enrollments on demand (e.g. right after a one-tap enrol in
  // the Browse Courses shop).
  const refreshCourses = () => fetchCourses();

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
      writeTrackOverride(activeProfileId, null); // course drives the track
    }
  };

  // Header switch: choose a track directly (remembered per profile).
  const setTrack = (track) => {
    setTrackOverride(track);
    writeTrackOverride(activeProfileId, track);
  };

  // ── Derived track — "academy" | "skill"
  // Priority: manual switch → active course → academy fallback.
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
        activeTrack,
        setTrack,
        refreshCourses,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  return useContext(CourseContext);
}
