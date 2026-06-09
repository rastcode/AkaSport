"use client";

/**
 * پنل فیلترهای کاتالوگ (RTL / فارسی) — Client Component.
 *
 * مقدار اولیه‌ی فیلترها از URL خوانده می‌شود (prop `filters`) و با هر تغییر، URL
 * به‌روزرسانی می‌شود تا لینک قابل اشتراک باشد. داده‌های مرجع (دسته/برند/رنگ/سایز)
 * سمت سرور گرفته و به این کامپوننت پاس می‌شوند تا fetch سمت کلاینت نداشته باشیم.
 */

import { useEffect, useState } from "react";
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
}

export function CatalogFilters({ filters, categories, brands, colors, sizes }: Props) {
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
    <div dir="rtl" className="rounded-xl border border-silver bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-iron-grey">فیلترها</h2>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs font-semibold text-bondi-blue hover:text-bondi-blue-dark"
        >
          حذف همه
        </button>
      </div>

      {/* دسته‌بندی */}
      <Group label="دسته‌بندی">
        <select
          className="input-field"
          value={filters.category ?? ""}
          onChange={(e) => apply({ category: e.target.value || undefined })}
          aria-label="فیلتر دسته‌بندی"
        >
          <option value="">همه دسته‌ها</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.full_path || c.name_fa}
            </option>
          ))}
        </select>
      </Group>

      {/* برند */}
      <Group label="برند">
        <select
          className="input-field"
          value={filters.brand ?? ""}
          onChange={(e) => apply({ brand: e.target.value || undefined })}
          aria-label="فیلتر برند"
        >
          <option value="">همه برندها</option>
          {brands.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name_fa}
            </option>
          ))}
        </select>
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
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-bondi-blue bg-bondi-blue text-white"
                      : "border-silver bg-white text-blue-slate hover:border-bondi-blue",
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
                    "min-w-[2.75rem] rounded-lg border px-2 py-1 text-xs font-semibold transition-colors",
                    active
                      ? "border-bondi-blue bg-bondi-blue text-white"
                      : "border-silver bg-white text-blue-slate hover:border-bondi-blue",
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
            className="input-field"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            aria-label="حداقل قیمت"
          />
          <span className="text-silver">تا</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="تا"
            className="input-field"
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
          className="mt-2 w-full rounded-lg border border-bondi-blue px-3 py-1.5 text-sm font-semibold text-bondi-blue transition-colors hover:bg-bondi-blue hover:text-white"
        >
          اعمال قیمت
        </button>
      </Group>

      {/* سوییچ‌ها */}
      <div className="space-y-2">
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

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 border-b border-dust-grey pb-5">
      <h3 className="mb-2 text-sm font-semibold text-blue-slate">{label}</h3>
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
    <label className="flex cursor-pointer items-center gap-2 text-sm text-iron-grey">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-silver text-bondi-blue focus:ring-bondi-blue"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
