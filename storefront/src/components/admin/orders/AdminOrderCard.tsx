import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { formatToman, formatNumber, formatPersianDate } from "@/lib/persian";
import type { Order } from "@/types/order";

/** خواندن امن یک فیلد از آدرس (که ممکن است شیء آزاد باشد). */
function addr(value: Order["shipping_address"], key: string): string | undefined {
  if (value && typeof value === "object") {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

/**
 * کارت یک سفارش در فهرست مدیریت سفارش‌ها (RTL / فارسی).
 *
 * در موبایل به‌صورت کارت (نه جدول سنگین) و در دسکتاپ شبکه‌ای فشرده نمایش می‌یابد.
 * نام مشتری در بک‌اند موجود نیست (فقط شناسه‌ی کاربر برمی‌گردد)، پس شناسه‌ی کاربر
 * به‌همراه نام و شماره‌ی گیرنده نمایش داده می‌شود.
 */
export function AdminOrderCard({ order }: { order: Order }) {
  const province = addr(order.shipping_address, "province");
  const city = addr(order.shipping_address, "city");
  const location = [province, city].filter(Boolean).join("، ");

  return (
    <article
      dir="rtl"
      className="rounded-xl border border-silver bg-white p-5 transition-shadow hover:shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dust-grey pb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-iron-grey">
            سفارش #{formatNumber(order.id)}
          </span>
          <OrderStatusBadge status={order.status} />
        </div>
        <span className="text-xs text-blue-slate">
          {formatPersianDate(order.created_at)}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
        <Cell label="مشتری" value={`کاربر #${formatNumber(order.user)}`} />
        <Cell label="گیرنده" value={order.receiver_name || "—"} />
        <Cell label="شماره گیرنده" value={order.receiver_phone || "—"} />
        <Cell label="مقصد" value={location || "—"} />
        <Cell label="تعداد اقلام" value={`${formatNumber(order.item_count)} عدد`} />
        <Cell label="مبلغ نهایی" value={formatToman(order.total_amount)} strong />
      </dl>

      <div className="mt-4 flex justify-end">
        <Link
          href={`/admin/orders/${order.id}`}
          className="rounded-lg bg-bondi-blue px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-bondi-blue-dark"
        >
          مشاهده جزئیات
        </Link>
      </div>
    </article>
  );
}

function Cell({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-silver">{label}</dt>
      <dd
        className={
          "mt-0.5 truncate " +
          (strong ? "font-bold text-blue-slate" : "text-iron-grey")
        }
      >
        {value}
      </dd>
    </div>
  );
}
