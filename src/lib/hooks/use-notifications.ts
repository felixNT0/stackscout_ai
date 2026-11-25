"use client";

import { useEffect, useState } from "react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: unknown;
  created_at: string;
  read: boolean;
}

/**
 * Hook for real-time notifications via Server-Sent Events.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource("/api/notifications/stream");

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "notifications") {
          setNotifications(data.notifications);
        }
      } catch (err) {
        console.error("Failed to parse notification:", err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects, but we can handle it here
      console.warn("Notification stream disconnected");
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { notifications, connected };
}
