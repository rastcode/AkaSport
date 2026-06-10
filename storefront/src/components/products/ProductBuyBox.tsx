"use client";

/**
 * جعبه‌ی خرید و قیمت (RTL / فارسی) — Client Component.
 *
 * قیمت بر اساس تنوع انتخاب‌شده (یا قیمت محصول در نبود تنوع) نمایش داده می‌شود.
 * دکمه‌ی «افزودن به سبد خرید» به سبد واقعی بک‌اند (CartContext → /api/orders/cart/)
 * وصل است و فقط برای کاربر لاگین‌شده کار می‌کند.
 */

import { useState } from "react";
import Link from "next/link";

import { Price } from "@/components/ui/Price";
import { DiscountBadge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatNumber } from "@/lib/persian";
import type { ProductDetail, ProductVariant } from "@/types/catalog";

type NoticeKind = "success" | "info" | "login";

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
  const { isAuthenticated } = useAuth();
  const { addToCart, isSyncing } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState<{ kind: NoticeKind; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

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

  // آیا محصول تنوع فعال دارد؟ (در این صورت انتخاب تنوع الزامی است)
  const requiresVariant = product.variants.some((v) => v.is_active);

  async function handleAddToCart() {
    setNotice(null);

    if (!isAuthenticated) {
      setNotice({ kind: "login", text: "برای افزودن به سبد ابتدا وارد حساب کاربری شوید." });
      return;
    }
    if (requiresVariant && !selectedVariant) {
      setNotice({ kind: "info", text: "لطفاً رنگ یا سایز موردنظر را انتخاب کنید." });
      return;
    }
    if (!selectedVariant || !selectedVariant.is_in_stock) {
      return;
    }

    setAdding(true);
    try {
      await addToCart(selectedVariant.id, quantity);
      setNotice({ kind: "success", text: "محصول به سبد خرید اضافه شد." });
    } catch {
      setNotice({ kind: "info", text: "افزودن به سبد ناموفق بود. لطفاً دوباره تلاش کنید." });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-silver/60 bg-white p-5 shadow-[0_1px_2px_rgba(43,45,66,0.06)] lg:sticky lg:top-24 lg:shadow-card"
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

      {/* افزودن به سبد خرید (متصل به سبد واقعی) */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!inStock || adding || isSyncing}
        className="btn-primary mt-5 w-full"
      >
        {adding ? "در حال افزودن…" : "افزودن به سبد خرید"}
      </button>

      {notice && (
        <div
          role="status"
          className={
            "mt-3 rounded-lg border px-3 py-2 text-center text-sm " +
            (notice.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : notice.kind === "login"
                ? "border-brand-accent/30 bg-brand-accent/10 text-brand-accent"
                : "border-amber-200 bg-amber-50 text-amber-700")
          }
        >
          <p>{notice.text}</p>
          {notice.kind === "success" && (
            <Link
              href="/cart"
              className="mt-1 inline-block font-semibold text-bondi-blue hover:text-bondi-blue-dark"
            >
              مشاهده سبد خرید ←
            </Link>
          )}
          {notice.kind === "login" && (
            <Link
              href={`/login?next=/product/${product.slug}`}
              className="mt-1 inline-block font-semibold text-bondi-blue hover:text-bondi-blue-dark"
            >
              ورود به حساب کاربری ←
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
