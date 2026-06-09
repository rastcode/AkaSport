"use client";

import Link from "next/link";

import { cn } from "@/lib/cn";
import { toPersianDigits } from "@/lib/persian";

interface BaseProps {
  label: string; // aria-label (Persian)
  children: React.ReactNode; // icon
  badge?: number; // optional count badge (e.g. cart items)
  className?: string;
}

const SHELL =
  "relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-silver text-blue-slate transition-colors hover:border-bondi-blue hover:text-bondi-blue";

/** پیوند آیکنی با شمارنده‌ی اختیاری — برای سبد خرید در سربرگ. */
export function IconLink({
  href,
  label,
  children,
  badge,
  className,
}: BaseProps & { href: string }) {
  return (
    <Link href={href} aria-label={label} className={cn(SHELL, className)}>
      {children}
      {typeof badge === "number" && badge > 0 && <CountBadge value={badge} />}
    </Link>
  );
}

/** دکمه‌ی آیکنی (مثلاً باز کردن منوی موبایل). */
export function IconButton({
  onClick,
  label,
  children,
  badge,
  className,
}: BaseProps & { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(SHELL, className)}
    >
      {children}
      {typeof badge === "number" && badge > 0 && <CountBadge value={badge} />}
    </button>
  );
}

function CountBadge({ value }: { value: number }) {
  return (
    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bondi-blue px-1 text-[10px] font-bold text-white">
      {toPersianDigits(value)}
    </span>
  );
}
