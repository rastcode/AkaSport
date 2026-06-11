"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminUserForm } from "@/components/admin/users/AdminUserForm";
import { getAdminUser } from "@/services/adminUserService";
import type { AdminUser, ApiError } from "@/types/auth";

export default function EditAdminUserPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setError("شناسه مدیر نامعتبر است.");
      return;
    }
    getAdminUser(id)
      .then(setAdmin)
      .catch((caught: ApiError) => setError(caught.message));
  }, [id]);

  return (
    <main dir="rtl" className="min-h-screen bg-dust-grey/40">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between border-b border-silver pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-iron-grey">ویرایش مدیر</h1>
            <p className="mt-1 text-sm text-blue-slate">اطلاعات حساب و سطح دسترسی را به‌روزرسانی کنید.</p>
          </div>
          <Link href="/admin/admins" className="text-sm font-semibold text-bondi-blue">بازگشت</Link>
        </header>
        {error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : admin ? (
          <AdminUserForm admin={admin} />
        ) : (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
          </div>
        )}
      </div>
    </main>
  );
}
