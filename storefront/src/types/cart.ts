/**
 * Cart & order type definitions.
 *
 * A `CartLine` carries a display snapshot (title, price, image) so the cart can
 * render for *guest* sessions straight from localStorage without a round-trip.
 * For authenticated sessions the same shape is hydrated from the Django cart.
 */

import type { AttributeMap } from "@/types/product";

/** Minimal metadata captured when adding an item (for guest display). */
export interface CartLineMeta {
  sku: string;
  title: string;
  unitPrice: string; // decimal string, matches backend
  image: string | null;
  attributes?: AttributeMap;
  slug?: string;
}

/** A single cart line, unified across guest (local) and authed (server) modes. */
export interface CartLine extends CartLineMeta {
  variantId: number;
  quantity: number;
  /** Backend CartItem id — present only for authenticated carts. */
  lineId?: number;
  /** Stock cap reported by the backend (authed) for clamping the stepper. */
  availableStock?: number;
}

export interface CartState {
  lines: CartLine[];
  isAuthenticatedCart: boolean;
  isLoading: boolean;
  isSyncing: boolean;
}

export interface CartContextValue extends CartState {
  addToCart: (
    variantId: number,
    quantity: number,
    meta: CartLineMeta,
  ) => Promise<void>;
  removeFromCart: (variantId: number) => Promise<void>;
  updateQuantity: (variantId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  /** Total distinct units across all lines. */
  totalQuantity: number;
  /** Subtotal (sum of line totals) as a number for math/formatting. */
  subtotal: number;
  refresh: () => Promise<void>;
}

/* ------------------------------ backend shapes ----------------------------- */

/** A line as returned by the Django CartSerializer. */
export interface ServerCartItem {
  id: number;
  product_variant: number;
  sku: string;
  product_title: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  available_stock: number;
}

export interface ServerCart {
  id: number;
  user: number;
  items: ServerCartItem[];
  total_quantity: number;
  subtotal: string;
  is_empty: boolean;
  updated_at: string;
}

/* --------------------------------- orders ---------------------------------- */

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "CANCELED";

export interface ShippingAddress {
  province: string; // استان
  city: string; // شهر
  line1: string; // آدرس دقیق
  postal_code: string; // کد پستی
  recipient: string; // نام گیرنده
  phone: string; // شماره تماس
  notes?: string; // یادداشت
  // Backend `validate_shipping_address` requires line1/city/country.
  country: string;
}

export interface OrderItem {
  id: number;
  product_variant: number | null;
  variant_sku: string;
  product_title: string;
  quantity: number;
  price_at_purchase: string;
  line_total: string;
}

export interface Order {
  id: number;
  user: number;
  status: OrderStatus;
  subtotal: string;
  discount_amount: string;
  shipping_cost: string;
  total_amount: string;
  coupon: number | null;
  coupon_code: string | null;
  shipping_address: ShippingAddress | Record<string, unknown>;
  pricing_strategy: string;
  item_count: number;
  items: OrderItem[];
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckoutPayload {
  shipping_address: ShippingAddress;
  coupon_code?: string;
  strategy?: string;
}

/** Normalised checkout/cart error for the UI (Persian-friendly messages). */
export interface CartApiError {
  status: number;
  message: string;
  /** Out-of-stock and other field errors keyed by field name. */
  fieldErrors?: Record<string, string[]>;
  /** Specific stock errors surfaced by the backend `{ "stock": [...] }`. */
  stockErrors?: string[];
}
