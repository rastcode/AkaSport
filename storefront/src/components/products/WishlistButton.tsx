"use client";

/**
 * دکمه‌ی قلب علاقه‌مندی (RTL / فارسی) — Client Component.
 *
 * در کارت محصول و صفحه‌ی جزئیات استفاده می‌شود. برای کاربر لاگین‌نشده پیام ورود
 * نشان می‌دهد و redirect اجباری نمی‌کند. وضعیت از `WishlistContext` می‌آید تا با
 * بقیه‌ی صفحه هماهنگ باشد.
 */

import { useState } from "react";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { cn } from "@/lib/cn";

interface Props {
  slug: string;
  /** نمایش متن کنار قلب (برای صفحه‌ی جزئیات). */
  withLabel?: boolean;
  className?: string;
}

export function WishlistButton({ slug, withLabel = false, className }: Props) {
  const { isAuthenticated } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const [busy, setBusy] = useState(false);
  const [showLoginHint, setShowLoginHint] = useState(false);

  const active = isWishlisted(slug);

  async function handleClick(e: React.MouseEvent) {
    // جلوگیری از رفتن به صفحه‌ی محصول وقتی دکمه داخل کارتِ Link است.
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowLoginHint(true);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await toggle(slug);
    } catch {
      /* بی‌صدا */
    } finally {
      setBusy(false);
    }
  }

  if (withLabel) {
    return (
      <div>
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          aria-pressed={active}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
            active
              ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
              : "border-silver bg-white text-blue-slate hover:border-brand-accent hover:text-brand-accent",
            className,
          )}
        >
          <HeartIcon filled={active} className="h-5 w-5" />
          {active ? "در علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
        </button>
        {showLoginHint && !isAuthenticated && <LoginHint slug={slug} />}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={active}
        aria-label={active ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/90 backdrop-blur-sm transition-colors disabled:opacity-50",
          active
            ? "border-brand-accent text-brand-accent"
            : "border-silver/70 text-brand-muted hover:border-brand-accent hover:text-brand-accent",
          className,
        )}
      >
        <HeartIcon filled={active} className="h-5 w-5" />
      </button>
      {showLoginHint && !isAuthenticated && (
        <div className="absolute right-2 top-12 z-20 w-48 rounded-lg border border-silver bg-white p-2 text-right text-[11px] text-blue-slate shadow-card">
          برای افزودن به علاقه‌مندی‌ها وارد حساب کاربری شوید.{" "}
          <Link href={`/login?next=/product/${slug}`} className="font-semibold text-brand-accent" onClick={(e) => e.stopPropagation()}>
            ورود
          </Link>
        </div>
      )}
    </>
  );
}

function LoginHint({ slug }: { slug: string }) {
  return (
    <p className="mt-2 text-xs text-blue-slate">
      برای افزودن به علاقه‌مندی‌ها{" "}
      <Link href={`/login?next=/product/${slug}`} className="font-semibold text-brand-accent">
        وارد حساب کاربری شوید
      </Link>
      .
    </p>
  );
}

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20s-7-4.35-9.33-8.5C1.1 8.3 2.6 5 5.6 5c1.9 0 3.2 1.1 4.4 2.6C11.2 6.1 12.5 5 14.4 5c3 0 4.5 3.3 2.93 6.5C19 15.65 12 20 12 20Z" />
    </svg>
  );
}
