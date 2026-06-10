/**
 * تایپ‌های سفارش — متناظر با OrderSerializer/OrderItemSerializer بک‌اند جدید.
 * قیمت‌ها به‌صورت رشته (string) برمی‌گردند.
 */

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED";

/** آدرس ارسال (مطابق ورودی checkout بک‌اند). */
export interface ShippingAddress {
  province: string;
  city: string;
  line1: string;
  postal_code?: string;
  notes?: string;
}

/** قلم فریزشده‌ی سفارش (OrderItemSerializer). */
export interface OrderItem {
  id: number;
  product_variant: number | null;
  sku: string;
  product_title_fa: string;
  variant_label: string;
  unit_price: string;
  quantity: number;
  total_price: string;
}

/** سفارش (OrderSerializer). */
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
  receiver_name: string;
  receiver_phone: string;
  item_count: number;
  items: OrderItem[];
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/** بدنه‌ی ثبت سفارش (POST /orders/checkout/). */
export interface CheckoutPayload {
  receiver_name: string;
  receiver_phone: string;
  shipping_address: ShippingAddress;
  coupon_code?: string;
}
