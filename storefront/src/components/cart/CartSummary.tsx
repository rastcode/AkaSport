import Link from "next/link";

import { formatToman, formatNumber } from "@/lib/persian";

/**
 * خلاصه‌ی سبد خرید (RTL / فارسی).
 * تعداد کالاها، جمع کل و دکمه‌ی «ادامه فرایند خرید».
 */
export function CartSummary({
  totalQuantity,
  subtotal,
}: {
  totalQuantity: number;
  subtotal: number;
}) {
  return (
    <div dir="rtl" className="rounded-2xl border border-silver/60 bg-brand-light/70 p-5 lg:sticky lg:top-24">
      <h2 className="mb-4 text-lg font-bold text-iron-grey">خلاصه‌ی سبد خرید</h2>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-blue-slate">تعداد کالاها</dt>
          <dd className="font-semibold text-iron-grey">{formatNumber(totalQuantity)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-blue-slate">جمع کل کالاها</dt>
          <dd className="font-semibold text-iron-grey">{formatToman(subtotal)}</dd>
        </div>
        <p className="text-xs text-blue-slate">
          هزینه‌ی ارسال و تخفیف در مرحله‌ی تسویه‌حساب محاسبه می‌شود.
        </p>
      </dl>

      <div className="mt-5 border-t border-silver/70 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-bold text-iron-grey">مبلغ قابل پرداخت</span>
          <span className="text-lg font-extrabold text-blue-slate">
            {formatToman(subtotal)}
          </span>
        </div>
        <Link href="/checkout" className="btn-primary w-full">
          ادامه فرایند خرید
        </Link>
      </div>
    </div>
  );
}
