/**
 * تایپ‌های کد تخفیف — متناظر با CouponSerializer و CouponValidateView بک‌اند.
 */

export type DiscountType = "PERCENTAGE" | "FIXED";

/** کد تخفیف (نمای ادمین). قیمت‌ها رشته‌اند (DecimalField). */
export interface Coupon {
  id: number;
  code: string;
  discount_type: DiscountType;
  value: string;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  max_uses: number;
  used_count: number;
  min_order_amount: string | null;
  max_discount_amount: string | null;
  created_at: string;
}

/** نتیجه‌ی اعتبارسنجی کد تخفیف برای کاربر. */
export interface CouponValidationResult {
  code: string;
  discount_type: DiscountType;
  value: string;
  discount_amount: string;
  message: string;
}

/** بدنه‌ی ساخت/ویرایش کد تخفیف در ادمین. */
export interface CouponFormData {
  code: string;
  discount_type: DiscountType;
  value: number;
  active?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  max_uses?: number;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
}
