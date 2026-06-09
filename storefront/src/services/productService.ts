/**
 * Product catalog service layer.
 *
 * Uses the native `fetch` API (not the axios client) so these functions run in
 * BOTH server components (SSR / generateMetadata) and client components. No
 * auth is required for public catalog reads.
 *
 * Responsibilities:
 *   - translate UI `CatalogFilters` <-> Django REST query params
 *     (including the JSONB `attr=` facet syntax from backend Part 2).
 *   - provide typed fetchers with sensible Next.js caching.
 */

import type {
  Brand,
  CatalogFilters,
  Category,
  CategoryTreeNode,
  Paginated,
  Product,
  ProductListItem,
  SortOption,
} from "@/types/product";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

export const PAGE_SIZE = 20;

/** Map the UI sort option to the backend `ordering` value. */
const SORT_TO_ORDERING: Record<SortOption, string> = {
  newest: "-created_at",
  price_asc: "base_price",
  price_desc: "-base_price",
  title_asc: "title",
};

const ORDERING_TO_SORT: Record<string, SortOption> = {
  "-created_at": "newest",
  base_price: "price_asc",
  "-base_price": "price_desc",
  title: "title_asc",
};

/* --------------------------------------------------------------------------- */
/* Filter <-> query-param translation                                          */
/* --------------------------------------------------------------------------- */

/**
 * Build a Django REST query string from UI filters.
 *
 * `color`/`size` collapse into the backend's faceted `attr=` syntax, e.g.
 *   { color: "Red", size: "42" } -> attr=color:Red,size:42
 */
export function filtersToQuery(filters: CatalogFilters): string {
  const params = new URLSearchParams();

  if (filters.category) params.set("category_slug", filters.category);
  if (filters.brand) params.set("brand_slug", filters.brand);
  if (typeof filters.minPrice === "number" && filters.minPrice > 0) {
    params.set("min_price", String(filters.minPrice));
  }
  if (typeof filters.maxPrice === "number" && filters.maxPrice > 0) {
    params.set("max_price", String(filters.maxPrice));
  }
  if (filters.inStock) params.set("in_stock", "true");
  if (filters.search) params.set("search", filters.search);

  // Dynamic JSONB variant-attribute facets.
  const attrFacets: string[] = [];
  if (filters.color) attrFacets.push(`color:${filters.color}`);
  if (filters.size) attrFacets.push(`size:${filters.size}`);
  if (attrFacets.length > 0) params.set("attr", attrFacets.join(","));

  if (filters.sort) params.set("ordering", SORT_TO_ORDERING[filters.sort]);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));

  return params.toString();
}

/**
 * Parse a `URLSearchParams`-like record (from `useSearchParams`) into the
 * normalised `CatalogFilters` model used by the UI.
 */
export function parseFilters(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
): CatalogFilters {
  const get = (key: string): string | undefined => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const toNumber = (value: string | undefined): number | undefined => {
    if (value === undefined || value === "") return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };

  const orderingRaw = get("ordering");
  const sortRaw = get("sort");
  const sort: SortOption | undefined =
    (sortRaw as SortOption | undefined) ??
    (orderingRaw ? ORDERING_TO_SORT[orderingRaw] : undefined);

  return {
    category: get("category") ?? get("category_slug"),
    brand: get("brand") ?? get("brand_slug"),
    minPrice: toNumber(get("minPrice") ?? get("min_price")),
    maxPrice: toNumber(get("maxPrice") ?? get("max_price")),
    color: get("color"),
    size: get("size"),
    inStock: get("inStock") === "true" || get("in_stock") === "true",
    search: get("search"),
    sort,
    page: toNumber(get("page")),
  };
}

/**
 * Serialise filters to a *clean storefront* query string (bookmarkable URL).
 * Unlike `filtersToQuery`, this keeps the UI-friendly key names.
 */
export function filtersToStorefrontQuery(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.minPrice) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
  if (filters.color) params.set("color", filters.color);
  if (filters.size) params.set("size", filters.size);
  if (filters.inStock) params.set("inStock", "true");
  if (filters.search) params.set("search", filters.search);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

/* --------------------------------------------------------------------------- */
/* Fetchers                                                                     */
/* --------------------------------------------------------------------------- */

async function fetchJson<T>(
  path: string,
  init?: RequestInit & { revalidate?: number },
): Promise<T> {
  const { revalidate, ...rest } = init ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    // Default: revalidate every 5 min for catalog data; override per call.
    next: revalidate !== undefined ? { revalidate } : { revalidate: 300 },
    ...rest,
  });

  if (!res.ok) {
    throw new ProductServiceError(
      `Request to ${path} failed`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

export class ProductServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ProductServiceError";
  }
}

/** Fetch a filtered, paginated product list. */
export async function getProducts(
  filters: CatalogFilters = {},
): Promise<Paginated<ProductListItem>> {
  const query = filtersToQuery(filters);
  // List results are filter-dependent; don't cache aggressively.
  return fetchJson<Paginated<ProductListItem>>(
    `/products/${query ? `?${query}` : ""}`,
    { cache: "no-store" },
  );
}

/**
 * Fetch a single product by slug. Returns `null` on 404 so callers can render
 * a not-found UI without try/catch noise.
 */
export async function getProductBySlug(
  slug: string,
  opts: { revalidate?: number } = {},
): Promise<Product | null> {
  try {
    return await fetchJson<Product>(`/products/${encodeURIComponent(slug)}/`, {
      revalidate: opts.revalidate ?? 300,
    });
  } catch (error) {
    if (error instanceof ProductServiceError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** Fetch the flat category list (for filter sidebars). */
export async function getCategories(): Promise<Category[]> {
  const data = await fetchJson<Paginated<Category> | Category[]>(
    "/categories/",
    { revalidate: 3600 },
  );
  return Array.isArray(data) ? data : data.results;
}

/** Fetch the nested category tree (for navigation menus). */
export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  return fetchJson<CategoryTreeNode[]>("/categories/tree/", {
    revalidate: 3600,
  });
}

/** Fetch the brand list. */
export async function getBrands(): Promise<Brand[]> {
  const data = await fetchJson<Paginated<Brand> | Brand[]>("/brands/", {
    revalidate: 3600,
  });
  return Array.isArray(data) ? data : data.results;
}

/** Resolve a media path to an absolute URL when the backend returns a relative one. */
export function resolveMediaUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const origin = API_BASE.replace(/\/api\/?$/, "");
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}
