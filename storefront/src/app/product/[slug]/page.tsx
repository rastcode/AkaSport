/**
 * صفحه‌ی جزئیات محصول (RTL / فارسی) — Server Component.
 *
 * داده فقط از `catalogService.getProductBySlug` (/api/catalog/products/{slug}/)
 * گرفته می‌شود. خوشه‌ی تعاملی (گالری/انتخاب تنوع/جعبه‌ی خرید) Client است؛ بقیه
 * سمت سرور رندر می‌شوند. `generateMetadata` از داده‌ی واقعی محصول استفاده می‌کند.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductInteractive } from "@/components/products/ProductInteractive";
import { ProductSpecifications } from "@/components/products/ProductSpecifications";
import { ProductReviews } from "@/components/products/ProductReviews";
import {
  serializeJsonLd,
  toAbsoluteUrl,
} from "@/lib/seo";
import { getProductBySlug, resolveMediaUrl } from "@/services/catalogService";
import type { ProductDetail } from "@/types/catalog";

export const dynamic = "force-dynamic"; // موجودی و بازدید لحظه‌ای
export const revalidate = 0; // بدون کش؛ تصاویر/داده همیشه تازه

interface PageProps {
  params: { slug: string };
}

function getProductDescription(product: ProductDetail): string {
  const description =
    product.seo_description ||
    product.short_description_fa ||
    product.description_fa;

  if (description) return description.slice(0, 160);

  const context = product.brand?.name_fa || product.category?.name_fa;
  return `خرید ${product.title_fa} از آکامارکت${context ? `، ${context}` : ""}.`;
}

function getProductImage(product: ProductDetail): string | undefined {
  const image = resolveMediaUrl(
    product.primary_image ??
      product.images.find((item) => item.is_primary)?.image ??
      product.images[0]?.image ??
      null,
  );
  return image ? toAbsoluteUrl(image) : undefined;
}

function tomanToRial(price: string): string | undefined {
  const normalized = price.trim();
  if (!/^\d+$/.test(normalized)) return undefined;
  return (BigInt(normalized) * BigInt(10)).toString();
}

/* ------------------------------ متادیتای سئو ------------------------------ */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  let product = null;
  try {
    product = await getProductBySlug(params.slug);
  } catch {
    product = null;
  }

  if (!product) {
    return {
      title: "محصول یافت نشد",
      robots: { index: false, follow: false },
    };
  }

  const title = product.title_fa;
  const description = getProductDescription(product);
  const canonicalPath = `/product/${product.slug}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const image = getProductImage(product);

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "آکامارکت",
      locale: "fa_IR",
      type: "website",
      images: image ? [{ url: image, alt: product.title_fa }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

/* -------------------------------- صفحه ----------------------------------- */
export default async function ProductDetailPage({ params }: PageProps) {
  let product = null;
  let failed = false;
  try {
    product = await getProductBySlug(params.slug);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <main dir="rtl" className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="rounded-xl border border-red-200 bg-red-50 p-8 text-red-700">
          خطا در دریافت اطلاعات محصول.
        </p>
      </main>
    );
  }

  if (!product) notFound();

  const canonicalUrl = toAbsoluteUrl(`/product/${product.slug}`);
  const productImage = getProductImage(product);
  const description = getProductDescription(product);
  const priceInRial = tomanToRial(product.effective_price);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title_fa,
    description,
    ...(productImage ? { image: [productImage] } : {}),
    ...(product.brand
      ? {
          brand: {
            "@type": "Brand",
            name: product.brand.name_fa || product.brand.name_en,
          },
        }
      : {}),
    ...(priceInRial
      ? {
          offers: {
            "@type": "Offer",
            url: canonicalUrl,
            priceCurrency: "IRR",
            price: priceInRial,
            availability: product.in_stock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }
      : {}),
    ...(product.average_rating !== null &&
    product.average_rating > 0 &&
    product.reviews_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.average_rating,
            reviewCount: product.reviews_count,
          },
        }
      : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "خانه", item: toAbsoluteUrl("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: "محصولات",
        item: toAbsoluteUrl("/products"),
      },
      ...(product.category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: product.category.name_fa,
              item: toAbsoluteUrl(
                `/products?category=${encodeURIComponent(product.category.slug)}`,
              ),
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.category ? 4 : 3,
        name: product.title_fa,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <main dir="rtl" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />
      {/* مسیر راهنما */}
      <nav aria-label="مسیر" className="mb-6 text-sm text-blue-slate">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-bondi-blue">
              خانه
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/products" className="hover:text-bondi-blue">
              محصولات
            </Link>
          </li>
          {product.category && (
            <>
              <li aria-hidden>/</li>
              <li>
                <Link
                  href={`/products?category=${encodeURIComponent(product.category.slug)}`}
                  className="hover:text-bondi-blue"
                >
                  {product.category.name_fa}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden>/</li>
          <li className="font-medium text-iron-grey" aria-current="page">
            {product.title_fa}
          </li>
        </ol>
      </nav>

      {/* خوشه‌ی تعاملی: تصاویر / اطلاعات و تنوع / خرید */}
      <ProductInteractive product={product} />

      {/* مشخصات فنی */}
      <ProductSpecifications specifications={product.specifications} />

      {/* توضیحات */}
      <section dir="rtl" className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-iron-grey">معرفی محصول</h2>
        {product.description_fa ? (
          <p className="leading-loose text-blue-slate">{product.description_fa}</p>
        ) : (
          <p className="rounded-xl border border-silver bg-dust-grey/40 p-5 text-sm text-blue-slate">
            توضیحاتی برای این محصول ثبت نشده است.
          </p>
        )}
      </section>

      {/* نظرات کاربران */}
      <ProductReviews
        slug={product.slug}
        averageRating={product.average_rating}
        reviewsCount={product.reviews_count}
      />
    </main>
  );
}
