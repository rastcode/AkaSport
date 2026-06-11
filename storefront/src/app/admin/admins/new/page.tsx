import Link from "next/link";

import { AdminUserForm } from "@/components/admin/users/AdminUserForm";

export default function NewAdminUserPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-dust-grey/40">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between border-b border-silver pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-iron-grey">ساخت مدیر جدید</h1>
            <p className="mt-1 text-sm text-blue-slate">اطلاعات ورود و سطح دسترسی مدیر را مشخص کنید.</p>
          </div>
          <Link href="/admin/admins" className="text-sm font-semibold text-bondi-blue">بازگشت</Link>
        </header>
        <AdminUserForm />
      </div>
    </main>
  );
}
