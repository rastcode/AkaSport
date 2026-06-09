/**
 * Product detail page — Server Component (SSR).
 *
 * Data is fetched on the server so the fully-rendered HTML (title, description,
 * specs) is delivered for SEO and fast first paint. `generateMetadata` pulls
 * per-product SEO tags (title/description/OpenGraph image) from the backend.
 *
 * Interactive bits (gallery, variant selector) are isolated client components.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGallery } from "@/components/catalog/ProductGallery";
import { SpecificationsTable } from "@/components/catalog/SpecificationsTable";
import { VariantSelector } from "@/components/catalog/VariantSelector";
import {
  getProductBySlug,
  resolveMediaUrl,
} from "@/services/productService";

interface PageProps {
  params: { slug: string };
}

/* ------------------------------ SEO metadata ------------------------------- */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    return {
      title: "Product not found — AkaSport",
      description: "The product you’re looking for is unavailable.",
      robots: { index: false, follow: false },
    };
  }

  const primaryImage =
    resolveMediaUrl(
      product.images.find((i) => i.is_primary)?.image ??
        product.images[0]?.image ??
        null,
    ) ?? undefined;

  const description =
    product.description?.slice(0, 160) ||
    `Buy ${product.title}${product.brand ? ` by ${product.brand.name}` : ""} at AkaSport.`;

  return {
    title: `${product.title} — AkaSport`,
    description,
    keywords: [
      product.title,
      product.brand?.name,
      product.category?.name,
      "sports gear",
    ].filter(Boolean) as string[],
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.title,
      description,
      type: "website",
      images: primaryImage ? [{ url: primaryImage, alt: product.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      images: primaryImage ? [primaryImage] : [],
    },
  };
}

/* ------------------------------- the page ---------------------------------- */
export default async function ProductDetailPage({ params }: PageProps) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const jsonLd = buildJsonLd(product);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* JSON-LD structured data for rich search results. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-blue-slate">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-bondi-blue">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/products" className="hover:text-bondi-blue">
              Products
            </Link>
          </li>
          {product.category && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link
                  href={`/products?category=${product.category.slug}`}
                  className="hover:text-bondi-blue"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden>/</li>
          <li className="font-medium text-iron-grey" aria-current="page">
            {product.title}
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <ProductGallery images={product.images} title={product.title} />

        {/* Buy box */}
        <div>
          {product.brand && (
            <Link
              href={`/products?brand=${product.brand.slug}`}
              className="inline-block rounded-full bg-bondi-blue/10 px-3 py-1 text-xs
                         font-semibold uppercase tracking-wide text-bondi-blue-dark
                         hover:bg-bondi-blue/20"
            >
              {product.brand.name}
            </Link>
          )}

          <h1 className="mt-3 text-3xl font-extrabold text-iron-grey sm:text-4xl">
            {product.title}
          </h1>

          {product.description && (
            <p className="mt-4 leading-relaxed text-blue-slate">
              {product.description}
            </p>
          )}

          <hr className="my-6 border-silver" />

          <VariantSelector
            basePrice={product.base_price}
            variants={product.variants}
            productTitle={product.title}
            productSlug={product.slug}
            productImage={
              product.images.find((i) => i.is_primary)?.image ??
              product.images[0]?.image ??
              null
            }
          />
        </div>
      </div>

      {/* Dynamic specifications */}
      <SpecificationsTable
        specifications={product.specifications}
        schema={product.effective_schema}
      />
    </main>
  );
}

/* ------------------------------ JSON-LD helper ----------------------------- */
function buildJsonLd(product: Awaited<ReturnType<typeof getProductBySlug>>) {
  if (!product) return {};
  const image = resolveMediaUrl(
    product.images.find((i) => i.is_primary)?.image ??
      product.images[0]?.image ??
      null,
  );
  const prices = product.variants
    .filter((v) => v.is_active)
    .map((v) => Number(v.final_price));
  const low = prices.length ? Math.min(...prices) : Number(product.base_price);
  const high = prices.length ? Math.max(...prices) : Number(product.base_price);

  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    description: product.description,
    image: image ? [image] : [],
    brand: product.brand
      ? { "@type": "Brand", name: product.brand.name }
      : undefined,
    category: product.category?.name,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: low.toFixed(2),
      highPrice: high.toFixed(2),
      offerCount: product.variants.length || 1,
      availability: product.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}

/** Display-only helper retained for potential future price summaries. */
export const dynamic = "force-dynamic"; // ensure fresh stock on each request
