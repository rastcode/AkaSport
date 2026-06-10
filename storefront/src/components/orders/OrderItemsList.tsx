import { formatToman, formatNumber } from "@/lib/persian";
import type { OrderItem } from "@/types/order";

/**
 * فهرست اقلام سفارش به‌صورت کارت/لیست (نه جدول سنگین) — مناسب موبایل (RTL).
 * چون قلم سفارش `product_slug` ندارد، به محصول لینک داده نمی‌شود.
 */
export function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <section dir="rtl" aria-label="اقلام سفارش">
      <h2 className="mb-3 text-lg font-bold text-iron-grey">اقلام سفارش</h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-silver bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-iron-grey">{item.product_title_fa}</p>
                {item.variant_label && (
                  <p className="mt-0.5 text-xs text-blue-slate">{item.variant_label}</p>
                )}
                <p className="mt-0.5 text-xs text-silver">کد کالا: {item.sku}</p>
              </div>
              <p className="shrink-0 font-bold text-blue-slate">
                {formatToman(item.total_price)}
              </p>
            </div>
            <p className="mt-2 text-xs text-blue-slate">
              {formatToman(item.unit_price)} × {formatNumber(item.quantity)} عدد
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
