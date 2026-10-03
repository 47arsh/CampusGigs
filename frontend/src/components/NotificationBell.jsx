import { useState } from "react";
import { useNotifications } from "../context/useNotifications.js";

function formatTimestamp(value) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(value).toLocaleDateString();
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [markingId, setMarkingId] = useState("");
  const [actionError, setActionError] = useState("");
  const {
    notifications,
    unreadCount,
    socketConnected,
    error,
    markAsRead,
  } = useNotifications();

  async function openNotification(notification) {
    if (notification.read || markingId) return;
    setMarkingId(notification._id);
    setActionError("");
    try {
      await markAsRead(notification._id);
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setMarkingId("");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-lg border border-slate-200 px-3 py-2 text-lg text-slate-700 hover:bg-slate-50"
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 min-w-5 rounded-full bg-indigo-600 px-1 text-center text-xs font-bold leading-5 text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-[Manrope] font-bold text-slate-900">Notifications</h2>
            <span className="text-xs text-slate-500">
              {socketConnected ? "Live" : "Reconnecting"}
            </span>
          </header>

          {(error || actionError) && (
            <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
              {actionError || error}
            </p>
          )}

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                No notifications yet.
              </p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  disabled={!notification.read && Boolean(markingId)}
                  className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50 ${
                    notification.read ? "bg-white" : "bg-indigo-50/60"
                  }`}
                >
                  <span
                    aria-label={notification.read ? "Read" : "Unread"}
                    className={`mt-1 text-xs ${notification.read ? "text-slate-300" : "text-indigo-600"}`}
                  >
                    {notification.read ? "○" : "●"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-slate-800">{notification.message}</span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {formatTimestamp(notification.createdAt)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default NotificationBell;
