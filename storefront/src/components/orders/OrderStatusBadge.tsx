import type { OrderStatus } from "@/types/order";

/**
 * نشان وضعیت سفارش با برچسب فارسی و رنگ‌بندی ملایم.
 */
const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: { label: "در انتظار پرداخت", cls: "bg-amber-50 text-amber-700" },
  PAID: { label: "پرداخت‌شده", cls: "bg-emerald-50 text-emerald-700" },
  PROCESSING: { label: "در حال پردازش", cls: "bg-bondi-blue/10 text-bondi-blue-dark" },
  SHIPPED: { label: "ارسال‌شده", cls: "bg-blue-slate/10 text-blue-slate" },
  DELIVERED: { label: "تحویل‌شده", cls: "bg-emerald-100 text-emerald-800" },
  CANCELED: { label: "لغوشده", cls: "bg-dust-grey text-iron-grey" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-dust-grey text-iron-grey" };
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold " +
        s.cls
      }
    >
      {s.label}
    </span>
  );
}
