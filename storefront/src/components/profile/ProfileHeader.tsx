import { toPersianDigits } from "@/lib/persian";
import type { User, UserRole } from "@/types/auth";

/**
 * سربرگ حساب کاربری (RTL / فارسی).
 * نام، شماره موبایل، ایمیل و نقش کاربر را با برچسب فارسی نشان می‌دهد.
 */

const ROLE_FA: Record<UserRole, string> = {
  OWNER: "مالک فروشگاه",
  ADMIN: "مدیر",
  CUSTOMER: "مشتری",
};

export function ProfileHeader({ user }: { user: User }) {
  const fullName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    "کاربر آکامارکت";
  const initial = fullName.slice(0, 1);

  return (
    <section
      dir="rtl"
      className="flex flex-col items-center gap-4 rounded-2xl border border-silver/60 bg-gradient-to-bl from-brand-light to-white p-6 text-center sm:flex-row sm:text-right"
    >
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-accent text-2xl font-black text-white shadow-sm">
        {initial}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <h1 className="text-xl font-extrabold text-iron-grey">{fullName}</h1>
          <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-blue-slate">
            {ROLE_FA[user.role] ?? "مشتری"}
          </span>
        </div>

        <dl className="mt-2 space-y-1 text-sm text-blue-slate">
          {user.phone_number && (
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <dt className="text-silver">شماره موبایل:</dt>
              <dd className="font-medium text-iron-grey">
                {toPersianDigits(user.phone_number)}
              </dd>
            </div>
          )}
          {user.email && (
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <dt className="text-silver">ایمیل:</dt>
              <dd className="font-medium text-iron-grey">{user.email}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}
