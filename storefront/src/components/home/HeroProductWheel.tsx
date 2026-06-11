"use client";

/**
 * چرخ محصولات ویژه (radial orbit) برای بخش قهرمان صفحه‌ی اصلی — RTL / فارسی.
 *
 * thumbnailهای محصولاتِ واقعی را روی یک دایره می‌چیند؛ هر چند ثانیه می‌چرخد و
 * محصولی که در بالا قرار می‌گیرد «فعال» می‌شود (بزرگ‌تر و پررنگ‌تر با حلقه‌ی
 * accent). کلیک روی هر محصول به صفحه‌ی آن می‌رود.
 *
 * بدون هیچ پکیج خارجی؛ فقط transform/opacity + یک interval. هیچ داده‌ی ساختگی
 * نیست — اگر محصولی نباشد، حالت جانمای برندشده نشان داده می‌شود.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { resolveMediaUrl } from "@/services/catalogService";
import { ProductImagePlaceholder } from "@/components/products/ProductImagePlaceholder";
import { formatToman } from "@/lib/persian";
import type { ProductListItem } from "@/types/catalog";

const ROTATE_MS = 4000;
const RADIUS = "9.5rem"; // شعاع چیدمان محصولات روی مدار (۱۵۲px)

export function HeroProductWheel({ products }: { products: ProductListItem[] }) {
  const items = useMemo(() => products.slice(0, 6), [products]);
  const count = items.length;

  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const pausedRef = useRef(false);

  // احترام به prefers-reduced-motion.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // چرخش خودکار (در صورت توقف یا reduced-motion متوقف می‌شود).
  useEffect(() => {
    if (reduced || count < 2) return;
    const id = setInterval(() => {
      if (!pausedRef.current) setStep((s) => s + 1);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [reduced, count]);

  function setPausedState(v: boolean) {
    pausedRef.current = v;
    setPaused(v);
  }

  // حالت جانما برای داده‌ی ناکافی.
  if (count < 2) {
    return <FallbackVisual single={items[0]} />;
  }

  const activeIndex = ((step % count) + count) % count;
  const active = items[activeIndex];
  const stepDeg = 360 / count;
if (!active) {
  return null;
}
  return (
    <div className="flex flex-col items-center">
      <div
        role="group"
        aria-label="محصولات ویژه"
        onMouseEnter={() => setPausedState(true)}
        onMouseLeave={() => setPausedState(false)}
        onFocusCapture={() => setPausedState(true)}
        onBlurCapture={() => setPausedState(false)}
        className="relative h-[24rem] w-[24rem] origin-center scale-[0.7] sm:scale-90 lg:scale-100"
      >
        {/* هاله‌ی پس‌زمینه */}
        <div
          aria-hidden
          className="absolute inset-8 rounded-full bg-gradient-to-tr from-brand-accent/10 via-brand-light to-brand-dark/5"
        />
        {/* حلقه‌ی راهنما */}
        <div aria-hidden className="absolute inset-10 rounded-full border border-brand-muted/30" />

        {/* مرکز: وردمارک */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-silver/60 bg-white text-center shadow-sm"
        >
          <span className="text-xl font-black tracking-tight text-brand-dark">آکامارکت</span>
          <span className="mt-0.5 text-[11px] font-semibold text-brand-muted">ویژه‌ها</span>
        </div>

        {/* thumbnailها روی مدار */}
        {items.map((item, i) => {
          const angle = (i - step) * stepDeg;
          const isActive = i === activeIndex;
          const url = resolveMediaUrl(item.primary_image);
          return (
            <Link
              key={item.id}
              href={`/product/${item.slug}`}
              aria-label={`مشاهده محصول ${item.title_fa}`}
              tabIndex={isActive ? 0 : -1}
              style={{
                transform: `rotate(${angle}deg) translateY(-${RADIUS}) rotate(${-angle}deg) scale(${isActive ? 1.4 : 0.9})`,
                transitionProperty: reduced ? "none" : "transform, opacity",
                zIndex: isActive ? 30 : 10,
              }}
              className={
                "absolute left-1/2 top-1/2 -ml-14 -mt-14 block h-28 w-28 duration-700 ease-out " +
                (isActive ? "opacity-100" : "opacity-80 hover:opacity-100")
              }
            >
              {url ? (
                // تصویر محصول به‌صورت cutout شناور (بدون قاب/کادر)، با drop-shadow
                // برای حس سه‌بعدی؛ آیتم فعال بزرگ‌تر و با سایه‌ی قوی‌تر.
                <Image
                  key={url}
                  src={url}
                  alt={item.title_fa}
                  fill
                  sizes="160px"
                  className={
                    "object-contain transition-[filter] duration-300 " +
                    (isActive
                      ? "drop-shadow-[0_14px_20px_rgba(43,45,66,0.42)]"
                      : "drop-shadow-[0_8px_12px_rgba(43,45,66,0.24)]")
                  }
                />
              ) : (
                <span
                  className={
                    "flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border " +
                    (isActive ? "border-brand-accent/60" : "border-silver/50")
                  }
                >
                  <ProductImagePlaceholder size="thumbnail" />
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* اطلاعات محصول فعال — کارت فشرده و باریک، با فاصله‌ی طبیعی از چرخ */}
      <Link
        href={`/product/${active.slug}`}
        className="group mt-6 flex w-[17rem] max-w-[80vw] items-center gap-3 rounded-xl border border-silver/60 bg-white px-3 py-2 text-right shadow-sm transition-colors hover:border-brand-accent/40 sm:mt-8"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-full bg-brand-accent/10 px-2 py-0.5 text-[10px] font-semibold text-brand-accent">
              {active.has_discount ? "تخفیف ویژه" : "ویژه"}
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-brand-dark group-hover:text-brand-accent">
              {active.title_fa}
            </p>
          </div>
          <p className="mt-0.5 text-sm font-extrabold text-brand-dark">
            {formatToman(active.effective_price)}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-brand-accent">مشاهده ←</span>
      </Link>

      {/* وضعیت توقف برای صفحه‌خوان‌ها (بی‌صدا) */}
      <span className="sr-only" aria-live="off">
        {paused ? "چرخش متوقف شد" : ""}
      </span>
    </div>
  );
}

/** حالت جانمای برندشده وقتی محصول کافی برای چرخ نیست. */
function FallbackVisual({ single }: { single?: ProductListItem }) {
  if (single) {
    const url = resolveMediaUrl(single.primary_image);
    return (
      <Link
        href={`/product/${single.slug}`}
        aria-label={`مشاهده محصول ${single.title_fa}`}
        className="block w-full max-w-sm overflow-hidden rounded-3xl border border-silver/60 bg-white shadow-card transition-colors hover:border-brand-accent/40"
      >
        <div className="relative aspect-[4/3] w-full bg-white">
          {url ? (
            <Image key={url} src={url} alt={single.title_fa} fill sizes="(max-width:1024px) 90vw, 40vw" className="object-contain p-4" />
          ) : (
            <ProductImagePlaceholder size="detail" />
          )}
        </div>
        <div className="p-4 text-center">
          <p className="line-clamp-1 text-sm font-bold text-brand-dark">{single.title_fa}</p>
          <p className="mt-1 text-sm font-extrabold text-brand-dark">{formatToman(single.effective_price)}</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="aspect-[4/3] w-full max-w-sm overflow-hidden rounded-3xl border border-silver/60 bg-white shadow-card">
      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-tr from-brand-accent/10 via-brand-light to-brand-dark/10">
        <span className="text-5xl font-black text-brand-accent/25">آکامارکت</span>
        <span className="mt-3 text-sm font-semibold text-blue-slate">تجهیز شو، فراتر برو</span>
      </div>
    </div>
  );
}
