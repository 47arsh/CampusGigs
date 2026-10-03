import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext.jsx";
import { api } from "../lib/api.js";
import NotificationContext from "./notificationContext.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api\/?$/, "");

export function NotificationProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [notificationState, setNotificationState] = useState({ token: null, items: [] });
  const [connectionState, setConnectionState] = useState({ token: null, connected: false });
  const [errorState, setErrorState] = useState({ token: null, message: "" });
  const notifications = useMemo(
    () => notificationState.token === token ? notificationState.items : [],
    [notificationState, token],
  );
  const socketConnected = isAuthenticated &&
    connectionState.token === token &&
    connectionState.connected;
  const error = errorState.token === token ? errorState.message : "";

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return undefined;
    }

    let active = true;
    const socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: false,
    });

    const refreshNotifications = async () => {
      try {
        const response = await api("/notifications", { token });
        if (active) {
          setNotificationState((current) => {
            const currentItems = current.token === token ? current.items : [];
            const combined = new Map(
              [...currentItems, ...response.notifications].map((item) => [item._id, item]),
            );
            return {
              token,
              items: [...combined.values()].sort(
                (first, second) =>
                  new Date(second.createdAt).getTime() -
                  new Date(first.createdAt).getTime(),
              ),
            };
          });
          setErrorState({ token, message: "" });
        }
      } catch (requestError) {
        if (active) setErrorState({ token, message: requestError.message });
      }
    };

    socket.on("connect", () => {
      if (active) setConnectionState({ token, connected: true });
      refreshNotifications();
    });
    socket.on("disconnect", () => {
      if (active) setConnectionState({ token, connected: false });
    });
    socket.on("connect_error", () => {
      if (active) setConnectionState({ token, connected: false });
    });
    socket.on("notification:new", (notification) => {
      if (active) {
        setNotificationState((current) => {
          const currentItems = current.token === token ? current.items : [];
          return {
            token,
            items: [
              notification,
              ...currentItems.filter((item) => item._id !== notification._id),
            ],
          };
        });
      }
    });

    refreshNotifications();
    socket.connect();

    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  const markAsRead = useCallback(async (notificationId) => {
    const response = await api(`/notifications/${notificationId}/read`, {
      method: "PATCH",
      token,
    });
    setNotificationState((current) => ({
      token,
      items: (current.token === token ? current.items : []).map((item) =>
        item._id === notificationId ? response.notification : item,
      ),
    }));
  }, [token]);

  const unreadCount = notifications.reduce(
    (count, notification) => count + (notification.read ? 0 : 1),
    0,
  );
  const value = useMemo(() => ({
    notifications,
    unreadCount,
    socketConnected,
    error,
    markAsRead,
  }), [notifications, unreadCount, socketConnected, error, markAsRead]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
