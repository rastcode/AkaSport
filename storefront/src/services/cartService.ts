/**
 * لایه‌ی سرویس سبد خرید — متصل به Backend Cart API (/api/orders/cart/).
 *
 * از کلاینت axios احراز هویت‌شده‌ی پروژه (`@/lib/api`) استفاده می‌کند تا توکن و
 * refresh خودکار اعمال شوند (همان روش auth فعلی پروژه). خطاها به شکل فارسی
 * نرمال‌سازی می‌شوند.
 */

import api from "@/lib/api";
import type { CartApiError, ServerCart } from "@/types/cart";

/** تبدیل خطای axios به `CartApiError` با پیام فارسی. */
export function toCartError(error: unknown): CartApiError {
  const axiosErr = error as {
    response?: { status?: number; data?: Record<string, unknown> };
    code?: string;
  };

  if (!axiosErr?.response) {
    if (axiosErr?.code === "ECONNABORTED") {
      return { status: 0, message: "زمان درخواست به پایان رسید. اتصال خود را بررسی کنید." };
    }
    return { status: 0, message: "ارتباط با سرور برقرار نشد. آیا سرویس فعال است؟" };
  }

  const status = axiosErr.response.status ?? 0;
  const data = axiosErr.response.data ?? {};

  const stockErrors = Array.isArray((data as { stock?: unknown }).stock)
    ? ((data as { stock: unknown[] }).stock as string[])
    : undefined;

  let message = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";
  const fieldErrors: Record<string, string[]> = {};

  if (typeof (data as { detail?: unknown }).detail === "string") {
    message = (data as { detail: string }).detail;
  } else {
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) fieldErrors[key] = value.map(String);
      else if (typeof value === "string") fieldErrors[key] = [value];
    }
    const firstField = Object.values(fieldErrors)[0]?.[0];
    if (stockErrors?.length) {
      message = "موجودی برخی اقلام کافی نیست.";
    } else if (firstField) {
      message = firstField;
    } else if (status === 401) {
      message = "برای ادامه باید وارد حساب کاربری شوید.";
    }
  }

  return {
    status,
    message,
    fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    stockErrors,
  };
}

/** دریافت سبد کاربر لاگین‌شده. */
export async function getCart(): Promise<ServerCart> {
  const { data } = await api.get<ServerCart>("/orders/cart/");
  return data;
}

/** افزودن/تنظیم یک ردیف سبد. `mode: "add"` افزایشی، `mode: "set"` جایگزینی. */
export async function addCartItem(
  productVariantId: number,
  quantity: number,
  mode: "add" | "set" = "add",
): Promise<ServerCart> {
  const { data } = await api.post<ServerCart>("/orders/cart/", {
    product_variant: productVariantId,
    quantity,
    mode,
  });
  return data;
}

/** به‌روزرسانی تعداد یک ردیف با شناسه‌ی CartItem (PATCH). */
export async function updateCartItem(
  itemId: number,
  quantity: number,
): Promise<ServerCart> {
  const { data } = await api.patch<ServerCart>(`/orders/cart/items/${itemId}/`, {
    quantity,
  });
  return data;
}

/** حذف یک ردیف با شناسه‌ی CartItem (DELETE). */
export async function removeCartItem(itemId: number): Promise<ServerCart> {
  const { data } = await api.delete<ServerCart>(`/orders/cart/items/${itemId}/`);
  return data;
}

/** خالی کردن کل سبد. */
export async function clearCart(): Promise<void> {
  await api.delete("/orders/cart/");
}
