/**
 * ابزار کمکی ساخت URL برای صفحه‌ی فهرست محصولات.
 *
 * از `buildProductQuery` سرویس کاتالوگ استفاده می‌کند (همان نام‌پارامترهای بک‌اند)
 * تا URL استورفرانت دقیقاً با کوئریِ /api/catalog/products/ یکی باشد و لینک‌ها
 * قابل اشتراک/bookmark بمانند.
 */

import { buildProductQuery } from "@/services/catalogService";
import type { ProductQueryParams } from "@/types/catalog";

/**
 * URL صفحه‌ی محصولات را با اعمال تغییرات (`patch`) روی فیلترهای فعلی می‌سازد.
 * با تغییر هر فیلتر، صفحه به ۱ بازنشانی می‌شود مگر اینکه `patch.page` صریحاً داده شود.
 */
export function productsHref(
  current: ProductQueryParams,
  patch: Partial<ProductQueryParams>,
): string {
  const merged: ProductQueryParams = { ...current, ...patch };
  if (patch.page === undefined) {
    merged.page = undefined;
  }
  const qs = buildProductQuery(merged);
  return qs ? `/products?${qs}` : "/products";
}
