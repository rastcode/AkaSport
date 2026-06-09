"use client";

import { useState } from "react";
import Image from "next/image";

import type { ProductImage } from "@/types/product";
import { resolveMediaUrl } from "@/services/productService";

/** Interactive image gallery with a main image + thumbnail strip. */
export function ProductGallery({
  images,
  title,
}: {
  images: ProductImage[];
  title: string;
}) {
  const sorted = [...images].sort(
    (a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const active = sorted[activeIndex];
  const activeUrl = resolveMediaUrl(active?.image ?? null);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-silver bg-dust-grey">
        {activeUrl ? (
          <Image
            src={activeUrl}
            alt={active?.alt_text || title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-silver">
            No image available
          </div>
        )}
      </div>

      {sorted.length > 1 && (
        <ul className="flex flex-wrap gap-2" role="list">
          {sorted.map((img, index) => {
            const thumbUrl = resolveMediaUrl(img.image);
            const selected = index === activeIndex;
            return (
              <li key={img.id}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`View image ${index + 1}`}
                  aria-current={selected}
                  className={
                    "relative h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors " +
                    (selected ? "border-bondi-blue" : "border-silver hover:border-blue-slate")
                  }
                >
                  {thumbUrl && (
                    <Image
                      src={thumbUrl}
                      alt={img.alt_text || `${title} thumbnail ${index + 1}`}
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
