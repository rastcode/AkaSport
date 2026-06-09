"use client";

/**
 * Type-safe WebSocket lifecycle hook.
 *
 * Manages connect / disconnect, exponential-backoff auto-reconnection, JSON
 * frame parsing, and a stable `sendMessage`. The access token is pulled from
 * the auth cookie and appended to the URL query string, matching the Django
 * `JWTAuthMiddleware` contract (`ws://…/ws/chat/?token=<JWT>`).
 *
 * Generic over the inbound frame type so callers get fully-typed messages.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { getAccessToken } from "@/lib/tokens";

export type WebSocketStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error";

interface UseWebSocketOptions<TInbound> {
  /** Relative WS path, e.g. "/ws/chat/" or "/ws/chat/5/". */
  path: string;
  /** Enable/disable the connection (e.g. gate on auth or an open panel). */
  enabled?: boolean;
  /** Called for every successfully-parsed inbound JSON frame. */
  onMessage?: (frame: TInbound) => void;
  /** Called when the socket opens (e.g. to load history). */
  onOpen?: () => void;
  /** Max reconnection attempts before giving up (default 8). */
  maxRetries?: number;
}

interface UseWebSocketResult {
  status: WebSocketStatus;
  /** Send a JSON-serialisable payload; returns false if the socket isn't open. */
  send: (payload: unknown) => boolean;
  /** Convenience: send a chat text frame `{ message }`. */
  sendMessage: (text: string) => boolean;
  /** Force a manual reconnect. */
  reconnect: () => void;
  /** Last error message, if any. */
  error: string | null;
}

function resolveWsBase(): string {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";
  // Strip a trailing /api and swap http(s) -> ws(s).
  const origin = apiBase.replace(/\/api\/?$/, "");
  return origin.replace(/^http/, "ws");
}

export function useWebSocket<TInbound = unknown>({
  path,
  enabled = true,
  onMessage,
  onOpen,
  maxRetries = 8,
}: UseWebSocketOptions<TInbound>): UseWebSocketResult {
  const [status, setStatus] = useState<WebSocketStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCloseRef = useRef(false);

  // Keep the latest callbacks in refs so the connect effect stays stable.
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
  }, [onMessage, onOpen]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    const token = getAccessToken();
    if (!token) {
      setStatus("error");
      setError("توکن احراز هویت در دسترس نیست.");
      return;
    }

    // Tear down any prior socket before opening a new one.
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }

    const url = `${resolveWsBase()}${path}?token=${encodeURIComponent(token)}`;
    setStatus("connecting");
    manualCloseRef.current = false;

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      setStatus("error");
      setError("ایجاد اتصال وب‌سوکت ناموفق بود.");
      scheduleReconnect();
      return;
    }
    socketRef.current = socket;

    socket.onopen = () => {
      retriesRef.current = 0;
      setStatus("open");
      setError(null);
      onOpenRef.current?.();
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const frame = JSON.parse(event.data) as TInbound;
        onMessageRef.current?.(frame);
      } catch {
        /* ignore non-JSON frames */
      }
    };

    socket.onerror = () => {
      setStatus("error");
      setError("خطا در ارتباط وب‌سوکت.");
    };

    socket.onclose = (event: CloseEvent) => {
      socketRef.current = null;
      if (manualCloseRef.current) {
        setStatus("closed");
        return;
      }
      // 4401/4403/4404 are auth/permission closes — don't hammer the server.
      if (event.code === 4401 || event.code === 4403 || event.code === 4404) {
        setStatus("error");
        setError(
          event.code === 4401
            ? "احراز هویت ناموفق بود."
            : event.code === 4403
              ? "دسترسی مجاز نیست."
              : "اتاق گفتگو یافت نشد.",
        );
        return;
      }
      setStatus("closed");
      scheduleReconnect();
    };

    function scheduleReconnect() {
      if (retriesRef.current >= maxRetries) {
        setError("اتصال مجدد ناموفق بود. لطفاً صفحه را تازه‌سازی کنید.");
        return;
      }
      const attempt = retriesRef.current + 1;
      retriesRef.current = attempt;
      // Exponential backoff with jitter, capped at 15s.
      const delay = Math.min(15000, 2 ** attempt * 500) + Math.random() * 300;
      clearReconnectTimer();
      reconnectTimer.current = setTimeout(() => {
        if (!manualCloseRef.current) connect();
      }, delay);
    }
  }, [path, maxRetries, clearReconnectTimer]);

  /* --------------------------- lifecycle ------------------------------- */
  useEffect(() => {
    if (!enabled) {
      // Disabled: ensure any open socket is closed.
      manualCloseRef.current = true;
      clearReconnectTimer();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setStatus("idle");
      return;
    }

    connect();

    return () => {
      manualCloseRef.current = true;
      clearReconnectTimer();
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [enabled, connect, clearReconnectTimer]);

  /* ----------------------------- senders ------------------------------- */
  const send = useCallback((payload: unknown): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }, []);

  const sendMessage = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      return send({ message: trimmed });
    },
    [send],
  );

  const reconnect = useCallback(() => {
    retriesRef.current = 0;
    clearReconnectTimer();
    connect();
  }, [connect, clearReconnectTimer]);

  return { status, send, sendMessage, reconnect, error };
}
