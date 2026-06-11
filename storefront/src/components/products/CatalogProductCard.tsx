import Link from "next/link";
import Image from "next/image";

import { resolveMediaUrl } from "@/services/catalogService";
import { Price } from "@/components/ui/Price";
import { DiscountBadge } from "@/components/ui/Badge";
import { ProductImagePlaceholder } from "@/components/products/ProductImagePlaceholder";
import { WishlistButton } from "@/components/products/WishlistButton";
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
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-silver/60
                 bg-white shadow-[0_1px_2px_rgba(43,45,66,0.06)] transition-all duration-300
                 hover:-translate-y-1 hover:border-brand-accent/40 hover:shadow-card"
    >
      {/* دکمه‌ی علاقه‌مندی (بیرون از Link محصول) */}
      <WishlistButton slug={product.slug} className="absolute left-2 top-2 z-20 shadow-sm" />

      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-gradient-to-b from-brand-light to-white"
        aria-label={product.title_fa}
      >
        {/* شکل تزئینی پشت محصول (برای PNGهای بدون بک‌گراند) */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[46%] h-3/5 w-3/5 -translate-x-1/2 -translate-y-1/2
                     rounded-full bg-brand-accent/10 blur-2xl transition-all duration-500
                     group-hover:bg-brand-accent/20"
        />

        {imageUrl ? (
          <Image
            key={imageUrl}
            src={imageUrl}
            alt={product.title_fa}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="relative z-[1] object-contain p-2.5 drop-shadow-[0_6px_10px_rgba(43,45,66,0.18)]
                       transition-transform duration-300 group-hover:scale-105 sm:p-3"
          />
        ) : (
          <ProductImagePlaceholder size="card" />
        )}

        {/* نشان تخفیف */}
        {product.has_discount && (
          <DiscountBadge
            percent={product.discount_percent}
            className="absolute right-2 top-2 z-10 shadow-sm"
          />
        )}

        {/* نشان ناموجود */}
        {!product.in_stock && (
          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-brand-dark/80 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
            ناموجود
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        {product.brand && (
          <p className="mb-1 text-[11px] font-medium text-brand-muted">
            {product.brand.name_fa}
          </p>
        )}

        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-6 text-iron-grey">
          <Link href={`/product/${product.slug}`} className="hover:text-bondi-blue">
            {product.title_fa}
          </Link>
        </h3>

        {product.category && (
          <p className="mt-1 text-[11px] text-brand-muted">{product.category.name_fa}</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <Price
            amount={product.effective_price}
            original={product.has_discount ? product.base_price : null}
            size="md"
          />
          <span
            className={
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold " +
              (product.in_stock
                ? "bg-emerald-50 text-emerald-700"
                : "bg-brand-light text-brand-muted")
            }
          >
            {product.in_stock ? "موجود" : "ناموجود"}
          </span>
        </div>
      </div>
    </article>
  );
}
