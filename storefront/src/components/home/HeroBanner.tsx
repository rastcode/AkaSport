import Link from "next/link";

import { buttonClass } from "@/components/ui/buttonStyles";
import { HeroProductWheel } from "@/components/home/HeroProductWheel";
import type { ProductListItem } from "@/types/catalog";

/**
 * بخش قهرمان صفحه‌ی اصلی (RTL / فارسی) — Server Component.
 *
 * متن و CTAهای ثابت فارسی در یک ستون و «چرخ محصولات ویژه» (تعاملی) در ستون دیگر.
 * محصولاتِ واقعی از صفحه پاس داده می‌شوند؛ هیچ داده‌ی ساختگی نیست.
 */
export function HeroBanner({ products = [] }: { products?: ProductListItem[] }) {
  return (
    <section
      dir="rtl"
      className="bg-gradient-to-bl from-brand-light via-white to-brand-light"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-12 lg:grid-cols-2 lg:px-8 lg:py-16">
        <div className="animate-fade-in-up text-center lg:text-right">
          <span className="inline-block rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold text-brand-accent">
            بازارگاه تخصصی ورزش
          </span>
          <h1 className="mt-4 text-[1.7rem] font-extrabold leading-[1.35] text-iron-grey sm:text-4xl lg:text-5xl lg:leading-tight">
            خرید لوازم ورزشی، <span className="text-brand-accent">راحت‌تر و سریع‌تر</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-blue-slate sm:mt-4 sm:text-lg">
            از کفش و پوشاک ورزشی تا تجهیزات باشگاه و کوهنوردی؛ همه‌چیز برای شروع
            تمرین بعدی شما.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:mt-8 sm:gap-3 lg:justify-start">
            <Link
              href="/products"
              className={buttonClass(
                "primary",
                "sm",
                "px-4 py-2.5 text-sm lg:px-8 lg:py-3 lg:text-base",
              )}
            >
              مشاهده محصولات
            </Link>
            <Link
              href="/products?has_discount=true"
              className={buttonClass(
                "outline",
                "sm",
                "px-4 py-2.5 text-sm lg:px-8 lg:py-3 lg:text-base",
              )}
            >
              تخفیف‌های ویژه
            </Link>
          </div>
        </div>

        {/* چرخ محصولات ویژه (تعاملی، با محصولات واقعی) */}
        <div className="relative flex items-center justify-center">
          <HeroProductWheel products={products} />
        </div>
      </div>
    </section>
  );
}
