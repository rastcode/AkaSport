"use client";

/**
 * منوی کشویی (drawer) موبایل — همبرگر + پنل تمام‌قد از سمت راست (RTL / فارسی).
 *
 * در موبایل، هدر ساده می‌ماند (همبرگر / لوگو / سبد) و همه‌ی لینک‌های حساب،
 * ورود/ثبت‌نام، سفارش‌ها و مدیریت داخل این drawer قرار می‌گیرند. در دسکتاپ این
 * مؤلفه نمایش داده نمی‌شود.
 *
 * از AuthContext فعلی استفاده می‌کند (user/role/isAuthenticated/isLoading/logout)
 * و هیچ flow احراز هویت یا route جدیدی نمی‌سازد.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export function MobileDrawerMenu({ className }: { className?: string }) {
  const { user, role, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isStaff = role === "OWNER" || role === "ADMIN";

  // بستن با Escape + قفل اسکرول صفحه هنگام باز بودن.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const close = () => setOpen(false);

  function handleLogout() {
    logout();
    close();
    router.push("/");
  }

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();

  return (
    <div className={className}>
      {/* دکمه‌ی همبرگر (فقط موبایل) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="باز کردن منو"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-silver text-blue-slate transition-colors hover:border-bondi-blue hover:text-bondi-blue"
      >
        <HamburgerIcon className="h-6 w-6" />
      </button>

      {/* پس‌زمینه‌ی نیمه‌شفاف */}
      <div
        onClick={close}
        aria-hidden
        className={
          "fixed inset-0 z-[60] bg-black/30 transition-opacity duration-200 " +
          (open ? "opacity-100" : "pointer-events-none opacity-0")
        }
      />

      {/* پنل کشویی از سمت راست */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="منوی حساب کاربری"
        dir="rtl"
        className={
          "fixed right-0 top-0 z-[70] flex h-full w-[82vw] max-w-sm flex-col bg-white shadow-card transition-transform duration-200 ease-out " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        {/* سربرگ drawer */}
        <div className="flex items-start justify-between border-b border-silver px-5 py-4">
          <div>
            <p className="text-lg font-extrabold text-iron-grey">آکامارکت</p>
            <p className="mt-0.5 text-xs text-blue-slate">فروشگاه تخصصی لوازم ورزشی</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="بستن منو"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-slate transition-colors hover:bg-dust-grey hover:text-iron-grey"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* محتوای قابل اسکرول */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-blue-slate">در حال بارگذاری…</p>
          ) : !isAuthenticated ? (
            <div className="space-y-3">
              <Link href="/login" onClick={close} className="btn-primary w-full">
                ورود به حساب
              </Link>
              <Link
                href="/register"
                onClick={close}
                className="flex w-full items-center justify-center rounded-lg border border-silver bg-white px-5 py-3 font-semibold text-iron-grey transition-colors hover:bg-dust-grey"
              >
                ثبت‌نام
              </Link>
              <div className="my-2 border-t border-silver" />
              <DrawerLink href="/cart" onNavigate={close}>سبد خرید</DrawerLink>
              <DrawerLink href="/products" onNavigate={close}>مشاهده‌ی محصولات</DrawerLink>
            </div>
          ) : (
            <div className="space-y-1">
              {/* نمایش کوتاه کاربر */}
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-silver/60 bg-brand-light px-4 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-accent text-sm font-black text-white">
                  {(fullName || "کاربر").slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-iron-grey">
                    {fullName || "کاربر آکامارکت"}
                  </p>
                  {user?.phone_number && (
                    <p className="mt-0.5 text-xs text-blue-slate">{user.phone_number}</p>
                  )}
                </div>
              </div>

              <DrawerLink href="/profile" onNavigate={close}>حساب کاربری</DrawerLink>

              {isStaff ? (
                <DrawerLink href="/cart" onNavigate={close}>سبد خرید</DrawerLink>
              ) : (
                <>
                  <DrawerLink href="/orders" onNavigate={close}>سفارش‌های من</DrawerLink>
                  <DrawerLink href="/profile/wishlist" onNavigate={close}>علاقه‌مندی‌های من</DrawerLink>
                  <DrawerLink href="/cart" onNavigate={close}>سبد خرید</DrawerLink>
                  <DrawerLink href="/products" onNavigate={close}>ادامه‌ی خرید</DrawerLink>
                </>
              )}

              {isStaff && (
                <div className="mt-3">
                  <p className="px-1 pb-1 pt-2 text-xs font-bold text-silver">بخش مدیریت</p>
                  <DrawerLink href="/admin/dashboard" onNavigate={close}>پنل مدیریت</DrawerLink>
                  <DrawerLink href="/admin/orders" onNavigate={close}>مدیریت سفارش‌ها</DrawerLink>
                  <DrawerLink href="/admin/products" onNavigate={close}>مدیریت محصولات</DrawerLink>
                </div>
              )}

              <div className="my-2 border-t border-silver" />
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full rounded-lg px-4 py-3 text-right text-sm font-semibold text-discount transition-colors hover:bg-dust-grey"
              >
                خروج از حساب
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function DrawerLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block rounded-lg px-4 py-3 text-sm font-semibold text-iron-grey transition-colors hover:bg-dust-grey hover:text-bondi-blue"
    >
      {children}
    </Link>
  );
}

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
