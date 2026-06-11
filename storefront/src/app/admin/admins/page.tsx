"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getAdminUsers } from "@/services/adminUserService";
import type { AdminUser, ApiError } from "@/types/auth";

const PERMISSION_LABELS: Record<string, string> = {
  can_manage_products: "محصولات",
  can_manage_categories: "دسته‌بندی‌ها",
  can_manage_orders: "سفارش‌ها",
  can_manage_coupons: "تخفیف‌ها",
  can_manage_reviews: "نظرات",
  can_manage_site_settings: "تنظیمات سایت",
  can_view_analytics: "آمار",
  can_manage_chat: "گفت‌وگو",
  can_manage_users: "کاربران",
};

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminUsers()
      .then(setAdmins)
      .catch((caught: ApiError) => setError(caught.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main dir="rtl" className="min-h-screen bg-dust-grey/40">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-silver pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-iron-grey">مدیریت مدیران</h1>
            <p className="mt-1 text-sm text-blue-slate">ساخت حساب مدیر و تعیین دسترسی هر بخش</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/admins/new" className="btn-primary">مدیر جدید</Link>
            <Link href="/admin/dashboard" className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate">
              بازگشت به داشبورد
            </Link>
          </div>
        </header>

        {(searchParams.get("created") || searchParams.get("updated")) && (
          <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            اطلاعات مدیر با موفقیت ذخیره شد.
          </div>
        )}
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
          </div>
        ) : admins.length === 0 ? (
          <div className="rounded-xl border border-silver bg-white p-8 text-center text-blue-slate">
            هنوز حساب مدیری ساخته نشده است.
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => {
              const enabled = Object.entries(admin.permissions)
                .filter(([key, value]) => key.startsWith("can_") && value)
                .map(([key]) => PERMISSION_LABELS[key])
                .filter(Boolean);
              return (
                <article key={admin.id} className="rounded-xl border border-silver bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-iron-grey">
                          {[admin.first_name, admin.last_name].filter(Boolean).join(" ") || "مدیر بدون نام"}
                        </h2>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${admin.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {admin.is_active ? "فعال" : "غیرفعال"}
                        </span>
                      </div>
                      <p dir="ltr" className="mt-1 text-right text-sm text-blue-slate">{admin.phone_number}</p>
                      {admin.email && <p dir="ltr" className="text-right text-sm text-blue-slate">{admin.email}</p>}
                      <p className="mt-3 text-xs text-blue-slate">
                        دسترسی‌ها: {enabled.length ? enabled.join("، ") : "بدون دسترسی مدیریتی"}
                      </p>
                    </div>
                    <Link
                      href={`/admin/admins/${admin.id}`}
                      className="rounded-lg border border-silver px-4 py-2 text-sm font-semibold text-bondi-blue hover:bg-dust-grey"
                    >
                      ویرایش
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
