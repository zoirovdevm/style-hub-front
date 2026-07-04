'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Opens a lightweight WebSocket connection to the backend's PresenceGateway
 * and keeps a live "online users" count in sync — used by the admin
 * dashboard. Reconnects automatically if the connection drops.
 */
export function usePresence() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_PRESENCE_URL ?? 'ws://localhost:4000/ws/presence';
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      if (cancelled) return;
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === 'ONLINE_COUNT') setOnlineCount(data.count);
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        if (!cancelled) retryTimer = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      socketRef.current?.close();
    };
  }, []);

  return onlineCount;
}
