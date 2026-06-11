"use client";

/**
 * نوار جست‌وجوی سربرگ با autocomplete زنده (RTL / فارسی) — Client Component.
 *
 * هنگام تایپ (پس از debounce ~۳۰۰ms و حداقل ۲ کاراکتر) پیشنهادهای محصول/دسته/برند
 * را از endpoint عمومی می‌گیرد و در dropdownِ زیر input نشان می‌دهد. با Enter یا
 * دکمه، به فهرست محصولات با پارامتر search می‌رود. هم در دسکتاپ و هم موبایل کار
 * می‌کند و dropdown از کادر بیرون نمی‌زند.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { resolveMediaUrl } from "@/services/catalogService";
import { getSearchSuggestions } from "@/services/searchService";
import { ProductImagePlaceholder } from "@/components/products/ProductImagePlaceholder";
import { formatToman } from "@/lib/persian";
import { cn } from "@/lib/cn";
import type { SearchSuggestions } from "@/types/search";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchSuggestions | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  // پیش‌پر کردن از پارامتر search در URL (در صورت وجود).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = new URLSearchParams(window.location.search).get("search");
    if (s) setQuery(s);
  }, []);

  // debounce + گارد ترتیب درخواست‌ها (نتیجه‌ی قدیمی نتیجه‌ی جدید را overwrite نکند).
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      setData(null);
      setOpen(false);
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    const timer = setTimeout(() => {
      getSearchSuggestions(q)
        .then((res) => {
          if (id !== reqId.current) return;
          setData(res);
          setOpen(true);
        })
        .catch(() => {
          if (id === reqId.current) setData({ products: [], categories: [], brands: [] });
        })
        .finally(() => {
          if (id === reqId.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // بستن با کلیک بیرون + Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function goSearch() {
    const q = query.trim();
    setOpen(false);
    router.push(q ? `/products?search=${encodeURIComponent(q)}` : "/products");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    goSearch();
  }

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  const hasResults =
    !!data && (data.products.length > 0 || data.categories.length > 0 || data.brands.length > 0);

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <form
        onSubmit={onSubmit}
        role="search"
        className="flex w-full items-center gap-2 rounded-full border border-silver/70 bg-brand-light/70 py-1.5 pr-4 pl-1.5 transition-colors focus-within:border-brand-accent/50 focus-within:bg-white"
      >
        <SearchIcon className="h-5 w-5 shrink-0 text-brand-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (hasResults) setOpen(true); }}
          placeholder="جست‌وجو در آکامارکت…"
          aria-label="جست‌وجوی محصولات"
          autoComplete="off"
          className="w-full bg-transparent text-sm text-iron-grey placeholder:text-brand-muted focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-brand-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-danger"
        >
          جست‌وجو
        </button>
      </form>

      {open && query.trim().length >= MIN_CHARS && (
        <div
          dir="rtl"
          className="absolute right-0 left-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-silver bg-white p-2 shadow-card"
        >
          {loading && !hasResults ? (
            <p className="px-3 py-4 text-center text-sm text-blue-slate">در حال جست‌وجو…</p>
          ) : !hasResults ? (
            <p className="px-3 py-4 text-center text-sm text-blue-slate">نتیجه‌ای پیدا نشد.</p>
          ) : (
            <>
              {data!.products.length > 0 && (
                <div className="mb-1">
                  <p className="px-2 pb-1 pt-2 text-[11px] font-bold text-brand-muted">محصولات</p>
                  {data!.products.map((p) => {
                    const url = resolveMediaUrl(p.primary_image);
                    return (
                      <button
                        key={`p-${p.id}`}
                        type="button"
                        onClick={() => navigate(`/product/${encodeURIComponent(p.slug)}`)}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-right transition-colors hover:bg-brand-light"
                      >
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-silver/60 bg-white">
                          {url ? (
                            <Image src={url} alt={p.title_fa} fill sizes="48px" className="object-contain p-1" />
                          ) : (
                            <ProductImagePlaceholder size="thumbnail" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-iron-grey">{p.title_fa}</span>
                          <span className="block text-xs text-brand-muted">
                            {p.brand?.name_fa ? `${p.brand.name_fa} · ` : ""}
                            {formatToman(p.effective_price)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {data!.categories.length > 0 && (
                <div className="mb-1 border-t border-silver/50 pt-1">
                  <p className="px-2 pb-1 pt-2 text-[11px] font-bold text-brand-muted">دسته‌بندی‌ها</p>
                  {data!.categories.map((c) => {
                    const icon = resolveMediaUrl(c.icon) || resolveMediaUrl(c.image);
                    return (
                      <button
                        key={`c-${c.id}`}
                        type="button"
                        onClick={() => navigate(`/products?category=${encodeURIComponent(c.slug)}`)}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-right transition-colors hover:bg-brand-light"
                      >
                        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-silver/60 bg-white">
                          {icon ? (
                            <Image src={icon} alt={c.name_fa} fill sizes="32px" className="object-contain p-0.5" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center bg-brand-light text-xs font-black text-brand-accent/60">{c.name_fa.slice(0, 1)}</span>
                          )}
                        </span>
                        <span className="truncate text-sm font-medium text-iron-grey">{c.full_path || c.name_fa}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {data!.brands.length > 0 && (
                <div className="border-t border-silver/50 pt-1">
                  <p className="px-2 pb-1 pt-2 text-[11px] font-bold text-brand-muted">برندها</p>
                  {data!.brands.map((b) => (
                    <button
                      key={`b-${b.id}`}
                      type="button"
                      onClick={() => navigate(`/products?brand=${encodeURIComponent(b.slug)}`)}
                      className="flex w-full items-center rounded-lg p-2 text-right text-sm font-medium text-iron-grey transition-colors hover:bg-brand-light"
                    >
                      {b.name_fa}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
    </svg>
  );
}
