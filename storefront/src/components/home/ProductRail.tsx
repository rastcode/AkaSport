import Link from "next/link";

import { CatalogProductCard } from "@/components/products/CatalogProductCard";
import type { ProductListItem } from "@/types/catalog";

/**
 * ریل/گرید محصولات قابل‌استفاده‌ی مجدد (RTL / فارسی) — Server Component.
 *
 * یک عنوان فارسی، لینک «مشاهده همه» و حداکثر ۸ محصول نمایش می‌دهد. در صورت خالی
 * بودن، پیام فارسی نشان می‌دهد و crash نمی‌کند.
 */
export function ProductRail({
  title,
  viewAllHref,
  products,
  maxItems = 8,
}: {
  title: string;
  viewAllHref: string;
  products: ProductListItem[];
  maxItems?: number;
}) {
  const items = (products ?? []).slice(0, maxItems);

  return (
    <section dir="rtl" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-iron-grey sm:text-2xl">{title}</h2>
        <Link
          href={viewAllHref}
          className="shrink-0 text-sm font-semibold text-bondi-blue hover:text-bondi-blue-dark"
        >
          مشاهده همه ←
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-silver bg-dust-grey/50 p-10 text-center text-sm text-blue-slate">
          فعلاً محصولی برای نمایش وجود ندارد.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <CatalogProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
