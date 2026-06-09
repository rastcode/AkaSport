"use client";

/**
 * گالری تصاویر محصول (RTL / فارسی) — Client Component.
 *
 * تصاویر محصول را نشان می‌دهد و اگر تنوع انتخاب‌شده تصویر اختصاصی داشته باشد،
 * آن‌ها را اولویت می‌دهد. در نبود هر تصویری، placeholder فارسی «بدون تصویر»
 * نمایش داده می‌شود و crash نمی‌کند.
 */

import { useState } from "react";
import Image from "next/image";

import { resolveMediaUrl } from "@/services/catalogService";
import type { ProductImage } from "@/types/catalog";

export function ProductGallery({
  images,
  variantImages,
  title,
}: {
  images: ProductImage[];
  variantImages?: ProductImage[];
  title: string;
}) {
  // اولویت با تصاویر تنوع انتخاب‌شده، در غیر این صورت تصاویر محصول.
  const source =
    variantImages && variantImages.length > 0 ? variantImages : images || [];
  const sorted = [...source].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) ||
      a.display_order - b.display_order,
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, Math.max(0, sorted.length - 1));
  const active = sorted[safeIndex];
  const activeUrl = resolveMediaUrl(active?.image ?? null);

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-silver bg-dust-grey/50">
        {activeUrl ? (
          <Image
            src={activeUrl}
            alt={active?.alt_text_fa || title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-silver">
            <span className="text-3xl font-black text-bondi-blue/25">آکا</span>
            <span className="text-sm">بدون تصویر</span>
          </div>
        )}
      </div>

      {sorted.length > 1 && (
        <ul className="flex flex-wrap gap-2" role="list">
          {sorted.map((img, index) => {
            const thumb = resolveMediaUrl(img.image);
            const selected = index === safeIndex;
            return (
              <li key={img.id}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`تصویر ${index + 1}`}
                  aria-current={selected}
                  className={
                    "relative h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors " +
                    (selected
                      ? "border-bondi-blue"
                      : "border-silver hover:border-blue-slate")
                  }
                >
                  {thumb && (
                    <Image
                      src={thumb}
                      alt={img.alt_text_fa || `${title} ${index + 1}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
