import { formatToman } from "@/lib/persian";
import type { Order } from "@/types/order";

/**
 * جمع‌بندی مالی سفارش (RTL / فارسی).
 * تخفیف فقط در صورت وجود نمایش داده می‌شود؛ ارسال رایگان به‌صورت متن.
 */
export function OrderTotals({ order }: { order: Order }) {
  const hasDiscount = Number(order.discount_amount) > 0;
  const freeShipping = Number(order.shipping_cost) === 0;

  return (
    <div dir="rtl" className="rounded-xl border border-silver bg-dust-grey p-5">
      <h2 className="mb-4 text-lg font-bold text-iron-grey">جزئیات مبلغ</h2>
      <dl className="space-y-3 text-sm">
        <Row label="جمع کالاها" value={formatToman(order.subtotal)} />
        {hasDiscount && (
          <Row
            label={order.coupon_code ? `تخفیف (${order.coupon_code})` : "تخفیف"}
            value={`− ${formatToman(order.discount_amount)}`}
            accent="text-green-600"
          />
        )}
        <Row
          label="هزینه‌ی ارسال"
          value={freeShipping ? "رایگان" : formatToman(order.shipping_cost)}
        />
      </dl>
      <div className="mt-4 flex items-center justify-between border-t border-silver pt-4">
        <span className="text-base font-bold text-iron-grey">مبلغ نهایی</span>
        <span className="text-lg font-extrabold text-blue-slate">
          {formatToman(order.total_amount)}
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-blue-slate">{label}</dt>
      <dd className={"font-semibold " + (accent ?? "text-iron-grey")}>{value}</dd>
    </div>
  );
}
