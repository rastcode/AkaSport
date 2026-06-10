/**
 * تایپ‌های مدیریت سفارش‌ها (پنل ادمین).
 *
 * از همان تایپ `Order` در `types/order.ts` استفاده می‌کنیم؛ تنها پوشش
 * صفحه‌بندی استاندارد DRF (PageNumberPagination) را اضافه می‌کنیم تا metadata
 * صفحه‌بندی بک‌اند حفظ شود و نشکند.
 */

import type { Order, OrderStatus } from "@/types/order";

/** پاسخ صفحه‌بندی‌شده‌ی استاندارد DRF برای فهرست سفارش‌ها. */
export interface PaginatedOrders {
  count: number;
  next: string | null;
  previous: string | null;
  results: Order[];
}

/** پارامترهای دریافت فهرست سفارش‌های ادمین. */
export interface AdminOrderQuery {
  status?: OrderStatus;
  page?: number;
}
