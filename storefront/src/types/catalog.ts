/**
 * تایپ‌های دامنه‌ی کاتالوگ — متناظر با Backend Catalog API جدید (`/api/catalog/`).
 *
 * نکته‌ی مهم: قیمت‌ها در پاسخ API به‌صورت رشته (string) برمی‌گردند (DecimalField
 * با decimal_places=0)، پس همه‌ی فیلدهای قیمتی در اینجا `string` هستند، نه number.
 */

/* ------------------------------- پایه‌ها ---------------------------------- */

/** مقدار اسکالرِ JSON در مپ ویژگی‌های پویا. */
export type JsonScalar = string | number | boolean | null;

/** مپ کلید/مقدار برای specifications و attributes تنوع‌ها. */
export type AttributeMap = Record<string, JsonScalar>;

export type ProductStatus = "DRAFT" | "PUBLISHED" | "OUT_OF_STOCK" | "ARCHIVED";

/** پاسخ صفحه‌بندی‌شده‌ی DRF (PageNumberPagination). */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/* ------------------------------ دسته‌بندی --------------------------------- */

export interface Category {
  id: number;
  name_fa: string;
  name_en: string;
  slug: string;
  parent: number | null;
  full_path: string;
  icon: string | null;
  image: string | null;
  is_active: boolean;
  display_order: number;
  dynamic_attributes_schema: Record<string, unknown>;
}

/** گره‌ی بازگشتی درخت دسته‌بندی (خروجی `/categories/tree/`). */
export interface CategoryTreeNode {
  id: number;
  name_fa: string;
  name_en: string;
  slug: string;
  icon: string | null;
  children: CategoryTreeNode[];
}

/* --------------------------- برند / رنگ / سایز ---------------------------- */

export interface Brand {
  id: number;
  name_fa: string;
  name_en: string;
  slug: string;
  logo: string | null;
  description_fa: string;
  is_active: boolean;
}

export interface Color {
  id: number;
  name_fa: string;
  hex_code: string;
  is_active: boolean;
}

export interface Size {
  id: number;
  name_fa: string;
  value: string;
  display_order: number;
}

/* ----------------------------- تصویر / تنوع ------------------------------- */

export interface ProductImage {
  id: number;
  image: string | null;
  alt_text_fa: string;
  is_primary: boolean;
  display_order: number;
  variant: number | null;
}

export interface ProductVariant {
  id: number;
  sku: string;
  color: Color | null;
  size: Size | null;
  attributes: AttributeMap;
  price: string;
  discount_price: string | null;
  effective_price: string;
  stock_quantity: number;
  is_in_stock: boolean;
  is_active: boolean;
  images: ProductImage[];
}

/* ------------------------------- محصول ------------------------------------ */

/** نسخه‌ی فشرده‌ی برند/دسته که در کارت لیست برمی‌گردد. */
export interface CompactRef {
  id: number;
  name_fa: string;
  slug: string;
}

/** آیتم سبک برای صفحات فهرست محصولات. */
export interface ProductListItem {
  id: number;
  title_fa: string;
  slug: string;
  brand: CompactRef | null;
  category: CompactRef | null;
  base_price: string;
  discount_price: string | null;
  effective_price: string;
  discount_percent: number;
  has_discount: boolean;
  status: ProductStatus;
  is_featured: boolean;
  view_count: number;
  in_stock: boolean;
  /** آیا این محصول در علاقه‌مندی‌های کاربرِ درخواست است (در SSR بدون توکن: false). */
  is_wishlisted?: boolean;
  primary_image: string | null;
}

/** نمایش کامل محصول برای صفحه‌ی جزئیات. */
export interface ProductDetail {
  id: number;
  title_fa: string;
  title_en: string;
  slug: string;
  short_description_fa: string;
  description_fa: string;
  brand: Brand | null;
  category: Category | null;
  base_price: string;
  discount_price: string | null;
  effective_price: string;
  discount_percent: number;
  has_discount: boolean;
  status: ProductStatus;
  specifications: AttributeMap;
  effective_schema: Record<string, unknown>;
  seo_title: string;
  seo_description: string;
  view_count: number;
  sold_count: number;
  is_featured: boolean;
  in_stock: boolean;
  /** میانگین امتیاز نظرهای تأییدشده (۱ تا ۵) یا null اگر نظری نیست. */
  average_rating: number | null;
  /** تعداد نظرهای تأییدشده. */
  reviews_count: number;
  /** آیا در علاقه‌مندی‌های کاربرِ درخواست است (در SSR بدون توکن: false). */
  is_wishlisted?: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  /** ممکن است در پاسخ نباشد؛ اختیاری برای سازگاری. */
  primary_image?: string | null;
  created_at: string;
  updated_at: string;
}

/* --------------------------- پارامترهای کوئری ----------------------------- */

export type ProductOrdering =
  | "newest"
  | "cheapest"
  | "most_expensive"
  | "most_viewed"
  | "best_selling"
  | "highest_discount";

/** پارامترهای فیلتر/مرتب‌سازی/صفحه‌بندی فهرست محصولات. */
export interface ProductQueryParams {
  page?: number;
  search?: string;
  /** اسلاگ دسته (tree-aware در بک‌اند). */
  category?: string;
  /** اسلاگ یا شناسه‌ی برند. */
  brand?: string;
  min_price?: number;
  max_price?: number;
  /** شناسه یا نام رنگ. */
  color?: string;
  /** شناسه یا مقدار سایز. */
  size?: string;
  in_stock?: boolean;
  has_discount?: boolean;
  is_featured?: boolean;
  /** فیلتر JSON مشخصات، مثل «وزن:۳۰۰». */
  spec?: string;
  ordering?: ProductOrdering;
}
