"use client";

/**
 * اسلایدر دسته‌بندی‌ها (RTL / فارسی).
 *
 * نوار افقی قابل اسکرول از دسته‌های اصلی با دکمه‌های پیمایش راست/چپ. هر کارت
 * به صفحه‌ی فهرست محصولات با فیلتر همان دسته پیوند می‌خورد.
 */

import { useRef } from "react";
import Link from "next/link";

import type { Category } from "@/types/product";

export function CategorySlider({ categories }: { categories: Category[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  if (categories.length === 0) return null;

  function scrollBy(direction: "next" | "prev") {
    const el = scrollerRef.current;
    if (!el) return;
    // In an RTL container, positive scrollLeft moves toward the start (right).
    const amount = 260 * (direction === "next" ? -1 : 1);
    el.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <section dir="rtl" aria-label="دسته‌بندی‌ها" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-iron-grey">خرید بر اساس دسته</h2>
        <div className="flex gap-2">
          <SliderButton onClick={() => scrollBy("prev")} label="قبلی" dir="prev" />
          <SliderButton onClick={() => scrollBy("next")} label="بعدی" dir="next" />
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${encodeURIComponent(category.slug)}`}
            className="group relative flex h-32 w-44 shrink-0 snap-start flex-col justify-end
                       overflow-hidden rounded-2xl border border-silver bg-dust-grey p-4
                       transition-all hover:-translate-y-1 hover:border-bondi-blue hover:shadow-card"
          >
            <span
              className="absolute inset-0 -z-0 bg-gradient-to-tr from-blue-slate/10 to-bondi-blue/10
                         opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
            <span className="relative z-10 text-base font-bold text-iron-grey group-hover:text-bondi-blue">
              {category.name}
            </span>
            <span className="relative z-10 mt-1 text-xs text-blue-slate">مشاهده‌ی محصولات ←</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SliderButton({
  onClick,
  label,
  dir,
}: {
  onClick: () => void;
  label: string;
  dir: "next" | "prev";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-silver
                 bg-white text-blue-slate transition-colors hover:border-bondi-blue hover:text-bondi-blue"
    >
      <svg
        className={"h-5 w-5 " + (dir === "next" ? "" : "-scale-x-100")}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        {/* arrow pointing right (start direction in RTL) */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
