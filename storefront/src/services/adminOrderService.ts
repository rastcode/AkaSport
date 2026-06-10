/**
 * لایه‌ی سرویس مدیریت سفارش‌ها (ADMIN / OWNER).
 *
 * از همان endpointهای واقعی بک‌اند استفاده می‌کند:
 *   - GET /api/orders/history/        → برای staff همه‌ی سفارش‌ها (با ?status= و
 *                                        صفحه‌بندی PageNumberPagination).
 *   - GET /api/orders/history/<id>/   → جزئیات یک سفارش (staff به همه دسترسی دارد).
 *
 * هیچ endpoint جدیدی ساخته نشده است. دسترسی نهایی توسط بک‌اند (is_admin) کنترل
 * می‌شود؛ این لایه فقط داده را می‌خواند.
 */

import api from "@/lib/api";
import type { Order, OrderStatus } from "@/types/order";
import type { AdminOrderQuery, PaginatedOrders } from "@/types/adminOrder";

/**
 * دریافت فهرست سفارش‌ها برای ادمین (صفحه‌بندی‌شده).
 * پاسخ بک‌اند ممکن است آرایه یا envelope صفحه‌بندی باشد؛ هر دو را پوشش می‌دهیم.
 */
export async function getAdminOrders(
  query: AdminOrderQuery = {},
): Promise<PaginatedOrders> {
  const params: Record<string, string | number> = {};
  if (query.status) params.status = query.status;
  if (query.page && query.page > 1) params.page = query.page;

  const { data } = await api.get<PaginatedOrders | Order[]>(
    "/orders/history/",
    { params },
  );

  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return {
    count: data.count ?? data.results.length,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results: data.results ?? [],
  };
}

/** دریافت جزئیات یک سفارش با شناسه (مسیر staff). */
export async function getAdminOrder(orderId: number): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/history/${orderId}/`);
  return data;
}

/**
 * تغییر وضعیت یک سفارش (فقط ADMIN/OWNER).
 *
 * PATCH /api/orders/history/{id}/status/  body: { status }
 * پاسخ، سفارش کامل به‌روزشده است. خطاها (۴۰۳/۴۰۴/۴۰۰) توسط interceptor به
 * `ApiError` نرمال‌سازی می‌شوند و توسط فراخواننده پرتاب می‌شوند.
 */
export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus,
): Promise<Order> {
  const { data } = await api.patch<Order>(
    `/orders/history/${orderId}/status/`,
    { status },
  );
  return data;
}
