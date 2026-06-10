/**
 * تایپ‌های سبد خرید — متناظر با Backend Orders/Cart API جدید (/api/orders/).
 *
 * سبد فقط سمت سرور است (برای کاربر لاگین‌شده)؛ guest cart با localStorage در این
 * معماری وجود ندارد. قیمت‌ها به‌صورت رشته (string) از API می‌آیند.
 */

/** یک ردیف سبد، مطابق CartSerializer بک‌اند. */
export interface ServerCartItem {
  id: number; // شناسه‌ی CartItem (برای PATCH/DELETE)
  product_variant: number;
  sku: string;
  product_title_fa: string;
  product_slug: string;
  variant_label: string;
  color: string | null;
  size: string | null;
  unit_price: string;
  quantity: number;
  line_total: string;
  available_stock: number;
  image: string | null;
}

/** سبد کامل، مطابق CartSerializer بک‌اند. */
export interface ServerCart {
  id: number;
  user: number;
  items: ServerCartItem[];
  total_quantity: number;
  subtotal: string;
  is_empty: boolean;
  updated_at: string;
}

/** بدنه‌ی افزودن/به‌روزرسانی ردیف سبد (POST /orders/cart/). */
export interface AddCartItemPayload {
  product_variant: number;
  quantity: number;
  mode: "add" | "set";
}

/** خطای نرمال‌شده‌ی سبد/سفارش برای UI (پیام‌های فارسی). */
export interface CartApiError {
  status: number;
  message: string;
  /** خطاهای فیلدی، کلید بر اساس نام فیلد. */
  fieldErrors?: Record<string, string[]>;
  /** خطاهای موجودی که بک‌اند با `{ "stock": [...] }` برمی‌گرداند. */
  stockErrors?: string[];
}

/** مقدار context سبد که از طریق `useCart()` مصرف می‌شود. */
export interface CartContextValue {
  items: ServerCartItem[];
  totalQuantity: number;
  /** جمع کل (subtotal) به‌صورت عدد برای محاسبه/قالب‌بندی. */
  subtotal: number;
  isLoading: boolean;
  isSyncing: boolean;
  /** افزودن به سبد. پارامتر سوم برای سازگاری با فراخوان‌های قدیمی، نادیده گرفته می‌شود. */
  addToCart: (
    variantId: number,
    quantity: number,
    meta?: unknown,
  ) => Promise<void>;
  updateQuantity: (variantId: number, quantity: number) => Promise<void>;
  removeFromCart: (variantId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
}
