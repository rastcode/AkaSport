"use client";

/**
 * پنل فیلترهای کاتالوگ (RTL / فارسی) — Client Component.
 *
 * مقدار اولیه‌ی فیلترها از URL خوانده می‌شود (prop `filters`) و با هر تغییر، URL
 * به‌روزرسانی می‌شود تا لینک قابل اشتراک باشد. داده‌های مرجع (دسته/برند/رنگ/سایز)
 * سمت سرور گرفته و به این کامپوننت پاس می‌شوند تا fetch سمت کلاینت نداشته باشیم.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { productsHref } from "@/components/products/productQuery";
import { cn } from "@/lib/cn";
import type {
  Brand,
  Category,
  Color,
  ProductQueryParams,
  Size,
} from "@/types/catalog";

interface Props {
  filters: ProductQueryParams;
  categories: Category[];
  brands: Brand[];
  colors: Color[];
  sizes: Size[];
  /**
   * در موبایل (`mobile`) به‌جای `<select>` نیتیو که از کادر drawer بیرون می‌زند،
   * لیست انتخابِ سفارشیِ داخل drawer نمایش داده می‌شود. در دسکتاپ (پیش‌فرض)
   * همان select نیتیو حفظ می‌شود.
   */
  variant?: "mobile" | "desktop";
}

export function CatalogFilters({
  filters,
  categories,
  brands,
  colors,
  sizes,
  variant = "desktop",
}: Props) {
  const isMobile = variant === "mobile";
  const router = useRouter();

  const [minPrice, setMinPrice] = useState(
    filters.min_price ? String(filters.min_price) : "",
  );
  const [maxPrice, setMaxPrice] = useState(
    filters.max_price ? String(filters.max_price) : "",
  );

  useEffect(() => {
    setMinPrice(filters.min_price ? String(filters.min_price) : "");
    setMaxPrice(filters.max_price ? String(filters.max_price) : "");
  }, [filters.min_price, filters.max_price]);

  function apply(patch: Partial<ProductQueryParams>) {
    router.push(productsHref(filters, patch), { scroll: false });
  }

  function applyPrice() {
    apply({
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  function clearAll() {
    // فقط جست‌وجو و مرتب‌سازی را نگه می‌داریم.
    router.push(
      productsHref(
        { search: filters.search, ordering: filters.ordering },
        {},
      ),
      { scroll: false },
    );
  }

  return (
    <div dir="rtl" className="rounded-2xl border border-silver/60 bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-bold text-iron-grey">فیلترها</h2>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-accent transition-colors hover:bg-brand-accent/10"
        >
          حذف همه
        </button>
      </div>

      {/* دسته‌بندی */}
      <Group label="دسته‌بندی">
        {isMobile ? (
          <OptionList
            ariaLabel="فیلتر دسته‌بندی"
            allLabel="همه دسته‌ها"
            selected={filters.category ?? ""}
            options={categories.map((c) => ({
              value: c.slug,
              label: c.full_path || c.name_fa,
            }))}
            onSelect={(value) => apply({ category: value || undefined })}
          />
        ) : (
          <FilterDropdown
            ariaLabel="فیلتر دسته‌بندی"
            allLabel="همه دسته‌ها"
            selected={filters.category ?? ""}
            options={categories.map((c) => ({
              value: c.slug,
              label: c.full_path || c.name_fa,
            }))}
            onSelect={(value) => apply({ category: value || undefined })}
          />
        )}
      </Group>

      {/* برند */}
      <Group label="برند">
        {isMobile ? (
          <OptionList
            ariaLabel="فیلتر برند"
            allLabel="همه برندها"
            selected={filters.brand ?? ""}
            options={brands.map((b) => ({ value: b.slug, label: b.name_fa }))}
            onSelect={(value) => apply({ brand: value || undefined })}
          />
        ) : (
          <FilterDropdown
            ariaLabel="فیلتر برند"
            allLabel="همه برندها"
            selected={filters.brand ?? ""}
            options={brands.map((b) => ({ value: b.slug, label: b.name_fa }))}
            onSelect={(value) => apply({ brand: value || undefined })}
          />
        )}
      </Group>

      {/* رنگ */}
      {colors.length > 0 && (
        <Group label="رنگ">
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const value = String(color.id);
              const active = filters.color === value;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => apply({ color: active ? undefined : value })}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-[2.25rem] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-brand-accent bg-brand-accent/10 text-brand-dark"
                      : "border-silver/70 bg-white text-blue-slate hover:border-brand-accent",
                  )}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-silver/70"
                    style={{ backgroundColor: color.hex_code || "#ccc" }}
                    aria-hidden
                  />
                  {color.name_fa}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      {/* سایز */}
      {sizes.length > 0 && (
        <Group label="سایز">
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const value = String(size.id);
              const active = filters.size === value;
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => apply({ size: active ? undefined : value })}
                  aria-pressed={active}
                  className={cn(
                    "min-h-[2.25rem] min-w-[2.75rem] rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors",
                    active
                      ? "border-brand-accent bg-brand-accent/10 text-brand-dark"
                      : "border-silver/70 bg-white text-blue-slate hover:border-brand-accent",
                  )}
                >
                  {size.name_fa}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      {/* بازه قیمت */}
      <Group label="بازه قیمت (تومان)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="از"
            className="input-field flex-1"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            aria-label="حداقل قیمت"
          />
          <span className="shrink-0 text-xs text-brand-muted">تا</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="تا"
            className="input-field flex-1"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            aria-label="حداکثر قیمت"
          />
        </div>
        <button
          type="button"
          onClick={applyPrice}
          className="mt-2.5 w-full rounded-lg border border-silver/70 bg-brand-light px-3 py-2 text-sm font-semibold text-iron-grey transition-colors hover:border-brand-dark hover:bg-white"
        >
          اعمال قیمت
        </button>
      </Group>

      {/* سوییچ‌ها */}
      <div className="space-y-1.5">
        <Toggle
          label="فقط کالاهای موجود"
          checked={Boolean(filters.in_stock)}
          onChange={(v) => apply({ in_stock: v || undefined })}
        />
        <Toggle
          label="فقط کالاهای تخفیف‌دار"
          checked={Boolean(filters.has_discount)}
          onChange={(v) => apply({ has_discount: v || undefined })}
        />
        <Toggle
          label="فقط محصولات منتخب"
          checked={Boolean(filters.is_featured)}
          onChange={(v) => apply({ is_featured: v || undefined })}
        />
      </div>
    </div>
  );
}

/**
 * دراپ‌داون سفارشیِ جمع‌شونده برای دسکتاپ (جایگزین select نیتیو).
 *
 * پنل گزینه‌ها به‌صورت absolute داخل wrapperِ relative باز می‌شود، عرضش برابر
 * sidebar است (از کادر بیرون نمی‌زند)، max-height و scroll داخلی دارد، و با
 * انتخاب/کلیک بیرون/Escape بسته می‌شود.
 */
function FilterDropdown({
  ariaLabel,
  allLabel,
  options,
  selected,
  onSelect,
}: {
  ariaLabel: string;
  allLabel: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const currentLabel =
    options.find((o) => o.value === selected)?.label ?? allLabel;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(value: string) {
    onSelect(value);
    setOpen(false);
  }

  const all = [{ value: "", label: allLabel }, ...options];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="input-field flex items-center justify-between gap-2 text-right"
      >
        <span className="min-w-0 flex-1 truncate">{currentLabel}</span>
        <ChevronIcon className={"h-4 w-4 shrink-0 text-brand-muted transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 left-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-silver bg-white p-1 shadow-card"
        >
          {all.map((opt) => {
            const active = selected === opt.value;
            return (
              <button
                key={opt.value || "__all__"}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => choose(opt.value)}
                className={
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-right text-sm leading-5 transition-colors " +
                  (active
                    ? "bg-brand-accent/10 font-semibold text-brand-dark"
                    : "text-brand-dark/80 hover:bg-brand-light")
                }
              >
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                {active && <CheckIcon />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * انتخاب‌گر سفارشیِ داخلِ drawer (جایگزین select نیتیو در موبایل).
 * گزینه‌ها داخل یک box با scroll داخلی‌اند و از کادر بیرون نمی‌زنند.
 */
function OptionList({
  ariaLabel,
  allLabel,
  options,
  selected,
  onSelect,
}: {
  ariaLabel: string;
  allLabel: string;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const all = [{ value: "", label: allLabel }, ...options];
  return (
    <div
      role="listbox"
      aria-label={ariaLabel}
      className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-brand-muted/30 bg-white p-2"
    >
      {all.map((opt) => {
        const active = selected === opt.value;
        return (
          <button
            key={opt.value || "__all__"}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(opt.value)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-right text-sm leading-6 transition-colors",
              active
                ? "border-brand-accent bg-brand-accent/10 font-semibold text-brand-dark"
                : "border-transparent text-brand-dark/80 hover:bg-brand-light",
            )}
          >
            <span className="break-words">{opt.label}</span>
            {active && <CheckIcon />}
          </button>
        );
      })}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-brand-accent"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 border-b border-silver/40 pb-4">
      <h3 className="mb-2.5 text-sm font-bold text-iron-grey">{label}</h3>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-[2.5rem] cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm text-iron-grey transition-colors hover:bg-brand-light">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-silver accent-brand-accent focus:ring-brand-accent"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
