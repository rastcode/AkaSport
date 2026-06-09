import Link from "next/link";
import Image from "next/image";

import type { ProductListItem } from "@/types/product";
import { resolveMediaUrl } from "@/services/productService";
import { formatPrice } from "@/lib/format";

/**
 * Catalog product card.
 * Palette: dust-grey surface, silver border, bondi-blue action accents.
 */
export function ProductCard({ product }: { product: ProductListItem }) {
  const imageUrl = resolveMediaUrl(product.primary_image);

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-silver
                 bg-dust-grey shadow-sm transition-all duration-200 hover:-translate-y-1
                 hover:shadow-card focus-within:ring-2 focus-within:ring-bondi-blue/40"
    >
      <Link
        href={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-silver/40"
        aria-label={`View ${product.title}`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-silver">
            <span className="text-sm">No image</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.is_featured && (
            <span className="rounded-full bg-bondi-blue px-2.5 py-0.5 text-xs font-semibold text-white shadow">
              Featured
            </span>
          )}
          {!product.in_stock && (
            <span className="rounded-full bg-iron-grey px-2.5 py-0.5 text-xs font-semibold text-white shadow">
              Out of stock
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {product.brand && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-slate">
            {product.brand}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold text-iron-grey">
          <Link
            href={`/product/${product.slug}`}
            className="hover:text-bondi-blue focus:outline-none"
          >
            {product.title}
          </Link>
        </h3>

        <div className="mt-auto flex items-end justify-between pt-3">
          <span className="text-lg font-bold text-blue-slate">
            {formatPrice(product.base_price)}
          </span>
          <Link
            href={`/product/${product.slug}`}
            className="rounded-lg bg-bondi-blue px-3 py-1.5 text-xs font-semibold text-white
                       transition-colors hover:bg-bondi-blue-dark focus:outline-none
                       focus:ring-2 focus:ring-bondi-blue/40"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
