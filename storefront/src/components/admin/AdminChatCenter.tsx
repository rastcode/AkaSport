"use client";

/**
 * مرکز گفتگوی ادمین (RTL / فارسی).
 *
 * ادمین یک اتاق مشتری را انتخاب می‌کند؛ این کامپوننت به گروه آن اتاق در لایه‌ی
 * کانال‌ها متصل می‌شود (`/ws/chat/<roomId>/`)، تاریخچه را بارگذاری و گفتگوی
 * زنده را برقرار می‌کند.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { useWebSocket } from "@/hooks/useWebSocket";
import { fetchRoomHistory } from "@/services/chatService";
import { formatNumber } from "@/lib/persian";
import type {
  ChatDisplayMessage,
  ChatInboundFrame,
  ChatMessageRecord,
} from "@/types/chat";

export function AdminChatCenter({
  roomId,
  adminUserId,
}: {
  roomId: number | null;
  adminUserId: number | null;
}) {
  const [messages, setMessages] = useState<ChatDisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const seenIds = useRef<Set<number>>(new Set());

  const toDisplay = useCallback(
    (
      id: number,
      senderId: number | null,
      role: ChatMessageRecord["sender_role"],
      text: string,
      ts: string,
    ): ChatDisplayMessage => ({
      key: `m-${id}`,
      messageId: id,
      senderId,
      senderRole: role,
      text,
      timestamp: ts,
      mine: senderId === adminUserId,
    }),
    [adminUserId],
  );

  const handleFrame = useCallback(
    (frame: ChatInboundFrame) => {
      if (frame.type !== "message") return;
      if (seenIds.current.has(frame.message_id)) return;
      seenIds.current.add(frame.message_id);
      setMessages((prev) => [
        ...prev,
        toDisplay(
          frame.message_id,
          frame.sender_id,
          frame.sender_role,
          frame.message,
          frame.timestamp,
        ),
      ]);
    },
    [toDisplay],
  );

  const { status, sendMessage, error, reconnect } =
    useWebSocket<ChatInboundFrame>({
      path: roomId ? `/ws/chat/${roomId}/` : "/ws/chat/",
      enabled: roomId !== null,
      onMessage: handleFrame,
    });

  // Reload history whenever the selected room changes.
  useEffect(() => {
    if (roomId === null) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    seenIds.current = new Set();
    setMessages([]);

    fetchRoomHistory(roomId)
      .then((history) => {
        if (cancelled) return;
        history.forEach((rec) => {
          if (seenIds.current.has(rec.id)) return;
          seenIds.current.add(rec.id);
          setMessages((prev) => [
            ...prev,
            toDisplay(rec.id, rec.sender_id, rec.sender_role, rec.message, rec.timestamp),
          ]);
        });
      })
      .catch(() => {
        /* history is best-effort */
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomId, toDisplay]);

  function handleSend() {
    const text = draft.trim();
    if (!text) return;
    if (sendMessage(text)) setDraft("");
  }

  if (roomId === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-silver bg-dust-grey/40 p-8 text-center">
        <ChatPlaceholderIcon />
        <p className="mt-3 text-sm font-medium text-blue-slate">
          برای شروع گفتگو، یک اتاق مشتری را از فهرست انتخاب کنید.
        </p>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="flex h-full flex-col overflow-hidden rounded-xl border border-silver bg-white"
    >
      {/* سربرگ اتاق */}
      <header className="flex items-center justify-between border-b border-silver bg-dust-grey px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-iron-grey">
            اتاق گفتگو #{formatNumber(roomId)}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-blue-slate">
            <span
              className={
                "h-2 w-2 rounded-full " +
                (status === "open" ? "bg-green-500" : "bg-silver")
              }
              aria-hidden
            />
            {status === "open"
              ? "متصل"
              : status === "connecting"
                ? "در حال اتصال…"
                : status === "closed"
                  ? "قطع‌شده"
                  : "خطا"}
          </p>
        </div>
      </header>

      {/* پیام‌ها */}
      <div className="flex-1 overflow-y-auto bg-dust-grey/30">
        {loadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
          </div>
        ) : (
          <ChatMessageList
            messages={messages}
            emptyHint="هنوز پیامی در این اتاق ثبت نشده است."
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
          placeholder="پاسخ خود را بنویسید…"
          aria-label="متن پیام"
          disabled={status !== "open"}
          className="input-field py-2 text-sm disabled:bg-dust-grey/50"
        />
        <button
          type="submit"
          disabled={status !== "open" || !draft.trim()}
          className="shrink-0 rounded-lg bg-bondi-blue px-5 py-2 text-sm font-semibold
                     text-white transition-colors hover:bg-bondi-blue-dark disabled:opacity-50"
        >
          ارسال
        </button>
      </form>
    </div>
  );
}

function ChatPlaceholderIcon() {
  return (
    <svg className="h-12 w-12 text-silver" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.5h8M8 14h5m-9 6 3.5-2.5A2 2 0 0 1 10.7 17H17a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v13Z" />
    </svg>
  );
}
