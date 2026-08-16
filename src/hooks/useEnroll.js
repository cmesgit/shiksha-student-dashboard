// src/hooks/useEnroll.js
// ──────────────────────────────────────────────────────────────────────────
// One shared enrolment flow for every Academy surface (Browse Courses shop,
// the empty-state preview strip). Keeps the "which payment mode is live"
// decision in one place.
//
//   free mode  → one-tap POST /enrollments/free-enroll/, then refreshCourses()
//                so the new course appears without a reload.
//   paid mode  → hand the course back to the caller via onNeedsPayment(course)
//                so it can open the in-dashboard CoursePaymentModal. No more
//                window.open() redirect to the marketing site.
//
// Returns per-course busy state and a single error string, so callers can
// disable just the card being enrolled and surface failures inline.
// ──────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { useCourse } from "../contexts/CourseContext";
import { useAuth } from "../contexts/AuthContext";
import { getPaymentConfig, freeEnroll, getCoursePublic } from "../api/catalog";
import { extractError } from "../shared/extractError";

export default function useEnroll() {
  const { refreshCourses } = useCourse();
  const { activeProfile } = useAuth();
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
    async (course, { onEnrolled, onNeedsPayment, onNeedsBatch, batchId } = {}) => {
      setError("");

      // The catalog list this hook is normally called from carries no
      // per-batch data, so the first pass here fetches it. Skip once the
      // caller already resolved a batch choice (re-invoking `enroll` after
      // the picker) to avoid re-fetching and re-prompting.
      if (!batchId) {
        try {
          const detail = await getCoursePublic(course.id);
          const batches = Array.isArray(detail?.batches) ? detail.batches : [];
          if (batches.length > 0) {
            onNeedsBatch?.(course, batches);
            return { needsBatch: true };
          }
        } catch {
          // Batch lookup failing shouldn't block enrollment — fall through
          // as if the course simply has no batches configured.
        }
      }

      if (collectsMoney) {
        // Open the in-dashboard payment flow instead of redirecting out.
        onNeedsPayment?.(course, batchId);
        return { needsPayment: true };
      }

      try {
        setBusyId(course.id);
        await freeEnroll(course.id, batchId, activeProfile?.id);
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
    [collectsMoney, refreshCourses, activeProfile]
  );

  return { enroll, busyId, error, setError, config, collectsMoney };
}
