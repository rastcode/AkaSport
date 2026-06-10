/**
 * لایه‌ی سرویس سفارش — متصل به Backend Orders API (/api/orders/).
 *
 * از کلاینت axios احراز هویت‌شده‌ی پروژه استفاده می‌کند. توابع سبد در
 * `cartService` هستند؛ این فایل فقط تسویه‌حساب و تاریخچه‌ی سفارش‌هاست.
 */

import api from "@/lib/api";
import { toCartError } from "@/services/cartService";
import type { CheckoutPayload, Order } from "@/types/order";

/** ثبت سفارش؛ Order ساخته‌شده را برمی‌گرداند یا `CartApiError` پرتاب می‌کند. */
export async function postCheckout(payload: CheckoutPayload): Promise<Order> {
  try {
    const { data } = await api.post<Order>("/orders/checkout/", payload);
    return data;
  } catch (error) {
    throw toCartError(error);
  }
}

/** دریافت تاریخچه‌ی سفارش‌های کاربر. */
export async function getOrders(): Promise<Order[]> {
  const { data } = await api.get<{ results?: Order[] } | Order[]>(
    "/orders/history/",
  );
  return Array.isArray(data) ? data : (data.results ?? []);
}

/** دریافت یک سفارش با شناسه. */
export async function getOrder(orderId: number): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/history/${orderId}/`);
  return data;
}
