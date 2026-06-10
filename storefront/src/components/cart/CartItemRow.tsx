"use client";

/**
 * یک ردیف از سبد خرید (RTL / فارسی) — Client Component.
 * کنترل تعداد (+/−)، حذف، و نمایش اطلاعات کالا.
 */

import Image from "next/image";
import Link from "next/link";

import { resolveMediaUrl } from "@/services/catalogService";
import { ProductImagePlaceholder } from "@/components/products/ProductImagePlaceholder";
import { formatToman, formatNumber } from "@/lib/persian";
import type { ServerCartItem } from "@/types/cart";

export function CartItemRow({
  item,
  busy,
  onChangeQuantity,
  onRemove,
}: {
  item: ServerCartItem;
  busy: boolean;
  onChangeQuantity: (variantId: number, quantity: number) => void;
  onRemove: (variantId: number) => void;
}) {
  const imageUrl = resolveMediaUrl(item.image);
  const canDecrease = !busy && item.quantity > 1;
  const canIncrease = !busy && item.quantity < item.available_stock;

  return (
    <li className="flex gap-4 bg-white/60 p-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-silver/60">
        {imageUrl ? (
          <Image src={imageUrl} alt={item.product_title_fa} fill sizes="80px" className="object-cover" />
        ) : (
          <ProductImagePlaceholder size="thumbnail" />
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/product/${item.product_slug}`}
              className="font-semibold text-iron-grey hover:text-bondi-blue"
            >
              {item.product_title_fa}
            </Link>
            {item.variant_label && (
              <p className="mt-0.5 text-xs text-blue-slate">{item.variant_label}</p>
            )}
            <p className="mt-0.5 text-xs text-silver">کد کالا: {item.sku}</p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.product_variant)}
            disabled={busy}
            aria-label={`حذف ${item.product_title_fa}`}
            className="shrink-0 text-sm font-medium text-blue-slate transition-colors hover:text-red-600 disabled:opacity-50"
          >
            حذف
          </button>
        </div>

        <div className="mt-auto flex items-end justify-between pt-3">
          <div className="inline-flex items-center rounded-lg border border-silver bg-white">
            <button
              type="button"
              onClick={() => onChangeQuantity(item.product_variant, item.quantity - 1)}
              disabled={!canDecrease}
              aria-label="کاهش تعداد"
              className="px-3 py-1.5 text-lg text-blue-slate hover:text-bondi-blue disabled:opacity-40"
            >
              −
            </button>
            <span className="w-10 text-center font-semibold text-iron-grey">
              {formatNumber(item.quantity)}
            </span>
            <button
              type="button"
              onClick={() => onChangeQuantity(item.product_variant, item.quantity + 1)}
              disabled={!canIncrease}
              aria-label="افزایش تعداد"
              className="px-3 py-1.5 text-lg text-blue-slate hover:text-bondi-blue disabled:opacity-40"
            >
              +
            </button>
          </div>

          <div className="text-left">
            <p className="text-xs text-blue-slate">
              {formatToman(item.unit_price)} × {formatNumber(item.quantity)}
            </p>
            <p className="font-bold text-blue-slate">{formatToman(item.line_total)}</p>
          </div>
        </div>

        {item.available_stock <= 3 && (
          <p className="mt-2 text-xs font-medium text-amber-600">
            تنها {formatNumber(item.available_stock)} عدد در انبار باقی مانده
          </p>
        )}
      </div>
    </li>
  );
}
