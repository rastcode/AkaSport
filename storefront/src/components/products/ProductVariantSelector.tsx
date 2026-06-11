"use client";

/**
 * انتخاب تنوع محصول بر اساس رنگ و سایز (RTL / فارسی) — Client Component.
 *
 * محورهای رنگ/سایز را از تنوع‌ها استخراج می‌کند، با هر انتخاب تنوع منطبق را پیدا
 * کرده و از طریق `onSelect` به والد می‌دهد. اگر محصول رنگ/سایز نداشته باشد چیزی
 * نمایش نمی‌دهد (والد از قیمت محصول استفاده می‌کند).
 */

import { useMemo } from "react";

import { cn } from "@/lib/cn";
import type { Color, ProductVariant, Size } from "@/types/catalog";

interface Props {
  variants: ProductVariant[];
  selected: ProductVariant | null;
  onSelect: (variant: ProductVariant | null) => void;
}

export function ProductVariantSelector({ variants, selected, onSelect }: Props) {
  const active = useMemo(() => variants.filter((v) => v.is_active), [variants]);

  const colors = useMemo(() => uniqueColors(active), [active]);
  const sizes = useMemo(() => uniqueSizes(active), [active]);
  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;

  if (!hasColors && !hasSizes) return null;

  const selColorId = selected?.color?.id ?? null;
  const selSizeId = selected?.size?.id ?? null;

  function resolve(colorId: number | null, sizeId: number | null): ProductVariant | null {
    return (
      active.find(
        (v) =>
          (!hasColors || v.color?.id === colorId) &&
          (!hasSizes || v.size?.id === sizeId),
      ) ?? null
    );
  }

  function chooseColor(colorId: number) {
    // ابتدا با سایز فعلی تطبیق بده؛ اگر نشد، اولین تنوعِ همان رنگ را بردار.
    const match =
      (hasSizes ? resolve(colorId, selSizeId) : resolve(colorId, null)) ??
      active.find((v) => v.color?.id === colorId) ??
      null;
    onSelect(match);
  }

  function chooseSize(sizeId: number) {
    const match =
      (hasColors ? resolve(selColorId, sizeId) : resolve(null, sizeId)) ??
      active.find((v) => v.size?.id === sizeId) ??
      null;
    onSelect(match);
  }

  function colorInStock(colorId: number): boolean {
    return active.some(
      (v) =>
        v.is_in_stock &&
        v.color?.id === colorId &&
        (!hasSizes || selSizeId === null || v.size?.id === selSizeId),
    );
  }

  function sizeInStock(sizeId: number): boolean {
    return active.some(
      (v) =>
        v.is_in_stock &&
        v.size?.id === sizeId &&
        (!hasColors || selColorId === null || v.color?.id === selColorId),
    );
  }

  const showUnavailable = selected !== null && !selected.is_in_stock;

  return (
    <div dir="rtl" className="space-y-5">
      {hasColors && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-blue-slate">رنگ</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const isSel = selColorId === color.id;
              const avail = colorInStock(color.id) || isSel;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => chooseColor(color.id)}
                  aria-pressed={isSel}
                  disabled={!avail}
                  className={cn(
                    "flex min-h-[2.5rem] items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    isSel
                      ? "border-brand-accent bg-brand-accent text-white"
                      : avail
                        ? "border-silver bg-white text-blue-slate hover:border-brand-accent"
                        : "cursor-not-allowed border-silver/50 bg-brand-light text-brand-muted opacity-60",
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-silver"
                    style={{ backgroundColor: color.hex_code || "#ccc" }}
                    aria-hidden
                  />
                  {color.name_fa}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {hasSizes && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-blue-slate">سایز</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const isSel = selSizeId === size.id;
              const avail = sizeInStock(size.id) || isSel;
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => chooseSize(size.id)}
                  aria-pressed={isSel}
                  disabled={!avail}
                  className={cn(
                    "min-h-[2.5rem] min-w-[2.75rem] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                    isSel
                      ? "border-brand-accent bg-brand-accent text-white"
                      : avail
                        ? "border-silver bg-white text-blue-slate hover:border-brand-accent"
                        : "cursor-not-allowed border-silver/50 bg-brand-light text-brand-muted opacity-60",
                  )}
                >
                  {size.name_fa}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {showUnavailable && (
        <p className="inline-flex rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
          این ترکیب رنگ و سایز موجود نیست.
        </p>
      )}
    </div>
  );
}

function uniqueColors(variants: ProductVariant[]): Color[] {
  const map = new Map<number, Color>();
  for (const v of variants) {
    if (v.color && !map.has(v.color.id)) map.set(v.color.id, v.color);
  }
  return Array.from(map.values());
}

function uniqueSizes(variants: ProductVariant[]): Size[] {
  const map = new Map<number, Size>();
  for (const v of variants) {
    if (v.size && !map.has(v.size.id)) map.set(v.size.id, v.size);
  }
  return Array.from(map.values()).sort((a, b) => a.display_order - b.display_order);
}
