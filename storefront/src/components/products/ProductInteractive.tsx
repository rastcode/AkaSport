"use client";

/**
 * خوشه‌ی تعاملی صفحه‌ی محصول (RTL / فارسی) — Client Component.
 *
 * وضعیتِ «تنوع انتخاب‌شده» را نگه می‌دارد و آن را بین گالری (برای تصاویر تنوع)،
 * انتخابگر تنوع و جعبه‌ی خرید (برای قیمت/موجودی) به اشتراک می‌گذارد. چیدمان سه‌ستونه
 * در دسکتاپ و تک‌ستونه در موبایل.
 */

import { useMemo, useState } from "react";

import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductInfo } from "@/components/products/ProductInfo";
import { ProductVariantSelector } from "@/components/products/ProductVariantSelector";
import { ProductBuyBox } from "@/components/products/ProductBuyBox";
import type { ProductDetail, ProductVariant } from "@/types/catalog";

export function ProductInteractive({ product }: { product: ProductDetail }) {
  const activeVariants = useMemo(
    () => product.variants.filter((v) => v.is_active),
    [product.variants],
  );

  // تنوع پیش‌فرض: نخستین تنوعِ موجود، در غیر این صورت نخستین تنوع، در غیر این صورت null.
  const initial = useMemo<ProductVariant | null>(() => {
    return (
      activeVariants.find((v) => v.is_in_stock) ?? activeVariants[0] ?? null
    );
  }, [activeVariants]);

  const [selected, setSelected] = useState<ProductVariant | null>(initial);

  const variantImages = selected?.images ?? [];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_320px]">
      {/* ستون تصاویر */}
      <ProductGallery
        images={product.images}
        variantImages={variantImages}
        title={product.title_fa}
      />

      {/* ستون اطلاعات + انتخاب تنوع */}
      <div className="space-y-6">
        <ProductInfo product={product} />
        <ProductVariantSelector
          variants={activeVariants}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      {/* ستون خرید */}
      <ProductBuyBox product={product} selectedVariant={selected} />
    </div>
  );
}
