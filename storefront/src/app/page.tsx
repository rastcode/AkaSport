/**
 * صفحه‌ی فرود فروشگاه (RTL / فارسی) — Server Component.
 *
 * این صفحه عمومی است (بدون نیاز به ورود). داده‌ها سمت سرور دریافت می‌شوند تا
 * برای SEO و نخستین رنگ‌آمیزی سریع، HTML کامل تحویل داده شود:
 *   - بخش قهرمان (Hero)
 *   - اسلایدر دسته‌بندی‌ها (داده‌ی بخش ۲)
 *   - شبکه‌ی محصولات منتخب (با کارت محصول بخش ۲)
 *   - مزیت‌های فروشگاه و فراخوان اقدام
 */

import Link from "next/link";

import { ProductCard } from "@/components/catalog/ProductCard";
import { CategorySlider } from "@/components/home/CategorySlider";
import { getCategories, getProducts } from "@/services/productService";
import type { Category, ProductListItem } from "@/types/product";

// محتوای فرود می‌تواند با بازه‌ی کوتاه بازاعتبارسنجی شود (ISR).
export const revalidate = 120;

export default async function HomePage() {
  // دریافت موازی داده‌ها با تحمل خطا (صفحه نباید به‌خاطر یک منبع خراب بیفتد).
  const [products, categories] = await Promise.all([
    getProducts({ sort: "newest" }).catch(() => null),
    getCategories().catch(() => [] as Category[]),
  ]);

  const allProducts: ProductListItem[] = products?.results ?? [];
  // محصولات منتخب را اولویت بده، سپس با جدیدترین‌ها تکمیل کن.
  const featured = [
    ...allProducts.filter((p) => p.is_featured),
    ...allProducts.filter((p) => !p.is_featured),
  ].slice(0, 8);

  // فقط دسته‌های اصلی (بدون والد) برای اسلایدر.
  const rootCategories = categories.filter((c) => c.parent === null);

  return (
    <>
      <main dir="rtl" className="bg-white">
        {/* بخش قهرمان */}
        <section className="bg-gradient-to-bl from-dust-grey via-white to-silver/40">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
            <div className="animate-fade-in-up text-center lg:text-right">
              <span className="inline-block rounded-full bg-bondi-blue/10 px-3 py-1 text-xs font-semibold text-bondi-blue-dark">
                مجموعه‌ی جدید فصل
              </span>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight text-iron-grey sm:text-5xl">
                تجهیز شو، <span className="text-bondi-blue">فراتر برو.</span>
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-blue-slate">
                بهترین تجهیزات و پوشاک ورزشی، ساخته‌شده برای ورزشکاران جدی.
                کیفیت، دوام و عملکرد در یک‌جا.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link href="/products" className="btn-primary px-8">
                  مشاهده‌ی محصولات
                </Link>
                <Link href="/products?sort=newest" className="btn-ghost px-8">
                  جدیدترین‌ها
                </Link>
              </div>
            </div>

            {/* کارت تزئینی قهرمان */}
            <div className="relative hidden lg:block">
              <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-silver bg-white shadow-card">
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-tr from-bondi-blue/15 via-dust-grey to-blue-slate/10">
                  <span className="text-7xl font-black text-bondi-blue/30">AKA</span>
                  <span className="mt-2 text-sm font-semibold text-blue-slate">
                    SPORT · از سال ۲۰۲۵
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* اسلایدر دسته‌بندی‌ها */}
        {rootCategories.length > 0 && (
          <div className="py-12">
            <CategorySlider categories={rootCategories} />
          </div>
        )}

        {/* محصولات منتخب */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-iron-grey">منتخب فروشگاه</h2>
              <p className="mt-1 text-sm text-blue-slate">
                گلچینی از پرطرفدارترین تجهیزات ورزشی
              </p>
            </div>
            <Link
              href="/products"
              className="shrink-0 text-sm font-semibold text-bondi-blue hover:text-bondi-blue-dark"
            >
              مشاهده‌ی همه ←
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="rounded-xl border border-silver bg-dust-grey p-12 text-center">
              <p className="font-semibold text-iron-grey">به‌زودی…</p>
              <p className="mt-1 text-sm text-blue-slate">
                هنوز محصولی منتشر نشده است. به‌زودی بازگردید.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* مزیت‌های فروشگاه */}
        <section className="bg-dust-grey/50">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
            <Feature
              title="ارسال سریع"
              desc="تحویل به‌موقع به سراسر کشور با بسته‌بندی مطمئن."
              icon={<TruckIcon />}
            />
            <Feature
              title="ضمانت اصالت کالا"
              desc="تمام محصولات اصل و دارای گارانتی معتبر هستند."
              icon={<ShieldIcon />}
            />
            <Feature
              title="پشتیبانی زنده"
              desc="کارشناسان ما از طریق گفتگوی آنلاین پاسخگوی شما هستند."
              icon={<ChatIcon />}
            />
          </div>
        </section>

        {/* فراخوان اقدام */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-bondi-blue px-8 py-12 text-center text-white">
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              آماده‌ی شروع تمرین بعدی هستید؟
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-white/85">
              همین حالا مجموعه‌ی کامل تجهیزات ورزشی آکاسپورت را کاوش کنید.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-white px-8 py-3
                         font-bold text-bondi-blue transition-transform hover:scale-105"
            >
              ورود به فروشگاه
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

/* ------------------------------ زیرکامپوننت‌ها ------------------------------ */

function Feature({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-silver bg-white p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-bondi-blue text-white">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-iron-grey">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-blue-slate">{desc}</p>
      </div>
    </div>
  );
}

function TruckIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-4-1V6H3v10h2m10 0H9m6-7h3.5L21 12v4h-2" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Zm-2 9 1.8 1.8L15 10" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.5h8M8 14h5m-9 6 3.5-2.5A2 2 0 0 1 10.7 17H17a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v13Z" />
    </svg>
  );
}
