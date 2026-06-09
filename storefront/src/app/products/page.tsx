"use client";

/**
 * Product catalog / listing page.
 *
 * - Sidebar faceted filters (category, brand, price range, color, size, stock).
 * - Responsive product-card grid + pagination.
 * - Filter state is the single source of truth in the URL search params, so the
 *   page is fully deep-linkable and survives refresh / back-forward navigation.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { FilterSidebar } from "@/components/catalog/FilterSidebar";
import { Pagination } from "@/components/catalog/Pagination";
import { ProductCard } from "@/components/catalog/ProductCard";
import {
  PAGE_SIZE,
  filtersToStorefrontQuery,
  getBrands,
  getCategories,
  getProducts,
  parseFilters,
} from "@/services/productService";
import type {
  Brand,
  CatalogFilters,
  Category,
  Paginated,
  ProductListItem,
  SortOption,
} from "@/types/product";

/** Curated facet vocabularies for the JSONB variant-attribute filters. */
const COLOR_OPTIONS = ["Black", "White", "Red", "Blue", "Green", "Grey"];
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "38", "40", "42", "44"];

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  title_asc: "Name: A–Z",
};

function CatalogView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [data, setData] = useState<Paginated<ProductListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  /* ------------------------- URL is the source of truth ------------------- */
  const applyFilters = useCallback(
    (next: CatalogFilters) => {
      const query = filtersToStorefrontQuery(next);
      router.replace(query ? `/products?${query}` : "/products", {
        scroll: false,
      });
    },
    [router],
  );

  /* ------------------------------ data loading --------------------------- */
  // Static reference data (once).
  useEffect(() => {
    let cancelled = false;
    Promise.all([getCategories(), getBrands()])
      .then(([cats, brs]) => {
        if (cancelled) return;
        setCategories(cats);
        setBrands(brs);
      })
      .catch(() => {
        /* reference data is non-critical; filters still render empty */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Products (re-fetch whenever the URL/filters change).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProducts(filters)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn’t load products. Please retry.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const currentPage = filters.page ?? 1;
  const total = data?.count ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 border-b border-silver pb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-bondi-blue">
          Shop
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-iron-grey">
          All Products
        </h1>
        <p className="mt-1 text-sm text-blue-slate">
          {loading ? "Loading…" : `${total} product${total === 1 ? "" : "s"} found`}
        </p>
      </header>

      {/* Toolbar: search + sort + mobile filter toggle */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SearchBox
          value={filters.search ?? ""}
          onSubmit={(search) => applyFilters({ ...filters, search: search || undefined, page: 1 })}
        />
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="sort" className="sr-only">
            Sort products
          </label>
          <select
            id="sort"
            className="input-field w-auto"
            value={filters.sort ?? "newest"}
            onChange={(e) =>
              applyFilters({ ...filters, sort: e.target.value as SortOption, page: 1 })
            }
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((o) => !o)}
            className="btn-ghost px-4 py-2 text-sm lg:hidden"
            aria-expanded={mobileFiltersOpen}
          >
            Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <div className={mobileFiltersOpen ? "block" : "hidden lg:block"}>
          <FilterSidebar
            categories={categories}
            brands={brands}
            colorOptions={COLOR_OPTIONS}
            sizeOptions={SIZE_OPTIONS}
            filters={filters}
            onChange={applyFilters}
          />
        </div>

        {/* Results */}
        <section aria-live="polite">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
              {error}
            </div>
          ) : loading ? (
            <SkeletonGrid />
          ) : !data || data.results.length === 0 ? (
            <EmptyState onClear={() => applyFilters({ sort: filters.sort })} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {data.results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination
                page={currentPage}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={(page) => {
                  applyFilters({ ...filters, page });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/* ------------------------------ subcomponents ------------------------------ */

function SearchBox({
  value,
  onSubmit,
}: {
  value: string;
  onSubmit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft.trim());
      }}
      className="flex w-full max-w-sm items-center gap-2"
      role="search"
    >
      <input
        type="search"
        className="input-field"
        placeholder="Search gear…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label="Search products"
      />
      <button type="submit" className="btn-primary px-4 py-2 text-sm">
        Search
      </button>
    </form>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-xl border border-silver bg-dust-grey"
        >
          <div className="aspect-square bg-silver/50" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-1/3 rounded bg-silver/60" />
            <div className="h-4 w-3/4 rounded bg-silver/60" />
            <div className="h-5 w-1/2 rounded bg-silver/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-xl border border-silver bg-dust-grey p-12 text-center">
      <h2 className="text-lg font-bold text-iron-grey">No products match</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-blue-slate">
        Try adjusting or clearing your filters to see more of our range.
      </p>
      <button type="button" onClick={onClear} className="btn-primary mt-5">
        Clear filters
      </button>
    </div>
  );
}

/* ------------------------------- page export ------------------------------- */

export default function ProductsPage() {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <CatalogView />
    </Suspense>
  );
}

function CatalogFallback() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
    </main>
  );
}
