"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { SiteSettingsForm } from "@/components/admin/settings/SiteSettingsForm";
import { useAuth } from "@/context/AuthContext";
import { getAdminSiteSettings } from "@/services/siteSettingsService";
import type { ApiError } from "@/types/auth";
import type { SiteSettings } from "@/types/siteSettings";

export default function AdminSiteSettingsPage() {
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await getAdminSiteSettings());
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || "دریافت تنظیمات سایت ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isStaff) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isStaff, load]);

  if (authLoading || loading) return <CenterSpinner />;
  if (!isStaff) return <Forbidden />;

  return (
    <main dir="rtl" className="min-h-screen bg-dust-grey/40">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-silver pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-iron-grey">
              تنظیمات سایت
            </h1>
            <p className="mt-1 text-sm text-blue-slate">
              مدیریت محتوای فوتر، اطلاعات تماس، شبکه‌های اجتماعی و نمادها.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue"
          >
            ← داشبورد
          </Link>
        </header>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{error}</p>
            <button type="button" onClick={() => void load()} className="mt-2 font-semibold underline">
              تلاش دوباره
            </button>
          </div>
        )}

        {settings && (
          <SiteSettingsForm initial={settings} onSaved={setSettings} />
        )}
      </div>
    </main>
  );
}

function Forbidden() {
  return (
    <main dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-dust-grey/40 px-4 text-center">
      <p className="text-5xl font-black text-silver">۴۰۳</p>
      <h1 className="mt-2 text-xl font-bold text-iron-grey">دسترسی غیرمجاز</h1>
      <p className="mt-1 text-blue-slate">
        این بخش تنها برای مدیران و مالک فروشگاه در دسترس است.
      </p>
      <Link href="/" className="btn-primary mt-6">بازگشت به فروشگاه</Link>
    </main>
  );
}

function CenterSpinner() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
    </main>
  );
}
