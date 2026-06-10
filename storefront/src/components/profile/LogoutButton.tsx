"use client";

/**
 * دکمه‌ی خروج از حساب (RTL / فارسی) — Client Component.
 * از متد logout سیستم auth فعلی پروژه استفاده می‌کند و کاربر را به صفحه‌ی اصلی
 * هدایت می‌کند.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function handleLogout() {
    setPending(true);
    logout();
    router.replace("/");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-silver bg-white px-5 py-2.5 text-sm font-semibold text-blue-slate transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M18 12H9m9 0-3-3m3 3-3 3" />
      </svg>
      {pending ? "در حال خروج…" : "خروج از حساب"}
    </button>
  );
}
