/**
 * لایه‌ی سرویس کد تخفیف — متصل به endpointهای واقعی orders.
 * اعتبارسنجی کاربر + CRUD ادمین. از کلاینت axios احراز هویت‌شده استفاده می‌کند.
 *
 * نکته: interceptor در `@/lib/api` خطاها را پیش‌تر به `ApiError` (شامل fieldErrors)
 * نرمال‌سازی می‌کند، پس همان خطا مستقیماً propagate می‌شود.
 */

import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/catalog";
import type { Coupon, CouponFormData, CouponValidationResult } from "@/types/coupon";

const ADMIN = "/orders/admin/coupons";

/** اعتبارسنجی کد تخفیف برای کاربر بر اساس subtotal سبد. */
export async function validateCoupon(
  code: string,
  subtotal: number,
): Promise<CouponValidationResult> {
  const { data } = await api.post<CouponValidationResult>(
    "/orders/coupons/validate/",
    { code, subtotal: String(subtotal) },
  );
  return data;
}

/* ------------------------------ ادمین ------------------------------ */

export async function listCoupons(
  statusFilter?: "active" | "inactive" | "expired",
): Promise<Coupon[]> {
  const { data } = await api.get<PaginatedResponse<Coupon> | Coupon[]>(
    `${ADMIN}/`,
    { params: statusFilter ? { status: statusFilter } : undefined },
  );
  return Array.isArray(data) ? data : data.results;
}

export async function createCoupon(payload: CouponFormData): Promise<Coupon> {
  const { data } = await api.post<Coupon>(`${ADMIN}/`, payload);
  return data;
}

export async function updateCoupon(
  id: number,
  payload: Partial<CouponFormData>,
): Promise<Coupon> {
  const { data } = await api.patch<Coupon>(`${ADMIN}/${id}/`, payload);
  return data;
}

export async function deleteCoupon(id: number): Promise<void> {
  await api.delete(`${ADMIN}/${id}/`);
}
