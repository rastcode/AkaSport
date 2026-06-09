"use client";

/**
 * جعبه‌ی خرید و قیمت (RTL / فارسی) — Client Component.
 *
 * قیمت بر اساس تنوع انتخاب‌شده (یا قیمت محصول در نبود تنوع) نمایش داده می‌شود.
 * چون سرویس سبد خرید بک‌اند هنوز آماده نیست، دکمه‌ی «افزودن به سبد خرید» فقط
 * یک پیام فارسی نشان می‌دهد و به بک‌اند وصل نیست.
 */

import { useState } from "react";

import { Price } from "@/components/ui/Price";
import { DiscountBadge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/persian";
import type { ProductDetail, ProductVariant } from "@/types/catalog";

function discountPercent(price: string, discount: string | null): number {
  const p = Number(price);
  const d = discount === null ? p : Number(discount);
  if (!Number.isFinite(p) || p <= 0 || d >= p) return 0;
  return Math.round((1 - d / p) * 100);
}

export function ProductBuyBox({
  product,
  selectedVariant,
}: {
  product: ProductDetail;
  selectedVariant: ProductVariant | null;
}) {
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  // قیمت/موجودی بر اساس تنوع انتخاب‌شده یا خود محصول.
  const basePrice = selectedVariant ? selectedVariant.price : product.base_price;
  const effectivePrice = selectedVariant
    ? selectedVariant.effective_price
    : product.effective_price;
  const hasDiscount = Number(effectivePrice) < Number(basePrice);
  const percent = discountPercent(basePrice, hasDiscount ? effectivePrice : null);

  const inStock = selectedVariant ? selectedVariant.is_in_stock : product.in_stock;
  const maxQty = selectedVariant?.stock_quantity ?? 0;
  const lowStock = inStock && maxQty > 0 && maxQty <= 3;

  function handleAddToCart() {
    // سبد خرید واقعی در مرحله‌ی بعد فعال می‌شود؛ فعلاً فقط پیام نمایش می‌دهیم.
    setNotice("سبد خرید در مرحله بعد فعال می‌شود.");
  }

  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-silver bg-white p-5 lg:sticky lg:top-24"
    >
      {/* قیمت + نشان تخفیف */}
      <div className="flex items-start justify-between gap-2">
        <Price
          amount={effectivePrice}
          original={hasDiscount ? basePrice : null}
          size="lg"
        />
        {hasDiscount && percent > 0 && <DiscountBadge percent={percent} />}
      </div>

      {/* وضعیت موجودی */}
      <div className="mt-4">
        {inStock ? (
          <p
            className={
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold " +
              (lowStock
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700")
            }
          >
            <span
              className={
                "h-2 w-2 rounded-full " +
                (lowStock ? "bg-amber-500" : "bg-emerald-500")
              }
              aria-hidden
            />
            {lowStock
              ? `تنها ${formatNumber(maxQty)} عدد باقی مانده`
              : "موجود در انبار"}
          </p>
        ) : (
          <p className="inline-flex rounded-lg bg-dust-grey px-3 py-1.5 text-sm font-semibold text-blue-slate">
            ناموجود
          </p>
        )}
      </div>

      {/* انتخاب تعداد */}
      {inStock && (
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm text-blue-slate">تعداد</span>
          <div className="flex items-center rounded-lg border border-silver">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="کاهش تعداد"
              className="px-3 py-2 text-lg text-blue-slate hover:text-bondi-blue disabled:opacity-40"
            >
              −
            </button>
            <span className="w-10 text-center font-semibold text-iron-grey" aria-live="polite">
              {formatNumber(quantity)}
            </span>
            <button
              type="button"
              onClick={() =>
                setQuantity((q) => (maxQty ? Math.min(maxQty, q + 1) : q + 1))
              }
              disabled={Boolean(maxQty) && quantity >= maxQty}
              aria-label="افزایش تعداد"
              className="px-3 py-2 text-lg text-blue-slate hover:text-bondi-blue disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* افزودن به سبد (فعلاً فقط UI) */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!inStock}
        className="btn-primary mt-5 w-full"
      >
        افزودن به سبد خرید
      </button>

      {notice && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-bondi-blue/30 bg-bondi-blue/10 px-3 py-2 text-center text-sm text-bondi-blue-dark"
        >
          {notice}
        </p>
      )}
    </div>
  );
}
