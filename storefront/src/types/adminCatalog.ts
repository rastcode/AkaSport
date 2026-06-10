/**
 * تایپ‌های نوشتنِ کاتالوگ ادمین — متناظر با AdminProductWriteSerializer و
 * AdminProductVariantWriteSerializer بک‌اند.
 *
 * قیمت‌ها در مدل `decimal_places=0` (تومان صحیح) هستند؛ هنگام ارسال عدد یا رشته
 * پذیرفته می‌شود. در فرم‌ها عدد می‌فرستیم.
 */

import type { AttributeMap, ProductStatus } from "@/types/catalog";

/** بدنه‌ی ساخت/ویرایش محصول (بدون variants؛ تنوع‌ها جداگانه مدیریت می‌شوند). */
export interface AdminProductWritePayload {
  title_fa: string;
  title_en?: string;
  slug?: string;
  short_description_fa?: string;
  description_fa?: string;
  category: number;
  brand?: number | null;
  base_price: number;
  discount_price?: number | null;
  status?: ProductStatus;
  specifications?: AttributeMap;
  seo_title?: string;
  seo_description?: string;
  is_featured?: boolean;
}

/** بدنه‌ی ساخت/ویرایش یک تنوع محصول. */
export interface AdminVariantWritePayload {
  product?: number;
  sku: string;
  color?: number | null;
  size?: number | null;
  attributes?: AttributeMap;
  price: number;
  discount_price?: number | null;
  stock_quantity: number;
  is_active?: boolean;
}
