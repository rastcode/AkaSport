"use client";

/**
 * Faceted filter sidebar.
 *
 * Holds local draft state and pushes a clean, bookmarkable query string to the
 * URL on apply (price/search are debounced-on-submit; selects apply instantly).
 * Reads its initial state from the `filters` prop (derived from the URL), so it
 * stays in sync with deep links and the browser back/forward buttons.
 */

import { useEffect, useMemo, useState } from "react";

import type { Brand, CatalogFilters, Category } from "@/types/product";

interface FilterSidebarProps {
  categories: Category[];
  brands: Brand[];
  /** Distinct facet values discovered from the current result set. */
  colorOptions: string[];
  sizeOptions: string[];
  filters: CatalogFilters;
  onChange: (next: CatalogFilters) => void;
}

export function FilterSidebar({
  categories,
  brands,
  colorOptions,
  sizeOptions,
  filters,
  onChange,
}: FilterSidebarProps) {
  // Local draft for the numeric/text inputs (applied on submit).
  const [minPrice, setMinPrice] = useState<string>(
    filters.minPrice ? String(filters.minPrice) : "",
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    filters.maxPrice ? String(filters.maxPrice) : "",
  );

  // Keep drafts in sync when filters change externally (e.g. back button).
  useEffect(() => {
    setMinPrice(filters.minPrice ? String(filters.minPrice) : "");
    setMaxPrice(filters.maxPrice ? String(filters.maxPrice) : "");
  }, [filters.minPrice, filters.maxPrice]);

  const activeCount = useMemo(
    () =>
      [
        filters.category,
        filters.brand,
        filters.minPrice,
        filters.maxPrice,
        filters.color,
        filters.size,
        filters.inStock ? "1" : undefined,
      ].filter(Boolean).length,
    [filters],
  );

  function patch(partial: Partial<CatalogFilters>) {
    // Any filter change resets pagination to page 1.
    onChange({ ...filters, ...partial, page: 1 });
  }

  function applyPrice() {
    patch({
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  function clearAll() {
    setMinPrice("");
    setMaxPrice("");
    onChange({ sort: filters.sort, search: filters.search, page: 1 });
  }

  return (
    <aside
      aria-label="Product filters"
      className="h-fit rounded-xl border border-silver bg-white p-5 lg:sticky lg:top-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-iron-grey">Filters</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-bondi-blue hover:text-bondi-blue-dark"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {/* Category */}
      <FilterGroup label="Category">
        <select
          className="input-field"
          value={filters.category ?? ""}
          onChange={(e) => patch({ category: e.target.value || undefined })}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.full_path ?? c.name}
            </option>
          ))}
        </select>
      </FilterGroup>

      {/* Brand */}
      <FilterGroup label="Brand">
        <select
          className="input-field"
          value={filters.brand ?? ""}
          onChange={(e) => patch({ brand: e.target.value || undefined })}
          aria-label="Filter by brand"
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </FilterGroup>

      {/* Price range */}
      <FilterGroup label="Price range">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Min"
            className="input-field"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            aria-label="Minimum price"
          />
          <span className="text-silver">–</span>
          <input
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Max"
            className="input-field"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={applyPrice}
            onKeyDown={(e) => e.key === "Enter" && applyPrice()}
            aria-label="Maximum price"
          />
        </div>
        <button
          type="button"
          onClick={applyPrice}
          className="mt-2 w-full rounded-lg border border-bondi-blue px-3 py-1.5 text-sm
                     font-semibold text-bondi-blue transition-colors hover:bg-bondi-blue
                     hover:text-white"
        >
          Apply price
        </button>
      </FilterGroup>

      {/* Color facet (variant attribute) */}
      {colorOptions.length > 0 && (
        <FilterGroup label="Color">
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => {
              const active = filters.color === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => patch({ color: active ? undefined : color })}
                  aria-pressed={active}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                    (active
                      ? "border-bondi-blue bg-bondi-blue text-white"
                      : "border-silver bg-white text-blue-slate hover:border-bondi-blue")
                  }
                >
                  {color}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* Size facet (variant attribute) */}
      {sizeOptions.length > 0 && (
        <FilterGroup label="Size">
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((size) => {
              const active = filters.size === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => patch({ size: active ? undefined : size })}
                  aria-pressed={active}
                  className={
                    "min-w-[2.5rem] rounded-lg border px-2 py-1 text-xs font-semibold transition-colors " +
                    (active
                      ? "border-bondi-blue bg-bondi-blue text-white"
                      : "border-silver bg-white text-blue-slate hover:border-bondi-blue")
                  }
                >
                  {size}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* In-stock toggle */}
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-iron-grey">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-silver text-bondi-blue focus:ring-bondi-blue"
          checked={Boolean(filters.inStock)}
          onChange={(e) => patch({ inStock: e.target.checked || undefined })}
        />
        In stock only
      </label>
    </aside>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 border-b border-dust-grey pb-5 last:border-none">
      <h3 className="mb-2 text-sm font-semibold text-blue-slate">{label}</h3>
      {children}
    </div>
  );
}
