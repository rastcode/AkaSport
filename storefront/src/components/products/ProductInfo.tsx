import Link from "next/link";

import { formatNumber } from "@/lib/persian";
import type { ProductDetail } from "@/types/catalog";

/**
 * اطلاعات اصلی محصول (RTL / فارسی).
 * عنوان، برند و دسته‌ی لینک‌دار، شمارش بازدید/فروش و توضیح کوتاه.
 */
export function ProductInfo({ product }: { product: ProductDetail }) {
  return (
    <div dir="rtl">
      {/* برند */}
      {product.brand && (
        <Link
          href={`/products?brand=${encodeURIComponent(product.brand.slug)}`}
          className="inline-block rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold text-brand-accent hover:bg-brand-accent/20"
        >
          {product.brand.name_fa}
        </Link>
      )}

      <h1 className="mt-3 text-2xl font-extrabold leading-snug text-iron-grey sm:text-3xl">
        {product.title_fa}
      </h1>

      {/* دسته‌بندی */}
      {product.category && (
        <p className="mt-2 text-sm text-blue-slate">
          دسته‌بندی:{" "}
          <Link
            href={`/products?category=${encodeURIComponent(product.category.slug)}`}
            className="font-medium text-bondi-blue hover:text-bondi-blue-dark"
          >
            {product.category.name_fa}
          </Link>
        </p>
      )}

      {/* آمار */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-silver">
        <span>{formatNumber(product.view_count)} بازدید</span>
        {typeof product.sold_count === "number" && product.sold_count > 0 && (
          <span>{formatNumber(product.sold_count)} فروش</span>
        )}
      </div>

      {/* توضیح کوتاه */}
      {product.short_description_fa && (
        <p className="mt-4 leading-relaxed text-blue-slate">
          {product.short_description_fa}
        </p>
      )}
    </div>
  );
}
