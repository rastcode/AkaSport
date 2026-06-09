"use client";

/**
 * پوسته‌ی سراسری فروشگاه — سربرگ و پاورقی را به‌صورت سراسری اعمال می‌کند.
 *
 * این پوسته بر اساس مسیر فعلی تصمیم می‌گیرد:
 *   - در مسیرهای احراز هویت و پنل مدیریت، محتوا بدون پوسته رندر می‌شود
 *     (این صفحات چیدمان مستقل خود را دارند).
 *   - در سایر مسیرها، سربرگ بازارگاهی و پاورقی پیرامون محتوا قرار می‌گیرند.
 */

import { usePathname } from "next/navigation";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const BARE_PREFIXES = ["/admin", "/login", "/register"];

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const isBare = BARE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
