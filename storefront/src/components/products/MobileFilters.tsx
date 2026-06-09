"use client";

/**
 * دکمه‌ی «فیلترها» + کشوی (drawer) موبایل که پنل `CatalogFilters` را در خود دارد.
 * فقط در نمایش موبایل دیده می‌شود (در دسکتاپ سایدبار ثابت است).
 */

import { useState } from "react";

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

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost w-full px-4 py-2 text-sm"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        فیلترها
      </button>

      {open && (
        <div
          dir="rtl"
          role="dialog"
          aria-label="فیلتر محصولات"
          className="fixed inset-0 z-50 flex"
        >
          {/* پوشش پس‌زمینه */}
          <button
            type="button"
            aria-label="بستن"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-iron-grey/40"
          />

          {/* پنل کشویی (از سمت راست در RTL) */}
          <div className="relative mr-auto flex h-full w-[85%] max-w-sm flex-col bg-dust-grey/40 shadow-card">
            <div className="flex items-center justify-between border-b border-silver bg-white px-4 py-3">
              <span className="font-bold text-iron-grey">فیلترها</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="بستن"
                className="rounded-lg p-1 text-blue-slate hover:text-bondi-blue"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <CatalogFilters {...props} />
            </div>

            <div className="border-t border-silver bg-white p-3">
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
