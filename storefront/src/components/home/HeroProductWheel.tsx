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
const RADIUS = "6.5rem"; // شعاع چیدمان thumbnailها

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
    <div className="flex flex-col items-center gap-4">
      <div
        role="group"
        aria-label="محصولات ویژه"
        onMouseEnter={() => setPausedState(true)}
        onMouseLeave={() => setPausedState(false)}
        onFocusCapture={() => setPausedState(true)}
        onBlurCapture={() => setPausedState(false)}
        className="relative h-60 w-60 origin-center scale-90 sm:scale-100 lg:scale-110"
      >
        {/* هاله‌ی پس‌زمینه */}
        <div
          aria-hidden
          className="absolute inset-6 rounded-full bg-gradient-to-tr from-brand-accent/10 via-brand-light to-brand-dark/5"
        />
        {/* حلقه‌ی راهنما */}
        <div aria-hidden className="absolute inset-8 rounded-full border border-brand-muted/30" />

        {/* مرکز: وردمارک */}
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-silver/60 bg-white text-center shadow-sm"
        >
          <span className="text-lg font-black tracking-tight text-brand-dark">آکامارکت</span>
          <span className="mt-0.5 text-[10px] font-semibold text-brand-muted">ویژه‌ها</span>
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
                transform: `rotate(${angle}deg) translateY(-${RADIUS}) rotate(${-angle}deg) scale(${isActive ? 1.18 : 0.82})`,
                transitionProperty: reduced ? "none" : "transform, opacity",
                zIndex: isActive ? 20 : 10,
              }}
              className={
                "absolute left-1/2 top-1/2 -ml-9 -mt-9 block h-[4.5rem] w-[4.5rem] overflow-hidden rounded-2xl border bg-white duration-700 ease-out " +
                (isActive
                  ? "border-brand-accent opacity-100 shadow-[0_0_0_3px_rgba(239,35,60,0.18)]"
                  : "border-silver/60 opacity-60")
              }
            >
              {url ? (
                <Image
                  src={url}
                  alt={item.title_fa}
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              ) : (
                <ProductImagePlaceholder size="thumbnail" />
              )}
            </Link>
          );
        })}
      </div>

      {/* اطلاعات محصول فعال */}
      <Link
        href={`/product/${active.slug}`}
        className="group w-full max-w-xs rounded-2xl border border-silver/60 bg-white/80 p-3 text-center transition-colors hover:border-brand-accent/40"
      >
        <span className="inline-block rounded-full bg-brand-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-accent">
          {active.has_discount ? "تخفیف ویژه" : "محصول ویژه"}
        </span>
        <p className="mt-2 line-clamp-1 text-sm font-bold text-brand-dark group-hover:text-brand-accent">
          {active.title_fa}
        </p>
        <p className="mt-1 text-sm font-extrabold text-brand-dark">
          {formatToman(active.effective_price)}
        </p>
        <span className="mt-1 inline-block text-xs font-semibold text-brand-accent">
          مشاهده محصول ←
        </span>
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
        <div className="relative aspect-[4/3] w-full bg-brand-light">
          {url ? (
            <Image src={url} alt={single.title_fa} fill sizes="(max-width:1024px) 90vw, 40vw" className="object-cover" />
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
