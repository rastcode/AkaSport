"use client";

/**
 * دکمه‌ی «فیلترها» + کشوی (drawer) موبایل که پنل `CatalogFilters` را در خود دارد.
 * فقط در نمایش موبایل دیده می‌شود (در دسکتاپ سایدبار ثابت است).
 */

import { useEffect, useState } from "react";

import { CatalogFilters } from "@/components/products/CatalogFilters";
import type {
  Brand,
  Category,
  Color,
  ProductQueryParams,
  Size,
} from "@/types/catalog";

interface Props {
  filters: ProductQueryParams;
  categories: Category[];
  brands: Brand[];
  colors: Color[];
  sizes: Size[];
}

export function MobileFilters(props: Props) {
  const [open, setOpen] = useState(false);

  // بستن با Escape + قفل اسکرول صفحه هنگام باز بودن.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost w-full px-4 py-2.5 text-sm"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        فیلترها
      </button>

      {open && (
        <div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="فیلتر محصولات"
          className="fixed inset-0 z-[60] flex"
        >
          {/* پوشش پس‌زمینه */}
          <button
            type="button"
            aria-label="بستن"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-brand-dark/40"
          />

          {/* پنل کشویی (از سمت راست در RTL) */}
          <div className="relative mr-auto flex h-full w-[85%] max-w-sm flex-col bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-silver/70 px-4 py-3.5">
              <span className="text-base font-bold text-iron-grey">فیلتر محصولات</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-slate transition-colors hover:bg-brand-light hover:text-iron-grey"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-light/40 p-3">
              <CatalogFilters {...props} variant="mobile" />
            </div>

            <div className="border-t border-silver/70 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_-8px_rgba(43,45,66,0.3)]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-primary w-full"
              >
                نمایش نتایج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
