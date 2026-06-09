"use client";

/**
 * Shared, auto-scrolling message list used by both the customer widget and the
 * admin chat center. Bubbles flip alignment/colour based on `mine`.
 */

import { useEffect, useRef } from "react";

import { toPersianDigits } from "@/lib/persian";
import type { ChatDisplayMessage } from "@/types/chat";

function formatTime(iso: string): string {
  try {
    return toPersianDigits(
      new Intl.DateTimeFormat("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso)),
    );
  } catch {
    return "";
  }
}

export function ChatMessageList({
  messages,
  emptyHint = "هنوز پیامی رد و بدل نشده است.",
}: {
  messages: ChatDisplayMessage[];
  emptyHint?: string;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the newest message whenever the list grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-blue-slate">
        {emptyHint}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2 p-4" role="log" aria-live="polite">
      {messages.map((m) => (
        <li
          key={m.key}
          className={"flex " + (m.mine ? "justify-start" : "justify-end")}
        >
          <div
            className={
              "max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm " +
              (m.mine
                ? "rounded-bl-sm bg-bondi-blue text-white"
                : "rounded-br-sm bg-silver text-iron-grey")
            }
          >
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {m.text}
            </p>
            <time
              className={
                "mt-1 block text-[10px] " +
                (m.mine ? "text-white/70" : "text-blue-slate/70")
              }
            >
              {formatTime(m.timestamp)}
            </time>
          </div>
        </li>
      ))}
      <div ref={endRef} />
    </ul>
  );
}
