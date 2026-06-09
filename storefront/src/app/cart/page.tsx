"use client";

/**
 * سبد خرید — صفحه‌ی نمایش و ویرایش اقلام انتخاب‌شده (RTL / فارسی).
 *
 * چیدمان چندستونه‌ی راست‌چین: فهرست کالاها در سمت راست و خلاصه‌ی سفارش در
 * سمت چپ. در صورت خالی‌بودن سبد، یک حالت خالی زیبا نمایش داده می‌شود.
 */

import Image from "next/image";
import Link from "next/link";

import { QuantityStepper } from "@/components/catalog/QuantityStepper";
import { useCart } from "@/context/CartContext";
import { resolveMediaUrl } from "@/services/productService";
import { formatToman, formatNumber } from "@/lib/persian";
import type { CartLine } from "@/types/cart";

export default function CartPage() {
  const {
    lines,
    isLoading,
    isSyncing,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalQuantity,
    subtotal,
  } = useCart();

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
      </main>
    );
  }

  if (lines.length === 0) {
    return <EmptyCart />;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
      <header className="mb-6 border-b border-silver pb-5">
        <h1 className="text-3xl font-extrabold text-iron-grey">سبد خرید</h1>
        <p className="mt-1 text-sm text-blue-slate">
          {formatNumber(totalQuantity)} کالا در سبد شما
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* فهرست اقلام */}
        <section aria-label="اقلام سبد خرید">
          <ul className="divide-y divide-silver overflow-hidden rounded-xl border border-silver bg-dust-grey">
            {lines.map((line) => (
              <CartRow
                key={line.variantId}
                line={line}
                onQuantity={(q) => updateQuantity(line.variantId, q)}
                onRemove={() => removeFromCart(line.variantId)}
                busy={isSyncing}
              />
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => clearCart()}
              disabled={isSyncing}
              className="text-sm font-semibold text-blue-slate transition-colors hover:text-red-600 disabled:opacity-50"
            >
              خالی کردن سبد
            </button>
            <Link
              href="/products"
              className="text-sm font-semibold text-bondi-blue hover:text-bondi-blue-dark"
            >
              ← ادامه‌ی خرید
            </Link>
          </div>
        </section>

        {/* خلاصه‌ی سفارش */}
        <aside className="h-fit lg:sticky lg:top-6">
          <div className="rounded-xl border border-silver bg-dust-grey p-5">
            <h2 className="mb-4 text-lg font-bold text-iron-grey">خلاصه‌ی سفارش</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-blue-slate">تعداد اقلام</dt>
                <dd className="font-semibold text-iron-grey">
                  {formatNumber(totalQuantity)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-blue-slate">جمع کل کالاها</dt>
                <dd className="font-semibold text-iron-grey">
                  {formatToman(subtotal)}
                </dd>
              </div>
              <p className="text-xs text-blue-slate">
                هزینه‌ی ارسال و تخفیف در مرحله‌ی تسویه‌حساب محاسبه می‌شود.
              </p>
            </dl>

            <div className="mt-5 border-t border-silver pt-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-base font-bold text-iron-grey">مبلغ قابل پرداخت</span>
                <span className="text-lg font-extrabold text-blue-slate">
                  {formatToman(subtotal)}
                </span>
              </div>
              <Link
                href="/checkout"
                className="btn-primary w-full"
                aria-label="ادامه به تسویه‌حساب"
              >
                ادامه به تسویه‌حساب
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ------------------------------- ردیف کالا --------------------------------- */

function CartRow({
  line,
  onQuantity,
  onRemove,
  busy,
}: {
  line: CartLine;
  onQuantity: (q: number) => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const imageUrl = resolveMediaUrl(line.image ?? null);
  const lineTotal = Number(line.unitPrice || 0) * line.quantity;
  const attrText = line.attributes
    ? Object.values(line.attributes)
        .map((v) => String(v))
        .join(" / ")
    : "";

  return (
    <li className="flex gap-4 bg-white/60 p-4">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-silver bg-dust-grey">
        {imageUrl ? (
          <Image src={imageUrl} alt={line.title} fill sizes="80px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-silver">
            بدون تصویر
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div>
            {line.slug ? (
              <Link
                href={`/product/${line.slug}`}
                className="font-semibold text-iron-grey hover:text-bondi-blue"
              >
                {line.title}
              </Link>
            ) : (
              <span className="font-semibold text-iron-grey">{line.title}</span>
            )}
            {attrText && (
              <p className="mt-0.5 text-xs text-blue-slate">{attrText}</p>
            )}
            <p className="mt-0.5 text-xs text-silver">کد کالا: {line.sku}</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            aria-label={`حذف ${line.title} از سبد`}
            className="text-sm font-medium text-blue-slate transition-colors hover:text-red-600 disabled:opacity-50"
          >
            حذف
          </button>
        </div>

        <div className="mt-auto flex items-end justify-between pt-3">
          <QuantityStepper
            quantity={line.quantity}
            max={line.availableStock}
            onChange={onQuantity}
            disabled={busy}
          />
          <div className="text-left">
            <p className="text-xs text-blue-slate">
              {formatToman(line.unitPrice)} × {formatNumber(line.quantity)}
            </p>
            <p className="font-bold text-blue-slate">{formatToman(lineTotal)}</p>
          </div>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------- حالت خالی --------------------------------- */

function EmptyCart() {
  return (
    <main
      className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center"
      dir="rtl"
    >
      <div className="animate-fade-in-up flex flex-col items-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-dust-grey">
          <svg
            className="h-12 w-12 text-silver"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121 0 2.1-.766 2.37-1.857l1.07-4.286A1.125 1.125 0 0 0 20.97 6.6H5.106M7.5 14.25 5.106 6.6m0 0L4.5 4.5m2.25 15a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm11.25 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
            />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-iron-grey">
          سبد خرید شما خالی است
        </h1>
        <p className="mt-2 max-w-sm text-blue-slate">
          هنوز کالایی به سبد خود اضافه نکرده‌اید. مجموعه‌ی متنوع تجهیزات ورزشی ما
          را ببینید و خرید را آغاز کنید.
        </p>
        <Link href="/products" className="btn-primary mt-8">
          مشاهده‌ی محصولات
        </Link>
      </div>
    </main>
  );
}
