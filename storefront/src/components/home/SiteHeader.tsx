"use client";

/**
 * سربرگ فروشگاه (RTL / فارسی).
 *
 * لوگو، ناوبری، و دکمه‌های سبد خرید و حساب کاربری. وضعیت ورود از `AuthContext`
 * و تعداد اقلام سبد از `CartContext` خوانده می‌شود.
 */

import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatNumber } from "@/lib/persian";

export function SiteHeader() {
  const { isAuthenticated, role } = useAuth();
  const { totalQuantity } = useCart();
  const isStaff = role === "OWNER" || role === "ADMIN";

  return (
    <header
      dir="rtl"
      className="sticky top-0 z-40 border-b border-silver bg-white/90 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* لوگو */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-bondi-blue text-sm font-black text-white">
            آکا
          </span>
          <span className="text-lg font-extrabold text-iron-grey">آکاسپورت</span>
        </Link>

        {/* ناوبری */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/products" className="text-sm font-semibold text-blue-slate hover:text-bondi-blue">
            فروشگاه
          </Link>
          <Link href="/products?sort=newest" className="text-sm font-semibold text-blue-slate hover:text-bondi-blue">
            جدیدترین‌ها
          </Link>
          {isStaff && (
            <Link href="/admin/dashboard" className="text-sm font-semibold text-blue-slate hover:text-bondi-blue">
              پنل مدیریت
            </Link>
          )}
        </nav>

        {/* اقدامات */}
        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-silver text-blue-slate transition-colors hover:border-bondi-blue hover:text-bondi-blue"
            aria-label="سبد خرید"
          >
            <CartIcon />
            {totalQuantity > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bondi-blue px-1 text-[10px] font-bold text-white">
                {formatNumber(totalQuantity)}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <Link href="/profile" className="btn-primary px-4 py-2 text-sm">
              حساب من
            </Link>
          ) : (
            <Link href="/login" className="btn-primary px-4 py-2 text-sm">
              ورود / ثبت‌نام
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.4c.5 0 .94.34 1.07.83L8.1 16.2a1.5 1.5 0 0 0 1.45 1.1h7.7a1.5 1.5 0 0 0 1.46-1.13l1.6-6.4a1.13 1.13 0 0 0-1.1-1.4H6M9 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm9 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}
