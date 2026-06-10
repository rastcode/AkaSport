"use client";

/**
 * نوار جست‌وجوی اصلی سربرگ (search-first، به سبک دیجی‌کالا).
 * با ارسال فرم، کاربر به صفحه‌ی فهرست محصولات با پارامتر جست‌وجو هدایت می‌شود.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/cn";

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={cn(
        "flex w-full items-center gap-2 rounded-full border border-silver/70 bg-brand-light/70 py-1.5 pr-4 pl-1.5 transition-colors focus-within:border-brand-accent/50 focus-within:bg-white",
        className,
      )}
    >
      <SearchIcon className="h-5 w-5 shrink-0 text-brand-muted" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="جست‌وجو در آکامارکت…"
        aria-label="جست‌وجوی محصولات"
        className="w-full bg-transparent text-sm text-iron-grey placeholder:text-brand-muted focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-brand-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-danger"
      >
        جست‌وجو
      </button>
    </form>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
    </svg>
  );
}
