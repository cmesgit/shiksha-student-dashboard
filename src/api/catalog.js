// src/api/catalog.js
// ──────────────────────────────────────────────────────────────────────────
// Academy "Browse Courses" data layer. Everything the in-dashboard shop needs
// to pull real courses from the database and enrol into them — no redirect to
// the marketing site.
//
//   getCourseCatalog({ q, board })  → GET  /courses/catalog/
//   getPaymentConfig()              → GET  /enrollments/payment-config/
//   freeEnroll(courseId)            → POST /enrollments/free-enroll/
//
// getPaymentConfig falls back to "free" if the endpoint is unavailable so the
// shop never hard-fails; the backend still refuses a free-enrol when the live
// payment mode collects money, so this fallback can't grant paid access.
// ──────────────────────────────────────────────────────────────────────────

import api from "./apiClient";

export const getCourseCatalog = (params = {}) => {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.board) search.set("board", params.board);
  const qs = search.toString();
  return api.get(`/courses/catalog/${qs ? `?${qs}` : ""}`).then((r) => r.data);
};

// Full course detail incl. `batches` — the catalog list above doesn't carry
// per-batch data, so the batch picker fetches this on demand. Public/AllowAny
// on the backend, so no auth wrinkle here.
export const getCoursePublic = (courseId) =>
  api.get(`/courses/${courseId}/public/`).then((r) => r.data);

export const getPaymentConfig = () =>
  api
    .get("/enrollments/payment-config/")
    .then((r) => r.data)
    .catch(() => ({
      provider: "free",
      label: "Free (no payment)",
      is_free: true,
      auto_activate: true,
      requires_manual_proof: false,
      collects_money: false,
    }));

// `activeProfileId` is optional (from useAuth()'s `activeProfile?.id`) — when
// passed, the backend cross-checks it against its own active-profile claim
// and rejects with a clear "profile changed" error if a different tab
// switched profiles in between, instead of silently enrolling the wrong one.
export const freeEnroll = (courseId, batchId, activeProfileId) =>
  api.post("/enrollments/free-enroll/", {
    course: courseId,
    ...(batchId ? { batch: batchId } : {}),
    ...(activeProfileId ? { active_profile_id: activeProfileId } : {}),
  }).then((r) => r.data);

// Student picks their own batch after already being enrolled without one
// (e.g. enrolled before the course had batches, or skipped the picker).
export const selectEnrollmentBatch = (courseId, batchId, activeProfileId) =>
  api.post("/enrollments/select-batch/", {
    course: courseId,
    batch: batchId,
    ...(activeProfileId ? { active_profile_id: activeProfileId } : {}),
  }).then((r) => r.data);

// Rupee formatting from the paise the API returns (₹1 = 100 paise).
export const formatPrice = (paise) => {
  if (!paise || paise <= 0) return "Free";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
};
