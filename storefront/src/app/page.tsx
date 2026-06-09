/**
 * صفحه‌ی اصلی آکامارکت (RTL / فارسی) — Server Component.
 *
 * یک فروشگاه ورزشی فارسی با حال‌وهوای مارکت‌پلیس. همه‌ی داده‌ها فقط از
 * `catalogService` (endpointهای /api/catalog/) گرفته می‌شوند؛ از سرویس legacy
 * استفاده نمی‌شود و هیچ داده‌ی ساختگی وجود ندارد.
 *
 * تحمل خطا: هر فراخوان API به‌صورت جداگانه با catch محافظت شده تا اگر یک بخش
 * خطا داد یا خالی بود، کل صفحه crash نکند و همان بخش، حالت خالیِ فارسی نشان دهد.
 *
 * سربرگ و پاورقی به‌صورت سراسری توسط SiteChrome اعمال می‌شوند؛ این صفحه فقط
 * محتوای میانی را رندر می‌کند.
 */

import { HeroBanner } from "@/components/home/HeroBanner";
import { CategoryShortcutGrid } from "@/components/home/CategoryShortcutGrid";
import { ProductRail } from "@/components/home/ProductRail";
import { getCategoryTree, getProducts } from "@/services/catalogService";
import type { CategoryTreeNode, ProductListItem } from "@/types/catalog";

// بازاعتبارسنجی دوره‌ای محتوای صفحه‌ی اصلی.
export const revalidate = 120;

function results(
  res: { results: ProductListItem[] } | null,
): ProductListItem[] {
  return res?.results ?? [];
}

export default async function HomePage() {
  // دریافت موازی همه‌ی بخش‌ها؛ هر کدام مستقل و تحمل‌پذیرِ خطاست.
  const [tree, discounted, bestSelling, newest, featured] = await Promise.all([
    getCategoryTree().catch(() => [] as CategoryTreeNode[]),
    getProducts({ has_discount: true }).catch(() => null),
    getProducts({ ordering: "best_selling" }).catch(() => null),
    getProducts({ ordering: "newest" }).catch(() => null),
    getProducts({ is_featured: true }).catch(() => null),
  ]);

  return (
    <main dir="rtl" className="bg-white">
      <HeroBanner />

      <CategoryShortcutGrid categories={tree} />

      <ProductRail
        title="تخفیف‌های ویژه"
        viewAllHref="/products?has_discount=true"
        products={results(discounted)}
      />

      <ProductRail
        title="پرفروش‌ترین‌های ورزشی"
        viewAllHref="/products?ordering=best_selling"
        products={results(bestSelling)}
      />

      <ProductRail
        title="جدیدترین محصولات"
        viewAllHref="/products?ordering=newest"
        products={results(newest)}
      />

      <ProductRail
        title="پیشنهادهای منتخب آکامارکت"
        viewAllHref="/products?is_featured=true"
        products={results(featured)}
      />
    </main>
  );
}
