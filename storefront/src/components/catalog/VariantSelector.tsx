"use client";

/**
 * انتخاب تنوع کالا + جعبه‌ی خرید (RTL / فارسی).
 *
 * محورهای قابل انتخاب (مثل رنگ و سایز) از روی `attributes` هر تنوع استخراج
 * می‌شوند؛ کاربر ترکیب موردنظر را انتخاب می‌کند، تنوع منطبق پیدا شده و قیمت و
 * موجودی به‌صورت زنده به‌روزرسانی می‌شود. دکمه‌ی «افزودن به سبد» مستقیماً با
 * فروشگاه سبد (`CartContext`) یکپارچه است.
 */

import { useMemo, useState } from "react";

import { useCart } from "@/context/CartContext";
import type { AttributeMap, ProductVariant } from "@/types/product";
import { formatAttributeValue, humanizeKey } from "@/lib/format";
import { formatToman, formatNumber } from "@/lib/persian";

interface VariantSelectorProps {
  basePrice: string;
  variants: ProductVariant[];
  productTitle: string;
  productSlug?: string;
  productImage?: string | null;
}

/** محورهای متمایز صفت‌ها در میان همه‌ی تنوع‌ها (با حفظ ترتیب اولین مشاهده). */
function deriveAxes(variants: ProductVariant[]): Record<string, string[]> {
  const axes: Record<string, string[]> = {};
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.attributes ?? {})) {
      const v = formatAttributeValue(value);
      if (!axes[key]) axes[key] = [];
      if (!axes[key].includes(v)) axes[key].push(v);
    }
  }
  return axes;
}

function matchVariant(
  variants: ProductVariant[],
  selection: AttributeMap,
): ProductVariant | null {
  const keys = Object.keys(selection);
  return (
    variants.find((variant) =>
      keys.every(
        (k) => formatAttributeValue(variant.attributes?.[k]) === selection[k],
      ),
    ) ?? null
  );
}

export function VariantSelector({
  basePrice,
  variants,
  productTitle,
  productSlug,
  productImage,
}: VariantSelectorProps) {
  const { addToCart, isSyncing } = useCart();

  const activeVariants = useMemo(
    () => variants.filter((v) => v.is_active),
    [variants],
  );
  const axes = useMemo(() => deriveAxes(activeVariants), [activeVariants]);
  const axisKeys = Object.keys(axes);
  const hasAxes = axisKeys.length > 0;

  const [selection, setSelection] = useState<AttributeMap>({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [pending, setPending] = useState(false);

  const selectedVariant = useMemo<ProductVariant | null>(() => {
    if (!hasAxes) return activeVariants[0] ?? null;
    if (Object.keys(selection).length !== axisKeys.length) return null;
    return matchVariant(activeVariants, selection);
  }, [hasAxes, activeVariants, selection, axisKeys.length]);

  const fullySelected =
    !hasAxes || Object.keys(selection).length === axisKeys.length;
  const price = selectedVariant?.final_price ?? basePrice;
  const inStock = selectedVariant
    ? selectedVariant.is_in_stock
    : activeVariants.some((v) => v.is_in_stock);
  const maxQty = selectedVariant?.stock_quantity ?? 0;

  function choose(axis: string, value: string) {
    setAdded(false);
    setSelection((prev) => ({ ...prev, [axis]: value }));
  }

  /** آیا این مقدار با توجه به سایر انتخاب‌ها موجود است؟ */
  function isValueAvailable(axis: string, value: string): boolean {
    const trial = { ...selection, [axis]: value };
    return activeVariants.some(
      (variant) =>
        variant.is_in_stock &&
        Object.entries(trial).every(
          ([k, v]) => formatAttributeValue(variant.attributes?.[k]) === v,
        ),
    );
  }

  async function handleAdd() {
    if (!selectedVariant || !selectedVariant.is_in_stock) return;
    setPending(true);
    try {
      await addToCart(selectedVariant.id, quantity, {
        sku: selectedVariant.sku,
        title: productTitle,
        unitPrice: selectedVariant.final_price,
        image: productImage ?? null,
        attributes: selectedVariant.attributes,
        slug: productSlug,
      });
      setAdded(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* قیمت */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-extrabold text-blue-slate">
          {formatToman(price)}
        </span>
        {selectedVariant && selectedVariant.final_price !== basePrice && (
          <span className="text-sm text-silver">
            قیمت پایه {formatToman(basePrice)}
          </span>
        )}
      </div>

      {/* وضعیت موجودی */}
      <StockAlert
        fullySelected={fullySelected}
        variant={selectedVariant}
        anyInStock={inStock}
      />

      {/* محورهای انتخاب */}
      {axisKeys.map((axis) => (
        <fieldset key={axis}>
          <legend className="mb-2 text-sm font-semibold text-blue-slate">
            {humanizeKey(axis)}
            {selection[axis] && (
              <span className="mr-2 font-normal text-iron-grey">
                {selection[axis]}
              </span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {axes[axis].map((value) => {
              const selected = selection[axis] === value;
              const available = isValueAvailable(axis, value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose(axis, value)}
                  aria-pressed={selected}
                  disabled={!available && !selected}
                  className={
                    "min-w-[3rem] rounded-lg border px-3 py-2 text-sm font-semibold transition-colors " +
                    (selected
                      ? "border-bondi-blue bg-bondi-blue text-white"
                      : available
                        ? "border-silver bg-white text-blue-slate hover:border-bondi-blue"
                        : "cursor-not-allowed border-dust-grey bg-dust-grey text-silver line-through")
                  }
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {/* تعداد + افزودن به سبد */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-silver">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-lg text-blue-slate hover:text-bondi-blue disabled:opacity-40"
            disabled={quantity <= 1}
            aria-label="کاهش تعداد"
          >
            −
          </button>
          <span
            className="w-10 text-center font-semibold text-iron-grey"
            aria-live="polite"
          >
            {formatNumber(quantity)}
          </span>
          <button
            type="button"
            onClick={() =>
              setQuantity((q) => (maxQty ? Math.min(maxQty, q + 1) : q + 1))
            }
            className="px-3 py-2 text-lg text-blue-slate hover:text-bondi-blue disabled:opacity-40"
            disabled={Boolean(maxQty) && quantity >= maxQty}
            aria-label="افزایش تعداد"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={
            !fullySelected ||
            !selectedVariant ||
            !selectedVariant.is_in_stock ||
            pending ||
            isSyncing
          }
          className="btn-primary flex-1 sm:flex-none sm:px-10"
        >
          {pending ? "در حال افزودن…" : added ? "به سبد افزوده شد ✓" : "افزودن به سبد"}
        </button>
      </div>

      {!fullySelected && (
        <p className="text-sm text-blue-slate">
          برای ادامه، {axisKeys.map(humanizeKey).join(" و ")} را انتخاب کنید.
        </p>
      )}
    </div>
  );
}

function StockAlert({
  fullySelected,
  variant,
  anyInStock,
}: {
  fullySelected: boolean;
  variant: ProductVariant | null;
  anyInStock: boolean;
}) {
  if (!fullySelected) {
    return (
      <p className="inline-flex items-center gap-2 rounded-lg bg-dust-grey px-3 py-1.5 text-sm font-medium text-blue-slate">
        {anyInStock ? "موجود — گزینه‌ها را انتخاب کنید" : "در حال حاضر ناموجود"}
      </p>
    );
  }
  if (!variant) {
    return (
      <p className="inline-flex items-center gap-2 rounded-lg bg-iron-grey/10 px-3 py-1.5 text-sm font-medium text-iron-grey">
        این ترکیب موجود نیست
      </p>
    );
  }
  if (!variant.is_in_stock) {
    return (
      <p className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
        ناموجود
      </p>
    );
  }
  const low = variant.stock_quantity <= 3;
  return (
    <p
      className={
        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold " +
        (low ? "bg-amber-50 text-amber-700" : "bg-bondi-blue/10 text-bondi-blue-dark")
      }
    >
      <span
        className={"h-2 w-2 rounded-full " + (low ? "bg-amber-500" : "bg-bondi-blue")}
        aria-hidden
      />
      {low
        ? `تنها ${formatNumber(variant.stock_quantity)} عدد در انبار باقی مانده`
        : `موجود در انبار (${formatNumber(variant.stock_quantity)} عدد)`}
    </p>
  );
}
