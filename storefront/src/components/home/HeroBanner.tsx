import Link from "next/link";

import { buttonClass } from "@/components/ui/Button";

/**
 * بخش قهرمان صفحه‌ی اصلی (RTL / فارسی) — Server Component.
 * فقط متن و لینک‌های ثابت فارسی؛ هیچ داده‌ی محصولِ ساختگی ندارد.
 */
export function HeroBanner() {
  return (
    <section
      dir="rtl"
      className="bg-gradient-to-bl from-dust-grey via-white to-silver/40"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-16">
        <div className="animate-fade-in-up text-center lg:text-right">
          <span className="inline-block rounded-full bg-bondi-blue/10 px-3 py-1 text-xs font-semibold text-bondi-blue-dark">
            بازارگاه تخصصی ورزش
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-iron-grey sm:text-4xl lg:text-5xl">
            خرید لوازم ورزشی، <span className="text-bondi-blue">راحت‌تر و سریع‌تر</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-blue-slate sm:text-lg">
            از کفش و پوشاک ورزشی تا تجهیزات باشگاه و کوهنوردی؛ همه‌چیز برای شروع
            تمرین بعدی شما.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link href="/products" className={buttonClass("primary", "lg", "px-8")}>
              مشاهده محصولات
            </Link>
            <Link
              href="/products?has_discount=true"
              className={buttonClass("outline", "lg", "px-8")}
            >
              تخفیف‌های ویژه
            </Link>
          </div>
        </div>

        {/* کارت تزئینی (بدون داده‌ی محصول) */}
        <div className="relative hidden lg:block">
          <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-silver bg-white shadow-card">
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-tr from-bondi-blue/15 via-dust-grey to-blue-slate/10">
              <span className="text-6xl font-black text-bondi-blue/30">آکامارکت</span>
              <span className="mt-3 text-sm font-semibold text-blue-slate">
                تجهیز شو، فراتر برو
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
