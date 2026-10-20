// PLACEMENT: src/api/counsellingService.js   (NEW FILE — student dashboard app)
//
// The student-side slice of the counseling API (mounted at
// /api/counseling/). Booking and discovery live on the landing site;
// this app manages what happens AFTER booking: sessions, the
// pre-session assessment, and published reports.

import api from "./apiClient";

export async function getAppointments(params = {}) {
  // params: {status, upcoming: 1}  — returns every learner profile on
  // the account (a parent sees their dependents' sessions too)
  return (await api.get("/counseling/appointments/", { params })).data;
}

export async function cancelAppointment(id, reason = "") {
  return (await api.post(`/counseling/appointments/${id}/cancel/`, { reason })).data;
}

export async function getAssessment(appointmentId) {
  return (await api.get(`/counseling/appointments/${appointmentId}/assessment/`)).data;
}

export async function saveAssessment(appointmentId, answers) {
  return (await api.put(`/counseling/appointments/${appointmentId}/assessment/`, { answers })).data;
}

export async function submitAssessment(appointmentId) {
  return (await api.post(`/counseling/appointments/${appointmentId}/assessment/submit/`)).data;
}

export async function getReports() {
  return (await api.get("/counseling/reports/")).data;
}

export async function getGuideProgressList() {
  return (await api.get("/counseling/guide-progress/")).data;
}

export async function getCounsellingIntake() {
  return (await api.get("/counseling/intake/")).data;
}

export async function getCounsellingNotifications(params = {}) {
  return (await api.get("/notifications/", {
    params: { role: "STUDENT", verb_prefix: "counseling.", page_size: 100, ...params },
  })).data;
}

export async function markCounsellingNotificationRead(id) {
  return (await api.post(`/notifications/${id}/read/`)).data;
}

// ── Reschedule + reviews (workflow §8) ──────────────────────────────────

export async function getSlots(counselorId, days = 14) {
  return (await api.get(`/counseling/counselors/${counselorId}/slots/`,
                        { params: { days } })).data;
}

export async function rescheduleAppointment(id, scheduledAt) {
  // 409 when the slot was taken between loading the picker and confirming —
  // the server re-validates, so callers must handle it rather than assume.
  return (await api.patch(`/counseling/appointments/${id}/reschedule/`,
                          { scheduled_at: scheduledAt })).data;
}

export async function saveReview(id, { rating, comment }) {
  // Upsert: the endpoint creates on first call and updates after.
  return (await api.post(`/counseling/appointments/${id}/review/`,
                         { rating, comment })).data;
}

export async function deleteReview(id) {
  return (await api.delete(`/counseling/appointments/${id}/review/`)).data;
}
