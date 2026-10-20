import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCounsellingNotifications, markCounsellingNotificationRead } from "../../api/counsellingService";

export default function CounsellingNotifications({ identity, onUnreadChange }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getCounsellingNotifications({ identity }).then((data) => {
      setItems(data.results || []);
      onUnreadChange(data.results?.filter((row) => !row.is_read).length || 0);
    })
      .catch(() => { setError("Couldn't load counselling notifications."); setItems([]); });
  }, [identity, onUnreadChange]);

  const open = async (item) => {
    if (!item.is_read) {
      try {
        await markCounsellingNotificationRead(item.id);
        setItems((rows) => rows.map((row) => row.id === item.id ? { ...row, is_read: true } : row));
        onUnreadChange((count) => Math.max(0, count - 1));
      } catch { setError("Couldn't mark that notification as read."); }
    }
    if (item.payload?.appointment_id) navigate(`/counseling/appointments/${item.payload.appointment_id}`);
    else if (item.link_url?.startsWith("/counseling/reports")) navigate("/counseling/reports");
  };
  const markAll = async () => {
    try {
      await Promise.all(items.filter((row) => !row.is_read)
        .map((row) => markCounsellingNotificationRead(row.id)));
      setItems((rows) => rows.map((row) => ({ ...row, is_read: true })));
      onUnreadChange(0);
    } catch { setError("Some notifications couldn't be marked as read. Please refresh."); }
  };

  const unread = (items || []).filter((row) => !row.is_read).length;
  return <div>
    <div className="mc-home-head"><div><h1>Notifications</h1><p>Counselling bookings and session updates{unread ? ` · ${unread} unread` : ""}</p></div>
      {unread > 0 && <button className="mc-btn mc-btn--outline" onClick={markAll}>Mark all shown as read</button>}
    </div>
    {error && <div className="mc-error">{error}</div>}
    {items === null ? <div className="mc-skel" style={{ height: 160 }} /> : items.length === 0 ?
      <div className="mc-empty"><div className="mc-empty-title">No counselling notifications</div>New updates will appear here.</div> :
      <div className="mc-list">{items.map((item) => <button key={item.id}
        className={`mc-card mc-notification${item.is_read ? "" : " mc-notification--new"}`} onClick={() => open(item)}>
        <span><strong>{item.title}</strong>{item.body && <span>{item.body}</span>}
          <small>{new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</small></span>
        {!item.is_read && <span className="mc-chip mc-chip--green">New</span>}
      </button>)}</div>}
  </div>;
}
