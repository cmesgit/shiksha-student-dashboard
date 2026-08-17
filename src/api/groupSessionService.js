/**
 * FILE: src/api/groupSessionService.js
 *
 * Service for Group Session sessions.
 * Connects to the sessions_app group-session endpoints:
 *   /api/sessions/group-sessions/...
 */

import api from "./apiClient";

const groupSessionService = {

  // ─────────────────────────────────────────────
  // Subjects grouped by student's enrolled courses
  // ─────────────────────────────────────────────
  async getMySubjects() {
    const res = await api.get("/sessions/group-sessions/my-subjects/");
    return res.data || [];
  },

  // Teachers teaching this subject (reuse private-session endpoint)
  async getTeachers(subjectId) {
    if (!subjectId) return [];
    const res = await api.get(`/sessions/subjects/${subjectId}/teachers/`);
    return res.data || [];
  },

  // Students enrolled in the course that owns this subject
  async getCourseStudents(subjectId, query = "") {
    if (!subjectId) return [];
    const params = query ? `?q=${encodeURIComponent(query)}` : "";
    const res = await api.get(
      `/sessions/subjects/${subjectId}/students/${params}`
    );
    return res.data || [];
  },

  // ─────────────────────────────────────────────
  // Create / list / detail
  // ─────────────────────────────────────────────
  async createGroupSession(payload) {
    // Only forward the teacher id if it actually looks like a UUID;
    // drops any accidental name-string / empty-string from a buggy dropdown.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rawTid = payload.invited_teacher_id;
    const invited_teacher_id = (typeof rawTid === "string" && UUID_RE.test(rawTid))
      ? rawTid
      : null;

    const body = {
      subject_id: payload.subject_id,
      invited_teacher_id,
      invited_user_ids: payload.invited_user_ids || [],
      scheduled_date: payload.scheduled_date,
      scheduled_time: payload.scheduled_time,
      duration_minutes: payload.duration_minutes,
      topic: payload.topic || "",
    };
    const res = await api.post("/sessions/group-sessions/create/", body);
    return transformGroupSession(res.data);
  },

  async getMyGroupSessions(tab = "upcoming") {
    const res = await api.get(
      `/sessions/group-sessions/mine/?tab=${encodeURIComponent(tab)}`
    );
    return (res.data || []).map(transformGroupSession);
  },

  async getDetail(sessionId) {
    const res = await api.get(`/sessions/group-sessions/${sessionId}/`);
    return transformGroupSession(res.data);
  },

  // ─────────────────────────────────────────────
  // Host actions
  // ─────────────────────────────────────────────
  async inviteMore(sessionId, userIds = []) {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/invite/`,
      { invited_user_ids: userIds }
    );
    return transformGroupSession(res.data);
  },

  async reinvite(sessionId, userId) {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/reinvite/`,
      { user_id: userId }
    );
    return transformGroupSession(res.data);
  },

  async cancelGroupSession(sessionId, reason = "") {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/cancel/`,
      { reason }
    );
    return transformGroupSession(res.data);
  },

  // ─────────────────────────────────────────────
  // Invitee actions
  // ─────────────────────────────────────────────
  async acceptInvite(sessionId) {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/accept/`
    );
    return transformGroupSession(res.data);
  },

  async declineInvite(sessionId) {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/decline/`
    );
    return transformGroupSession(res.data);
  },

  // Accepted invitee takes back their response — allowed any time before
  // the room has actually opened. Keeps decline_count intact.
  async unacceptInvite(sessionId) {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/unaccept/`
    );
    return transformGroupSession(res.data);
  },

  // ─────────────────────────────────────────────
  // Join room → LiveKit credentials
  // ─────────────────────────────────────────────
  async joinRoom(sessionId) {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/join/`
    );
    return res.data; // { livekit_url, token, room, role, remaining_ms, ... }
  },


  // ─────────────────────────────────────────────
  // Instant Meeting + host controls (Google-Meet-style flow)
  // ─────────────────────────────────────────────
  async createInstant({ duration_minutes = 180, topic = "" } = {}) {
    const res = await api.post("/sessions/group-sessions/instant/", {
      duration_minutes,
      topic,
    });
    return transformGroupSession(res.data);
  },

  // Resolve a room code (or UUID) to a session id so the user can navigate
  // into the live room. Auth + paywall are enforced by the backend; this
  // wrapper just normalises the response shape.
  async joinByCode(code) {
    const res = await api.post("/sessions/group-sessions/join-by-code/", {
      code: (code || "").trim(),
    });
    return res.data; // { session_id, short_code, status, session_type, host_id }
  },

  async endSession(sessionId) {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/end/`
    );
    return res.data;
  },

  async setAdmitMode(sessionId, mode) {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/admit-mode/`,
      { admit_mode: mode }
    );
    return res.data;
  },

  // ─────────────────────────────────────────────
  // Knock-to-join (admit_mode="lobby")
  // ─────────────────────────────────────────────
  async getJoinStatus(sessionId) {
    const res = await api.get(`/sessions/group-sessions/${sessionId}/my-join-status/`);
    return res.data; // { status: "pending"|"admitted"|"denied", deny_message }
  },

  async getJoinRequests(sessionId) {
    const res = await api.get(`/sessions/group-sessions/${sessionId}/join-requests/`);
    return res.data || []; // [{ id, user_id, name, requested_at }]
  },

  async admitJoinRequest(sessionId, requestId) {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/join-requests/${requestId}/admit/`
    );
    return res.data;
  },

  async denyJoinRequest(sessionId, requestId, message = "") {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/join-requests/${requestId}/deny/`,
      { message }
    );
    return res.data;
  },

  // ─────────────────────────────────────────────
  // History cleanup (per-user soft delete)
  // ─────────────────────────────────────────────

  // Hide a single past session from MY history view. Other participants
  // and the host are unaffected.
  async hideFromHistory(sessionId) {
    const res = await api.post(
      `/sessions/group-sessions/${sessionId}/hide/`
    );
    return res.data; // { ok: true }
  },

  // Bulk-hide history entries. Call shapes:
  //   clearHistory({ all: true })            → hide all my history
  //   clearHistory({ sessionIds: ["uuid"] }) → hide only the listed set
  async clearHistory({ all = false, sessionIds = null } = {}) {
    const body = all ? { all: true } : { session_ids: sessionIds || [] };
    const res = await api.post(
      "/sessions/group-sessions/history/clear/",
      body,
    );
    return res.data; // { ok: true, hidden_count: N }
  },

  // ─────────────────────────────────────────────
  // Constants
  // ─────────────────────────────────────────────
  DURATIONS: [
    { label: "30 minutes", value: 30 },
    { label: "45 minutes", value: 45 },
    { label: "1 hour",     value: 60 },
  ],

  TIME_SLOTS: [
    { label: "6:00 AM",  value: "06:00" },
    { label: "7:00 AM",  value: "07:00" },
    { label: "8:00 AM",  value: "08:00" },
    { label: "9:00 AM",  value: "09:00" },
    { label: "10:00 AM", value: "10:00" },
    { label: "11:00 AM", value: "11:00" },
    { label: "12:00 PM", value: "12:00" },
    { label: "1:00 PM",  value: "13:00" },
    { label: "2:00 PM",  value: "14:00" },
    { label: "3:00 PM",  value: "15:00" },
    { label: "4:00 PM",  value: "16:00" },
    { label: "5:00 PM",  value: "17:00" },
    { label: "6:00 PM",  value: "18:00" },
    { label: "7:00 PM",  value: "19:00" },
    { label: "8:00 PM",  value: "20:00" },
  ],

  MAX_INVITEES: 50,
};

// ─────────────────────────────────────────────
// Transform
// ─────────────────────────────────────────────
function transformGroupSession(sg) {
  if (!sg) return sg;
  return {
    ...sg,
    id: sg.id,
    shortCode: sg.short_code || "",
    sessionType: sg.session_type || "scheduled",
    admitMode: sg.admit_mode || "open",
    subjectId: sg.subject_id || null,
    subjectName: sg.subject_name,
    courseId: sg.course_id || null,
    courseTitle: sg.course_title,
    topic: sg.topic,
    hostName: sg.host_name || "",
    hostId: sg.host_id,
    invitedTeacher: sg.invited_teacher_name || null,
    invitedTeacherId: sg.invited_teacher_id || null,
    date: sg.scheduled_date,
    time: sg.scheduled_time,
    durationMinutes: sg.duration_minutes,
    maxInvitees: sg.max_invitees,
    status: sg.status,
    cancelReason: sg.cancel_reason || "",
    roomStartedAt: sg.room_started_at,
    endedAt: sg.ended_at,
    invites: (sg.invites || []).map((inv) => ({
      id: inv.id,
      userId: inv.user_id,
      name: inv.name,
      studentId: inv.student_id,
      role: inv.invite_role,
      status: inv.status,
      declineCount: inv.decline_count || 0,
      reinvitedAt: inv.reinvited_at || null,
      joinedAt: inv.joined_at || null,
      respondedAt: inv.responded_at || null,
    })),
    acceptedCount: sg.accepted_count || 0,
    pendingCount: sg.pending_count || 0,
    declinedCount: sg.declined_count || 0,
  };
}

// Generic helper: pull the most user-friendly error message out of a
// DRF/axios failure. Handles {"error": "..."}, {"detail": "..."}, and
// {"field": ["msg"]} serializer shapes. Exported so pages can reuse it.
export function extractApiError(err, fallback = "Something went wrong.") {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  if (typeof data === "object") {
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      const text = Array.isArray(v) ? v.join(" ") : String(v);
      parts.push(k === "non_field_errors" ? text : `${k}: ${text}`);
    }
    if (parts.length) return parts.join(" • ");
  }
  return fallback;
}

export const {
  getMySubjects,
  getTeachers,
  getCourseStudents,
  createGroupSession,
  getMyGroupSessions,
  getDetail,
  inviteMore,
  reinvite,
  cancelGroupSession,
  acceptInvite,
  declineInvite,
  unacceptInvite,
  joinRoom,
  createInstant,
  joinByCode,
  endSession,
  setAdmitMode,
  hideFromHistory,
  clearHistory,
  DURATIONS,
  TIME_SLOTS,
  MAX_INVITEES,
} = groupSessionService;

export default groupSessionService;
