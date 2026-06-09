/**
 * Orders / cart API service layer.
 *
 * Wraps the authenticated axios client (`@/lib/api`) so token attach + silent
 * refresh apply automatically. All functions normalise errors into the
 * `CartApiError` shape with Persian-friendly fallbacks.
 */

import api from "@/lib/api";
import type {
  CartApiError,
  CheckoutPayload,
  Order,
  ServerCart,
} from "@/types/cart";

/** Translate an axios error into a Persian-friendly `CartApiError`. */
export function toCartError(error: unknown): CartApiError {
  const fallback: CartApiError = {
    status: 0,
    message: "خطایی رخ داد. لطفاً دوباره تلاش کنید.",
  };

  const axiosErr = error as {
    response?: { status?: number; data?: Record<string, unknown> };
    message?: string;
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

  // Backend checkout stock errors: { "stock": ["SKU: ..."] }
  const stockErrors = Array.isArray((data as { stock?: unknown }).stock)
    ? ((data as { stock: unknown[] }).stock as string[])
    : undefined;

  let message = fallback.message;
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

/* --------------------------------- cart ------------------------------------ */

/** Fetch the authenticated user's server cart. */
export async function fetchServerCart(): Promise<ServerCart> {
  const { data } = await api.get<ServerCart>("/orders/cart/");
  return data;
}

/**
 * Add or set a cart line.
 * `mode: "add"` increments; `mode: "set"` replaces the quantity.
 */
export async function postCartItem(
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

/** Remove a single line by its backend CartItem id. */
export async function deleteCartItem(lineId: number): Promise<ServerCart> {
  const { data } = await api.delete<ServerCart>(`/orders/cart/items/${lineId}/`);
  return data;
}

/** Empty the entire server cart. */
export async function clearServerCart(): Promise<void> {
  await api.delete("/orders/cart/");
}

/* ------------------------------- checkout ---------------------------------- */

/** Execute checkout; returns the created Order or throws a `CartApiError`. */
export async function postCheckout(payload: CheckoutPayload): Promise<Order> {
  try {
    const { data } = await api.post<Order>("/orders/checkout/", payload);
    return data;
  } catch (error) {
    throw toCartError(error);
  }
}

/** Fetch the authenticated user's order history. */
export async function fetchOrderHistory(): Promise<Order[]> {
  const { data } = await api.get<{ results?: Order[] } | Order[]>(
    "/orders/history/",
  );
  return Array.isArray(data) ? data : (data.results ?? []);
}
