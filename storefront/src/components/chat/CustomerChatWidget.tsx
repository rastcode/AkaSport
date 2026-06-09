"use client";

/**
 * ویجت چت شناور پشتیبانی برای مشتری (RTL / فارسی).
 *
 * دکمه‌ی شناور در گوشه‌ی صفحه که یک پنجره‌ی چت باز می‌کند. تاریخچه‌ی پیام‌ها از
 * طریق REST بارگذاری و پیام‌های زنده‌ی ورودی/خروجی به‌صورت پویا افزوده می‌شوند.
 * تنها برای مشتریانِ واردشده نمایش داده می‌شود.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { fetchRoomHistory, fetchRooms } from "@/services/chatService";
import type {
  ChatDisplayMessage,
  ChatInboundFrame,
  ChatMessageRecord,
} from "@/types/chat";

export function CustomerChatWidget() {
  const { user, isAuthenticated, role } = useAuth();

  // Show only to authenticated CUSTOMER users (staff use the dashboard).
  if (!isAuthenticated || role !== "CUSTOMER") return null;

  return (
    <ErrorBoundary label="گفتگوی پشتیبانی">
      <ChatWidgetInner userId={user?.id ?? null} />
    </ErrorBoundary>
  );
}

function ChatWidgetInner({ userId }: { userId: number | null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [unread, setUnread] = useState(0);
  const seenIds = useRef<Set<number>>(new Set());

  const appendFromRecord = useCallback(
    (rec: ChatMessageRecord) => {
      if (seenIds.current.has(rec.id)) return;
      seenIds.current.add(rec.id);
      setMessages((prev) => [
        ...prev,
        {
          key: `m-${rec.id}`,
          messageId: rec.id,
          senderId: rec.sender_id,
          senderRole: rec.sender_role,
          text: rec.message,
          timestamp: rec.timestamp,
          mine: rec.sender_id === userId,
        },
      ]);
    },
    [userId],
  );

  /* ----------------------- incoming live frames ------------------------- */
  const handleFrame = useCallback(
    (frame: ChatInboundFrame) => {
      if (frame.type === "message") {
        if (seenIds.current.has(frame.message_id)) return;
        seenIds.current.add(frame.message_id);
        const mine = frame.sender_id === userId;
        setMessages((prev) => [
          ...prev,
          {
            key: `m-${frame.message_id}`,
            messageId: frame.message_id,
            senderId: frame.sender_id,
            senderRole: frame.sender_role,
            text: frame.message,
            timestamp: frame.timestamp,
            mine,
          },
        ]);
        if (!open && !mine) setUnread((u) => u + 1);
      }
      // system/error frames are ignored in the compact customer widget.
    },
    [open, userId],
  );

  const { status, sendMessage, error, reconnect } =
    useWebSocket<ChatInboundFrame>({
      path: "/ws/chat/",
      enabled: open,
      onMessage: handleFrame,
    });

  /* --------------------------- load history ----------------------------- */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingHistory(true);

    (async () => {
      try {
        // The customer's active room id is resolved via REST.
        const rooms = await fetchRooms("active");
        const room = rooms[0];
        if (room) {
          const history = await fetchRoomHistory(room.id);
          if (!cancelled) {
            seenIds.current = new Set();
            setMessages([]);
            history.forEach(appendFromRecord);
          }
        }
      } catch {
        /* a fresh customer may have no room yet — that's fine */
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, appendFromRecord]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open, messages.length]);

  /* ------------------------------ send ---------------------------------- */
  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    const ok = sendMessage(text);
    if (ok) setDraft("");
  }

  const statusLabel = useMemo(() => {
    switch (status) {
      case "open":
        return "آنلاین";
      case "connecting":
        return "در حال اتصال…";
      case "closed":
        return "قطع‌شده — اتصال مجدد…";
      case "error":
        return "خطا در اتصال";
      default:
        return "";
    }
  }, [status]);

  return (
    <>
      {/* دکمه‌ی شناور */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "بستن گفتگو" : "گفتگو با پشتیبانی"}
        aria-expanded={open}
        className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center
                   rounded-full bg-bondi-blue text-white shadow-card transition-transform
                   hover:scale-105 hover:bg-bondi-blue-dark focus:outline-none focus:ring-4
                   focus:ring-bondi-blue/30"
      >
        {open ? (
          <CloseIcon />
        ) : (
          <>
            <ChatIcon />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </>
        )}
      </button>

      {/* پنجره‌ی چت */}
      {open && (
        <div
          dir="rtl"
          role="dialog"
          aria-label="گفتگوی پشتیبانی"
          className="animate-fade-in-up fixed bottom-24 left-6 z-50 flex h-[30rem] w-[22rem]
                     max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border
                     border-silver bg-white shadow-card"
        >
          {/* سربرگ */}
          <header className="flex items-center justify-between bg-bondi-blue px-4 py-3 text-white">
            <div>
              <h2 className="text-sm font-bold">پشتیبانی آکاسپورت</h2>
              <p className="flex items-center gap-1.5 text-xs text-white/80">
                <span
                  className={
                    "h-2 w-2 rounded-full " +
                    (status === "open" ? "bg-green-300" : "bg-white/60")
                  }
                  aria-hidden
                />
                {statusLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="بستن"
              className="rounded-lg p-1 hover:bg-white/15"
            >
              <CloseIcon />
            </button>
          </header>

          {/* پیام‌ها */}
          <div className="flex-1 overflow-y-auto bg-dust-grey/40">
            {loadingHistory ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
              </div>
            ) : (
              <ChatMessageList
                messages={messages}
                emptyHint="سلام! چطور می‌توانیم کمکتان کنیم؟"
              />
            )}
          </div>

          {error && (
            <div className="flex items-center justify-between gap-2 bg-red-50 px-3 py-2 text-xs text-red-700">
              <span>{error}</span>
              <button
                type="button"
                onClick={reconnect}
                className="font-semibold text-bondi-blue hover:underline"
              >
                تلاش مجدد
              </button>
            </div>
          )}

          {/* ورودی پیام */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-silver bg-white p-3"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="پیام خود را بنویسید…"
              aria-label="متن پیام"
              disabled={status !== "open"}
              className="input-field py-2 text-sm disabled:bg-dust-grey/50"
            />
            <button
              type="submit"
              disabled={status !== "open" || !draft.trim()}
              aria-label="ارسال پیام"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                         bg-bondi-blue text-white transition-colors hover:bg-bondi-blue-dark
                         disabled:opacity-50"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

/* -------------------------------- icons ------------------------------------ */

function ChatIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.5h8M8 14h5m-9 6 3.5-2.5A2 2 0 0 1 10.7 17H17a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v13Z" />
    </svg>
  );
}

function SendIcon() {
  // Arrow points right-to-left to suit the RTL send affordance.
  return (
    <svg className="h-5 w-5 -scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.27 3.6a.6.6 0 0 1 .82-.72l16.5 8.4a.6.6 0 0 1 0 1.08l-16.5 8.4a.6.6 0 0 1-.82-.72L6 12Zm0 0h6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
