"use client";

/**
 * صفحه‌ی حساب کاربری مشتری (RTL / فارسی) — Client Component.
 *
 * فقط برای کاربر لاگین‌شده. اطلاعات کاربر از سیستم auth فعلی (`useAuth`) خوانده
 * می‌شود؛ هیچ endpoint جدید یا داده‌ی ساختگی استفاده نمی‌شود.
 */

import Link from "next/link";

import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileQuickLinks } from "@/components/profile/ProfileQuickLinks";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user, role, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[55vh] max-w-3xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main
        dir="rtl"
        className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-4 text-center"
      >
        <h1 className="text-2xl font-extrabold text-iron-grey">حساب کاربری</h1>
        <p className="mt-3 text-blue-slate">برای مشاهده حساب کاربری ابتدا وارد شوید.</p>
        <Link href="/login?next=/profile" className="btn-primary mt-6">
          ورود به حساب کاربری
        </Link>
      </main>
    );
  }

  const isStaff = role === "OWNER" || role === "ADMIN";

  return (
    <main dir="rtl" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold text-iron-grey">حساب کاربری</h1>
        <p className="mt-1 text-sm text-blue-slate">مرکز مدیریت حساب و سفارش‌های شما</p>
      </header>

      <div className="space-y-6">
        <ProfileHeader user={user} />
        <ProfileQuickLinks isStaff={isStaff} />

        <div className="flex justify-end border-t border-silver pt-6">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
