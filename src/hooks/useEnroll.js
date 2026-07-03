// src/hooks/useEnroll.js
// ──────────────────────────────────────────────────────────────────────────
// One shared enrolment flow for every Academy surface (Browse Courses shop,
// the empty-state preview strip). Keeps the "which payment mode is live"
// decision in one place.
//
//   free mode  → one-tap POST /enrollments/free-enroll/, then refreshCourses()
//                so the new course appears without a reload.
//   paid mode  → payment + the enrolment form live on the marketing site, so
//                we open that course in the public catalog in a new tab (the
//                dashboard session stays put — no redirect to the homepage).
//
// Returns per-course busy state and a single error string, so callers can
// disable just the card being enrolled and surface failures inline.
// ──────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { useCourse } from "../contexts/CourseContext";
import { getPaymentConfig, freeEnroll } from "../api/catalog";
import { extractError } from "../shared/extractError";
import { ACADEMY_BROWSE_URL } from "../config/urls";

export default function useEnroll() {
  const { refreshCourses } = useCourse();
  const [config, setConfig] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getPaymentConfig().then((c) => alive && setConfig(c));
    return () => { alive = false; };
  }, []);

  // A course needs paid checkout only when the live provider collects money.
  const collectsMoney = !!config?.collects_money;

  const enroll = useCallback(
    async (course, { onEnrolled } = {}) => {
      setError("");

      if (collectsMoney) {
        // Deep-link to the course in the public catalog to complete payment.
        const url = `${ACADEMY_BROWSE_URL}?course=${encodeURIComponent(course.id)}`;
        window.open(url, "_blank", "noopener,noreferrer");
        return { redirected: true };
      }

      try {
        setBusyId(course.id);
        await freeEnroll(course.id);
        await refreshCourses();
        onEnrolled?.(course);
        return { enrolled: true };
      } catch (e) {
        const msg = extractError(e) || "Couldn't enrol just now. Please try again.";
        setError(msg);
        return { error: msg };
      } finally {
        setBusyId(null);
      }
    },
    [collectsMoney, refreshCourses]
  );

  return { enroll, busyId, error, setError, config, collectsMoney };
}
