// APP-LOCAL (not a shared/sync.mjs file — the teacher app has its own
// copy with different route rules).
//
// One definition of "where does clicking a notification take me", used by
// BOTH the bell dropdown (components/NotificationBell.jsx) and the
// Communication Center list (shared/comm/NotificationsView.jsx). Those two
// surfaces read different endpoints — /activity/feed/ and /notifications/
// respectively — and used to disagree: the bell routed and the Comm Center
// silently did nothing, because ChatPanel passed
// `onNavigate={() => setView("inbox")}` and threw the link_url away.
//
// It lives here rather than inside the shared comm/ tree because
// NotificationsView is byte-identical across both apps, while the routes
// are not: this app is mounted at the root (/group-sessions), the teacher
// app under /teacher (/teacher/group-sessions). Shared file, app-local
// route module — the same split shared/comm/* already uses for apiClient.

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useCourse } from "../contexts/CourseContext";
import { trackFromPath } from "../utils/trackFromCourses";

export default function useNotificationNavigator() {
  const navigate = useNavigate();
  const { activeTrack, setTrack } = useCourse();

  // Navigate, persisting the track when the destination belongs to the
  // other one.
  //
  // The setTrack() is the load-bearing part. CourseContext ranks route
  // ABOVE the stored override, so landing on /skill-dev/* already flips the
  // chrome — but the override still says "academy". Touch any track-neutral
  // route afterwards (/, /chat, /profile) and the whole UI snaps back; and
  // because the switcher treats the pill you are already on as a no-op, the
  // user cannot correct it by hand. Persisting here makes the switch stick.
  const goTracked = useCallback((path) => {
    if (!path) return;
    const destination = trackFromPath(path);
    if (destination && destination !== activeTrack) setTrack(destination);
    navigate(path);
  }, [navigate, activeTrack, setTrack]);

  // Follow a server-provided link_url.
  //
  // Chat is the one special case: the backend emits /chat/<conversation-id>,
  // which matches no route — ChatPanel opens a conversation from router
  // state, not a URL param. It is also track-neutral, so no setTrack().
  const openLink = useCallback((linkUrl) => {
    if (typeof linkUrl !== "string" || !linkUrl.startsWith("/")) return false;
    if (linkUrl.startsWith("//")) return false;   // protocol-relative junk

    const chatMatch = linkUrl.match(/^\/chat\/([^/?]+)/);
    if (chatMatch) {
      navigate("/chat", { state: { conversationId: chatMatch[1] } });
      return true;
    }
    goTracked(linkUrl);
    return true;
  }, [navigate, goTracked]);

  // Exposed so surfaces that render a LIST (the Comm Center) can scope
  // it the same way the bell does, without ChatPanel — a shared file
  // with no CourseContext access — having to thread a prop through.
  return { goTracked, openLink, activeTrack };
}
