/**
 * لایه‌ی سرویس کاتالوگ — متصل به Backend Catalog API جدید (`/api/catalog/`).
 *
 * از `fetch` بومی استفاده می‌کند تا هم در Server Component و هم در Client
 * Component کار کند. خواندن کاتالوگ عمومی است و نیاز به احراز هویت ندارد.
 *
 * این سرویس جایگزینِ رسمیِ `productService` قدیمی (که به /api/products/ و
 * /api/categories/ وصل بود) برای دامنه‌ی کاتالوگ جدید است.
 */

import type {
  Brand,
  Category,
  CategoryTreeNode,
  Color,
  PaginatedResponse,
  ProductDetail,
  ProductListItem,
  ProductQueryParams,
  Size,
} from "@/types/catalog";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";
const MEDIA_BASE = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL || API_BASE.replace(/\/api\/?$/, "")
).replace(/\/+$/, "");

/** مسیر پایه‌ی همه‌ی endpointهای کاتالوگ. */
const CATALOG_BASE = `${API_BASE}/catalog`;

export class CatalogServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CatalogServiceError";
  }
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit & { revalidate?: number },
): Promise<T> {
  const { revalidate, cache, ...rest } = init ?? {};
  // `cache` و `next.revalidate` با هم تناقض دارند؛ اگر caller صراحتاً cache
  // (مثلاً "no-store") داده بود، فقط همان را اعمال می‌کنیم؛ در غیر این صورت از
  // بازاعتبارسنجی زمان‌دار استفاده می‌کنیم.
  const cacheOpts: RequestInit = cache
    ? { cache }
    : { next: { revalidate: revalidate ?? 300 } };
  const res = await fetch(`${CATALOG_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...cacheOpts,
    ...rest,
  });
  if (!res.ok) {
    throw new CatalogServiceError(`درخواست به ${path} ناموفق بود`, res.status);
  }
  return (await res.json()) as T;
}

/** پاسخ‌های فهرستی DRF صفحه‌بندی‌شده‌اند؛ این تابع آن‌ها را به آرایه تبدیل می‌کند. */
function unwrap<T>(data: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

/* --------------------------- ساخت کوئری‌استرینگ --------------------------- */

/** تبدیل `ProductQueryParams` به کوئری‌استرینگ سازگار با بک‌اند کاتالوگ. */
export function buildProductQuery(params: ProductQueryParams = {}): string {
  const q = new URLSearchParams();
  if (params.page && params.page > 1) q.set("page", String(params.page));
  if (params.search) q.set("search", params.search);
  if (params.category) q.set("category", params.category);
  if (params.brand) q.set("brand", params.brand);
  if (typeof params.min_price === "number") q.set("min_price", String(params.min_price));
  if (typeof params.max_price === "number") q.set("max_price", String(params.max_price));
  if (params.color) q.set("color", params.color);
  if (params.size) q.set("size", params.size);
  if (params.in_stock) q.set("in_stock", "true");
  if (params.has_discount) q.set("has_discount", "true");
  if (params.is_featured) q.set("is_featured", "true");
  if (params.spec) q.set("spec", params.spec);
  if (params.ordering) q.set("ordering", params.ordering);
  return q.toString();
}

/* -------------------------------- توابع ---------------------------------- */

/** درخت دسته‌بندی‌ها (برای منوی ناوبری). */
export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  return fetchJson<CategoryTreeNode[]>("/categories/tree/", { revalidate: 3600 });
}

/** فهرست تخت دسته‌بندی‌های فعال. */
export async function getCategories(): Promise<Category[]> {
  const data = await fetchJson<PaginatedResponse<Category> | Category[]>(
    "/categories/",
    { revalidate: 3600 },
  );
  return unwrap(data);
}

/** فهرست برندهای فعال. */
export async function getBrands(): Promise<Brand[]> {
  const data = await fetchJson<PaginatedResponse<Brand> | Brand[]>("/brands/", {
    revalidate: 3600,
  });
  return unwrap(data);
}

/** فهرست رنگ‌ها. */
export async function getColors(): Promise<Color[]> {
  const data = await fetchJson<PaginatedResponse<Color> | Color[]>("/colors/", {
    revalidate: 3600,
  });
  return unwrap(data);
}

/** فهرست سایزها. */
export async function getSizes(): Promise<Size[]> {
  const data = await fetchJson<PaginatedResponse<Size> | Size[]>("/sizes/", {
    revalidate: 3600,
  });
  return unwrap(data);
}

/** فهرست محصولات با فیلتر/مرتب‌سازی/صفحه‌بندی. */
export async function getProducts(
  params: ProductQueryParams = {},
): Promise<PaginatedResponse<ProductListItem>> {
  const query = buildProductQuery(params);
  return fetchJson<PaginatedResponse<ProductListItem>>(
    `/products/${query ? `?${query}` : ""}`,
    { cache: "no-store" },
  );
}

/**
 * دریافت یک محصول با اسلاگ.
 * در صورت 404 مقدار `null` برمی‌گرداند تا فراخوان بدون try/catch خطا را مدیریت کند.
 */
export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  try {
    // همیشه تازه؛ تا پس از حذف/آپلود تصویر، نسخه‌ی کش‌شده‌ی قدیمی سرو نشود.
    return await fetchJson<ProductDetail>(
      `/products/${encodeURIComponent(slug)}/`,
      { cache: "no-store" },
    );
  } catch (error) {
    if (error instanceof CatalogServiceError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** تبدیل مسیر نسبی رسانه به URL مطلق (در صورت نیاز). */
export function resolveMediaUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const mediaPath = `/${url.replace(/^\/+/, "")}`;
  try {
    const mediaBaseUrl = new URL(MEDIA_BASE);
    const basePath = mediaBaseUrl.pathname.replace(/\/+$/, "");
    if (
      basePath &&
      basePath !== "/" &&
      (mediaPath === basePath || mediaPath.startsWith(`${basePath}/`))
    ) {
      return `${mediaBaseUrl.origin}${mediaPath}`;
    }
  } catch {
    // Invalid configuration falls back to a simple, predictable join.
  }

  return `${MEDIA_BASE}${mediaPath}`;
}
