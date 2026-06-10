import { formatToman, formatNumber } from "@/lib/persian";
import type { ServerCartItem } from "@/types/cart";

/**
 * خلاصه‌ی سفارش در صفحه‌ی تسویه‌حساب (RTL / فارسی).
 * فهرست اقلام + جمع کل. هزینه‌ی نهایی پس از ثبت سفارش توسط بک‌اند محاسبه می‌شود.
 */
export function OrderSummary({
  items,
  subtotal,
  totalQuantity,
}: {
  items: ServerCartItem[];
  subtotal: number;
  totalQuantity: number;
}) {
  return (
    <div dir="rtl" className="rounded-2xl border border-silver/60 bg-brand-light/70 p-5 lg:sticky lg:top-24">
      <h2 className="mb-4 text-lg font-bold text-iron-grey">خلاصه‌ی سفارش</h2>

      <ul className="mb-4 max-h-56 space-y-2 overflow-y-auto pl-1 text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2">
            <span className="truncate text-blue-slate">
              {item.product_title_fa}
              <span className="text-silver"> ×{formatNumber(item.quantity)}</span>
            </span>
            <span className="shrink-0 font-medium text-iron-grey">
              {formatToman(item.line_total)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="space-y-3 border-t border-silver/70 pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-blue-slate">تعداد اقلام</dt>
          <dd className="font-semibold text-iron-grey">{formatNumber(totalQuantity)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-blue-slate">جمع کالاها</dt>
          <dd className="font-semibold text-iron-grey">{formatToman(subtotal)}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-silver">
        هزینه‌ی ارسال و تخفیف نهایی پس از ثبت سفارش محاسبه می‌شود.
      </p>
    </div>
  );
}
