"use client";

/**
 * داشبورد مدیریت (مالک / ادمین) — RTL / فارسی.
 *
 * شبکه‌ی امن مخصوص نقش‌های OWNER و ADMIN:
 *   - نوار کناری: ناوبری + فهرست اتاق‌های فعال/بدون‌متصدی با نشان وضعیت زنده.
 *   - پنل اصلی: مرکز گفتگوی زنده + بخش ویجت‌های تحلیلی.
 *
 * گارد سمت‌کاربر مکمل middleware است (مرجع نهایی، بک‌اند است).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { AdminChatCenter } from "@/components/admin/AdminChatCenter";
import { AnalyticsCards } from "@/components/admin/AnalyticsCards";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { useAuth } from "@/context/AuthContext";
import { fetchOpenRooms, fetchRooms } from "@/services/chatService";
import { formatNumber, formatPersianDate } from "@/lib/persian";
import type { ChatRoom } from "@/types/chat";

type Tab = "chat" | "analytics";
const ROOM_POLL_MS = 15000;

export default function AdminDashboardPage() {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
      </main>
    );
  }

  // Client-side guard mirroring the middleware (defence in depth).
  if (role !== "OWNER" && role !== "ADMIN") {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen flex-col items-center justify-center bg-dust-grey/40 px-4 text-center"
      >
        <p className="text-5xl font-black text-silver">۴۰۳</p>
        <h1 className="mt-2 text-xl font-bold text-iron-grey">دسترسی غیرمجاز</h1>
        <p className="mt-1 text-blue-slate">
          این بخش تنها برای مدیران و مالک فروشگاه در دسترس است.
        </p>
        <Link href="/" className="btn-primary mt-6">
          بازگشت به فروشگاه
        </Link>
      </main>
    );
  }

  return <DashboardShell userId={user?.id ?? null} isOwner={role === "OWNER"} />;
}

function DashboardShell({
  userId,
  isOwner,
}: {
  userId: number | null;
  isOwner: boolean;
}) {
  const [tab, setTab] = useState<Tab>("chat");
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(true);

  const loadRooms = useCallback(async () => {
    try {
      // Prefer the open/unassigned queue; fall back to all active rooms.
      const [open, active] = await Promise.all([
        fetchOpenRooms(false).catch(() => [] as ChatRoom[]),
        fetchRooms("active").catch(() => [] as ChatRoom[]),
      ]);
      // Merge by id, unassigned first.
      const byId = new Map<number, ChatRoom>();
      [...open, ...active].forEach((r) => byId.set(r.id, r));
      const merged = Array.from(byId.values()).sort(
        (a, b) => Number(a.is_assigned) - Number(b.is_assigned),
      );
      setRooms(merged);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
    const t = setInterval(loadRooms, ROOM_POLL_MS);
    return () => clearInterval(t);
  }, [loadRooms]);

  return (
    <div dir="rtl" className="min-h-screen bg-dust-grey/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        {/* نوار کناری */}
        <aside className="w-full shrink-0 lg:w-72">
          <div className="rounded-xl border border-silver bg-white p-4">
            <h1 className="text-lg font-extrabold text-iron-grey">
              پنل مدیریت
            </h1>
            <p className="mt-0.5 text-xs text-blue-slate">
              {isOwner ? "مالک فروشگاه" : "مدیر فروشگاه"}
            </p>

            {/* ناوبری */}
            <nav className="mt-4 space-y-1">
              <NavButton active={tab === "chat"} onClick={() => setTab("chat")}>
                مرکز گفتگو
              </NavButton>
              <NavButton
                active={tab === "analytics"}
                onClick={() => setTab("analytics")}
              >
                آمار و تحلیل
              </NavButton>
              <Link
                href="/admin/orders"
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-blue-slate transition-colors hover:bg-dust-grey hover:text-iron-grey"
              >
                مدیریت سفارش‌ها
              </Link>
              <Link
                href="/admin/products"
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-blue-slate transition-colors hover:bg-dust-grey hover:text-iron-grey"
              >
                مدیریت محصولات
              </Link>
              <Link
                href="/products"
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-blue-slate transition-colors hover:bg-dust-grey hover:text-iron-grey"
              >
                مشاهده‌ی فروشگاه
              </Link>
              <Link
                href="/profile"
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-blue-slate transition-colors hover:bg-dust-grey hover:text-iron-grey"
              >
                حساب کاربری
              </Link>
            </nav>

            {/* خروج از حساب */}
            <div className="mt-4 border-t border-silver pt-4">
              <LogoutButton />
            </div>

            {/* فهرست اتاق‌های گفتگو */}
            <div className="mt-5 border-t border-silver pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-iron-grey">
                  گفتگوهای فعال
                </h2>
                <span className="rounded-full bg-bondi-blue px-2 py-0.5 text-xs font-bold text-white">
                  {formatNumber(rooms.length)}
                </span>
              </div>

              {roomsLoading ? (
                <RoomsSkeleton />
              ) : rooms.length === 0 ? (
                <p className="py-4 text-center text-xs text-blue-slate">
                  گفتگوی فعالی وجود ندارد.
                </p>
              ) : (
                <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                  {rooms.map((room) => (
                    <RoomItem
                      key={room.id}
                      room={room}
                      active={selectedRoom === room.id}
                      onSelect={() => {
                        setSelectedRoom(room.id);
                        setTab("chat");
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>

        {/* پنل اصلی */}
        <main className="min-w-0 flex-1">
          {tab === "chat" ? (
            <ErrorBoundary label="مرکز گفتگو">
              <div className="h-[calc(100vh-7rem)] min-h-[32rem]">
                <AdminChatCenter roomId={selectedRoom} adminUserId={userId} />
              </div>
            </ErrorBoundary>
          ) : (
            <ErrorBoundary label="آمار و تحلیل">
              <AnalyticsCards />
            </ErrorBoundary>
          )}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------ زیرکامپوننت‌ها ------------------------------ */

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "block w-full rounded-lg px-3 py-2 text-right text-sm font-semibold transition-colors " +
        (active
          ? "bg-bondi-blue text-white"
          : "text-blue-slate hover:bg-dust-grey hover:text-iron-grey")
      }
    >
      {children}
    </button>
  );
}

function RoomItem({
  room,
  active,
  onSelect,
}: {
  room: ChatRoom;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={
          "w-full rounded-lg border p-2.5 text-right transition-colors " +
          (active
            ? "border-bondi-blue bg-bondi-blue/5"
            : "border-silver bg-dust-grey/40 hover:border-bondi-blue")
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-iron-grey">
            مشتری #{formatNumber(room.customer_id)}
          </span>
          {room.is_assigned ? (
            <span className="rounded-full bg-silver px-2 py-0.5 text-[10px] font-bold text-iron-grey">
              در حال پاسخ
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-bondi-blue px-2 py-0.5 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              جدید
            </span>
          )}
        </div>
        {room.last_message ? (
          <p className="mt-1 truncate text-xs text-blue-slate">
            {room.last_message.message}
          </p>
        ) : (
          <p className="mt-1 text-xs text-silver">بدون پیام</p>
        )}
        <p className="mt-1 text-[10px] text-silver">
          {formatPersianDate(room.updated_at)} ·{" "}
          {formatNumber(room.message_count)} پیام
        </p>
      </button>
    </li>
  );
}

function RoomsSkeleton() {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border border-silver bg-dust-grey"
        />
      ))}
    </div>
  );
}
