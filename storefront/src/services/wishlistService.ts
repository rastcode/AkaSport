/**
 * لایه‌ی سرویس علاقه‌مندی‌ها — متصل به endpointهای واقعی کاتالوگ.
 * از کلاینت axios احراز هویت‌شده استفاده می‌کند (همه نیازمند ورود).
 */

import api from "@/lib/api";
import type { PaginatedResponse, ProductListItem } from "@/types/catalog";

/** فهرست محصولات علاقه‌مندیِ کاربر (به‌صورت کارت محصول). */
export async function getWishlist(): Promise<ProductListItem[]> {
  const { data } = await api.get<
    PaginatedResponse<ProductListItem> | ProductListItem[]
  >("/catalog/wishlist/");
  return Array.isArray(data) ? data : data.results;
}

/** افزودن/حذف یک محصول از علاقه‌مندی‌ها (toggle). وضعیت جدید را برمی‌گرداند. */
export async function toggleWishlist(slug: string): Promise<boolean> {
  const { data } = await api.post<{ is_wishlisted: boolean }>(
    "/catalog/wishlist/toggle/",
    { product_slug: slug },
  );
  return data.is_wishlisted;
}

/** حذف صریح یک محصول از علاقه‌مندی‌ها. */
export async function removeFromWishlist(slug: string): Promise<void> {
  await api.delete(`/catalog/wishlist/${encodeURIComponent(slug)}/`);
}
