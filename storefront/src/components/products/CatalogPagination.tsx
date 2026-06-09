import Link from "next/link";

import { productsHref } from "@/components/products/productQuery";
import { formatNumber } from "@/lib/persian";
import type { ProductQueryParams } from "@/types/catalog";

/**
 * صفحه‌بندیِ سمت‌سرور (Server Component) با حفظ همه‌ی query stringهای فعلی.
 * لینک‌های صفحه‌ی قبل/بعد و چند شماره‌ی صفحه را می‌سازد.
 */
export function CatalogPagination({
  filters,
  count,
  pageSize = 20,
}: {
  filters: ProductQueryParams;
  count: number;
  pageSize?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (totalPages <= 1) return null;

  const current = filters.page && filters.page > 1 ? filters.page : 1;
  const pages = buildPageList(current, totalPages);

  return (
    <nav
      dir="rtl"
      aria-label="صفحه‌بندی"
      className="mt-8 flex items-center justify-center gap-1"
    >
      <PageLink
        filters={filters}
        page={current - 1}
        disabled={current <= 1}
        label="صفحه قبل"
      >
        ‹
      </PageLink>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-silver">
            …
          </span>
        ) : (
          <PageLink
            key={p}
            filters={filters}
            page={p}
            active={p === current}
            label={`صفحه ${formatNumber(p)}`}
          >
            {formatNumber(p)}
          </PageLink>
        ),
      )}

      <PageLink
        filters={filters}
        page={current + 1}
        disabled={current >= totalPages}
        label="صفحه بعد"
      >
        ›
      </PageLink>
    </nav>
  );
}

function PageLink({
  filters,
  page,
  children,
  active = false,
  disabled = false,
  label,
}: {
  filters: ProductQueryParams;
  page: number;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const base =
    "flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors";

  if (disabled) {
    return (
      <span
        aria-disabled
        className={`${base} cursor-not-allowed border border-silver bg-white text-silver opacity-50`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={productsHref(filters, { page })}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? `${base} bg-bondi-blue text-white`
          : `${base} border border-silver bg-white text-blue-slate hover:border-bondi-blue hover:text-bondi-blue`
      }
    >
      {children}
    </Link>
  );
}

function buildPageList(current: number, total: number): (number | "…")[] {
  const range: (number | "…")[] = [];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  range.push(1);
  if (left > 2) range.push("…");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push("…");
  if (total > 1) range.push(total);
  return range;
}
