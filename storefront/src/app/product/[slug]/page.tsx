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
import { getProductBySlug, resolveMediaUrl } from "@/services/catalogService";

export const dynamic = "force-dynamic"; // موجودی و بازدید لحظه‌ای

interface PageProps {
  params: { slug: string };
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
      title: "محصول یافت نشد | آکامارکت",
      description: "محصول موردنظر یافت نشد یا حذف شده است.",
      robots: { index: false, follow: false },
    };
  }

  const title = product.seo_title || `${product.title_fa} | آکامارکت`;
  const description =
    product.seo_description ||
    (product.description_fa
      ? product.description_fa.slice(0, 160)
      : `خرید ${product.title_fa} با بهترین قیمت از آکامارکت.`);

  const image =
    resolveMediaUrl(
      product.primary_image ??
        product.images.find((i) => i.is_primary)?.image ??
        product.images[0]?.image ??
        null,
    ) ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: image ? [{ url: image, alt: product.title_fa }] : [],
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

  return (
    <main dir="rtl" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
    </main>
  );
}
