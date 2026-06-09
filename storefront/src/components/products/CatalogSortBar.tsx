"use client";

/**
 * نوار مرتب‌سازی + شمارش نتایج (RTL / فارسی) — Client Component.
 * گزینه‌ها فارسی‌اند و به مقدارهای `ordering` بک‌اند نگاشت می‌شوند.
 */

import { useRouter } from "next/navigation";

import { productsHref } from "@/components/products/productQuery";
import { formatNumber } from "@/lib/persian";
import type { ProductOrdering, ProductQueryParams } from "@/types/catalog";

const ORDERING_LABELS: { value: ProductOrdering; label: string }[] = [
  { value: "newest", label: "جدیدترین" },
  { value: "cheapest", label: "ارزان‌ترین" },
  { value: "most_expensive", label: "گران‌ترین" },
  { value: "most_viewed", label: "پربازدیدترین" },
  { value: "best_selling", label: "پرفروش‌ترین" },
  { value: "highest_discount", label: "بیشترین تخفیف" },
];

export function CatalogSortBar({
  filters,
  count,
}: {
  filters: ProductQueryParams;
  count: number;
}) {
  const router = useRouter();

  function onSort(value: string) {
    const ordering = (value || undefined) as ProductOrdering | undefined;
    router.push(productsHref(filters, { ordering }), { scroll: false });
  }

  return (
    <div
      dir="rtl"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-silver bg-white px-4 py-3"
    >
      <p className="text-sm text-blue-slate">
        {formatNumber(count)} محصول یافت شد
      </p>

      <div className="flex items-center gap-2">
        <label htmlFor="ordering" className="text-sm font-medium text-iron-grey">
          مرتب‌سازی:
        </label>
        <select
          id="ordering"
          className="input-field w-auto py-2"
          value={filters.ordering ?? "newest"}
          onChange={(e) => onSort(e.target.value)}
        >
          {ORDERING_LABELS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
