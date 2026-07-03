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

export const freeEnroll = (courseId) =>
  api.post("/enrollments/free-enroll/", { course: courseId }).then((r) => r.data);

// Rupee formatting from the paise the API returns (₹1 = 100 paise).
export const formatPrice = (paise) => {
  if (!paise || paise <= 0) return "Free";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
};
