"use client";

/**
 * سربرگ اصلی فروشگاه — search-first به سبک دیجی‌کالا (RTL / فارسی).
 *
 * چیدمان: لوگو (ابتدای راست)، نوار جست‌وجوی بزرگ (مرکز)، ورود/ثبت‌نام و سبد خرید
 * (انتهای چپ). وضعیت ورود از `AuthContext` و تعداد اقلام سبد از `CartContext`.
 */

import Link from "next/link";

import { SearchBar } from "@/components/layout/SearchBar";
import { CategoryMenu } from "@/components/layout/CategoryMenu";
import { MobileDrawerMenu } from "@/components/layout/MobileDrawerMenu";
import { Logo } from "@/components/ui/Logo";
import { IconLink } from "@/components/ui/IconButton";
import { buttonClass } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export function Header() {
  const { isAuthenticated, role } = useAuth();
  const { totalQuantity } = useCart();
  const isStaff = role === "OWNER" || role === "ADMIN";

  return (
    <header dir="rtl" className="sticky top-0 z-40 bg-white shadow-sm">
      {/* ردیف اصلی */}
      <div className="border-b border-silver">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6 lg:px-8">
          {/* همبرگر — فقط موبایل (drawer حساب/مدیریت) */}
          <MobileDrawerMenu className="shrink-0 sm:hidden" />

          <Logo className="shrink-0" />

          {/* جست‌وجو — عنصر اصلی سربرگ (دسکتاپ) */}
          <div className="hidden flex-1 md:block">
            <SearchBar />
          </div>

          {/* اقدامات */}
          <div className="flex items-center gap-2 mr-auto">
            {isAuthenticated ? (
              <>
                {/* لینک پنل مدیریت فقط برای مدیر/مالک (افزون بر حساب کاربری) */}
                {isStaff && (
                  <Link
                    href="/admin/dashboard"
                    className={buttonClass("ghost", "md", "hidden sm:inline-flex")}
                  >
                    پنل مدیریت
                  </Link>
                )}
                {/* حساب کاربری برای همه‌ی کاربران لاگین‌شده (از جمله مدیر) */}
                <Link
                  href="/profile"
                  className={buttonClass("outline", "md", "hidden sm:inline-flex")}
                >
                  حساب کاربری
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className={buttonClass("outline", "md", "hidden sm:inline-flex")}
              >
                ورود | ثبت‌نام
              </Link>
            )}

            {/* جداکننده */}
            <span className="hidden h-7 w-px bg-silver sm:block" aria-hidden />

            <IconLink href="/cart" label="سبد خرید" badge={totalQuantity}>
              <CartIcon className="h-6 w-6" />
            </IconLink>
          </div>
        </div>

        {/* جست‌وجو در موبایل */}
        <div className="px-4 pb-3 md:hidden">
          <SearchBar />
        </div>
      </div>

      {/* نوار دسته‌بندی‌ها */}
      <CategoryMenu />
    </header>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.4c.5 0 .94.34 1.07.83L8.1 16.2a1.5 1.5 0 0 0 1.45 1.1h7.7a1.5 1.5 0 0 0 1.46-1.13l1.6-6.4a1.13 1.13 0 0 0-1.1-1.4H6M9 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm9 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}
