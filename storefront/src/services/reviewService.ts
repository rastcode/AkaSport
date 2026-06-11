/**
 * لایه‌ی سرویس نظرات محصول — متصل به endpointهای واقعی کاتالوگ.
 *
 * از کلاینت axios احراز هویت‌شده استفاده می‌کند (برای POST نیاز به ورود است).
 * خواندنِ فهرست عمومی است و فقط نظرهای تأییدشده را برمی‌گرداند.
 */

import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/catalog";
import type { ProductReview, ReviewCreatePayload } from "@/types/review";

/** فهرست نظرهای تأییدشده‌ی یک محصول (صفحه‌بندی‌شده). */
export async function getProductReviews(
  slug: string,
  page = 1,
): Promise<PaginatedResponse<ProductReview>> {
  const { data } = await api.get<PaginatedResponse<ProductReview> | ProductReview[]>(
    `/catalog/products/${encodeURIComponent(slug)}/reviews/`,
    { params: page > 1 ? { page } : undefined },
  );
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return data;
}

/** ثبت نظر برای یک محصول (نیازمند ورود). نظر با وضعیت «در انتظار تأیید» ثبت می‌شود. */
export async function createProductReview(
  slug: string,
  payload: ReviewCreatePayload,
): Promise<ProductReview> {
  const { data } = await api.post<ProductReview>(
    `/catalog/products/${encodeURIComponent(slug)}/reviews/`,
    payload,
  );
  return data;
}
