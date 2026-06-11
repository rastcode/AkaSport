/**
 * صفحه‌ی فهرست محصولات (RTL / فارسی) — Server Component.
 *
 * فیلترها از searchParams (URL) خوانده می‌شوند و داده‌ها فقط از `catalogService`
 * (/api/catalog/) گرفته می‌شوند. کامپوننت‌های تعاملیِ فیلتر/مرتب‌سازی، URL را
 * به‌روزرسانی می‌کنند تا لینک‌ها قابل اشتراک/bookmark بمانند.
 *
 * تحمل خطا: اگر دریافت محصولات شکست بخورد، حالت خطای فارسی نمایش داده می‌شود و
 * صفحه crash نمی‌کند. سربرگ/پاورقی به‌صورت سراسری توسط SiteChrome اعمال می‌شوند.
 */

import { CatalogFilters } from "@/components/products/CatalogFilters";
import { CatalogSortBar } from "@/components/products/CatalogSortBar";
import { MobileFilters } from "@/components/products/MobileFilters";
import { CatalogPagination } from "@/components/products/CatalogPagination";
import { CatalogProductCard } from "@/components/products/CatalogProductCard";
import {
  getBrands,
  getCategories,
  getColors,
  getProducts,
  getSizes,
} from "@/services/catalogService";
import type {
  Brand,
  Category,
  Color,
  PaginatedResponse,
  ProductListItem,
  ProductOrdering,
  ProductQueryParams,
  Size,
} from "@/types/catalog";

export const dynamic = "force-dynamic"; // وابسته به searchParams و موجودی لحظه‌ای
export const revalidate = 0; // بدون کش؛ تصاویر/داده همیشه تازه

const PAGE_SIZE = 20;
const ORDERINGS: ProductOrdering[] = [
  "newest",
  "cheapest",
  "most_expensive",
  "most_viewed",
  "best_selling",
  "highest_discount",
];

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v !== "" ? v : undefined;
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** searchParams را به مدل فیلترِ نوع‌دار تبدیل می‌کند. */
function parseFilters(sp: RawParams): ProductQueryParams {
  const orderingRaw = one(sp.ordering) as ProductOrdering | undefined;
  return {
    page: toNumber(one(sp.page)),
    search: one(sp.search),
    category: one(sp.category),
    brand: one(sp.brand),
    min_price: toNumber(one(sp.min_price)),
    max_price: toNumber(one(sp.max_price)),
    color: one(sp.color),
    size: one(sp.size),
    in_stock: one(sp.in_stock) === "true" || undefined,
    has_discount: one(sp.has_discount) === "true" || undefined,
    is_featured: one(sp.is_featured) === "true" || undefined,
    ordering:
      orderingRaw && ORDERINGS.includes(orderingRaw) ? orderingRaw : undefined,
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: RawParams;
}) {
  const filters = parseFilters(searchParams);

  // دریافت محصولات + داده‌های مرجع به‌صورت موازی و تحمل‌پذیرِ خطا.
  const [productsRes, categories, brands, colors, sizes] = await Promise.all([
    getProducts(filters).catch(
      () => null as PaginatedResponse<ProductListItem> | null,
    ),
    getCategories().catch(() => [] as Category[]),
    getBrands().catch(() => [] as Brand[]),
    getColors().catch(() => [] as Color[]),
    getSizes().catch(() => [] as Size[]),
  ]);

  const products = productsRes?.results ?? [];
  const count = productsRes?.count ?? 0;
  const hasError = productsRes === null;

  return (
    <main dir="rtl" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* سربرگ صفحه */}
      <header className="mb-6 border-b border-silver pb-5">
        <h1 className="text-2xl font-extrabold text-iron-grey sm:text-3xl">
          محصولات ورزشی
        </h1>
        <p className="mt-1 text-sm text-blue-slate">
          مجموعه‌ی کامل لوازم و پوشاک ورزشی آکامارکت
        </p>
        {filters.search && (
          <p className="mt-2 text-sm font-medium text-bondi-blue-dark">
            نتایج جست‌وجو برای: «{filters.search}»
          </p>
        )}
      </header>

      {/* نوار مرتب‌سازی + دکمه‌ی فیلتر موبایل */}
      <div className="mb-6 space-y-3">
        <CatalogSortBar filters={filters} count={count} />
        <MobileFilters
          filters={filters}
          categories={categories}
          brands={brands}
          colors={colors}
          sizes={sizes}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* سایدبار فیلتر (دسکتاپ) */}
        <aside className="hidden lg:block">
          <div className="lg:sticky lg:top-24">
            <CatalogFilters
              filters={filters}
              categories={categories}
              brands={brands}
              colors={colors}
              sizes={sizes}
            />
          </div>
        </aside>

        {/* نتایج */}
        <section aria-live="polite">
          {hasError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center text-red-700">
              خطا در دریافت محصولات. لطفاً دوباره تلاش کنید.
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-silver bg-dust-grey/50 p-12 text-center">
              <p className="font-semibold text-iron-grey">
                محصولی با این فیلترها پیدا نشد.
              </p>
              <p className="mt-1 text-sm text-blue-slate">
                فیلترها را تغییر دهید یا حذف کنید تا محصولات بیشتری ببینید.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <CatalogProductCard key={product.id} product={product} />
                ))}
              </div>
              <CatalogPagination
                filters={filters}
                count={count}
                pageSize={PAGE_SIZE}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
