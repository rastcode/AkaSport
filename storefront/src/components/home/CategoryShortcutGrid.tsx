import Link from "next/link";
import Image from "next/image";

import { resolveMediaUrl } from "@/services/catalogService";
import type { CategoryTreeNode } from "@/types/catalog";

/**
 * شبکه‌ی میان‌بر دسته‌بندی‌های اصلی (RTL / فارسی) — Server Component.
 *
 * فقط دسته‌های اصلی (ریشه‌های درخت) را نشان می‌دهد و به فهرست محصولاتِ همان دسته
 * پیوند می‌خورد. در نبود آیکن/تصویر، یک کارت ساده با حرف نخست نام نمایش می‌دهد.
 */
export function CategoryShortcutGrid({
  categories,
}: {
  categories: CategoryTreeNode[];
}) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section dir="rtl" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h2 className="mb-5 text-xl font-extrabold text-iron-grey sm:text-2xl">
        خرید بر اساس دسته‌بندی
      </h2>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {categories.map((category) => {
          const iconUrl = resolveMediaUrl(category.icon);
          return (
            <Link
              key={category.id}
              href={`/products?category=${encodeURIComponent(category.slug)}`}
              className="group flex flex-col items-center gap-2 rounded-xl border border-silver
                         bg-white p-4 text-center transition-all hover:-translate-y-1
                         hover:border-bondi-blue hover:shadow-card"
            >
              {iconUrl ? (
                <span className="relative h-14 w-14 overflow-hidden rounded-full">
                  <Image
                    src={iconUrl}
                    alt={category.name_fa}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bondi-blue/10 text-lg font-black text-bondi-blue">
                  {category.name_fa.slice(0, 1)}
                </span>
              )}
              <span className="text-xs font-semibold text-iron-grey group-hover:text-bondi-blue">
                {category.name_fa}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
