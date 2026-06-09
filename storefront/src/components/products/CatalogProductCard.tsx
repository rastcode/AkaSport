import Link from "next/link";
import Image from "next/image";

import { resolveMediaUrl } from "@/services/catalogService";
import { Price } from "@/components/ui/Price";
import { DiscountBadge } from "@/components/ui/Badge";
import type { ProductListItem } from "@/types/catalog";

/**
 * کارت محصول مخصوص کاتالوگ جدید (RTL / فارسی) — Server Component.
 *
 * داده را از `ProductListItem` کاتالوگ می‌گیرد (نه سرویس legacy). در نبود تصویر،
 * یک placeholder ساده‌ی فارسی نمایش می‌دهد و crash نمی‌کند.
 */
export function CatalogProductCard({ product }: { product: ProductListItem }) {
  const imageUrl = resolveMediaUrl(product.primary_image);

  return (
    <article
      dir="rtl"
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-silver
                 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1
                 hover:shadow-card"
    >
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-dust-grey/60"
        aria-label={product.title_fa}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.title_fa}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-silver">
            <span className="text-2xl font-black text-bondi-blue/30">آکا</span>
            <span className="text-xs">بدون تصویر</span>
          </div>
        )}

        {/* نشان تخفیف */}
        {product.has_discount && (
          <DiscountBadge
            percent={product.discount_percent}
            className="absolute right-2 top-2 shadow"
          />
        )}

        {/* نشان ناموجود */}
        {!product.in_stock && (
          <span className="absolute left-2 top-2 rounded-full bg-iron-grey px-2.5 py-0.5 text-xs font-semibold text-white shadow">
            ناموجود
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {product.brand && (
          <p className="mb-1 text-xs font-medium text-blue-slate">
            {product.brand.name_fa}
          </p>
        )}

        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-iron-grey">
          <Link href={`/product/${product.slug}`} className="hover:text-bondi-blue">
            {product.title_fa}
          </Link>
        </h3>

        {product.category && (
          <p className="mt-1 text-[11px] text-silver">{product.category.name_fa}</p>
        )}

        <div className="mt-auto flex items-end justify-between pt-3">
          <Price
            amount={product.effective_price}
            original={product.has_discount ? product.base_price : null}
            size="md"
          />
          <span
            className={
              "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold " +
              (product.in_stock
                ? "bg-emerald-50 text-emerald-700"
                : "bg-dust-grey text-blue-slate")
            }
          >
            {product.in_stock ? "موجود" : "ناموجود"}
          </span>
        </div>
      </div>
    </article>
  );
}
