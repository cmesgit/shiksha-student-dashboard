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
