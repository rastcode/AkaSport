/**
 * Product catalog type definitions.
 *
 * Mirrors the Django REST backend (Part 2): Category, Brand, Product,
 * ProductVariant. Dynamic fields (`specifications`, variant `attributes`) are
 * typed as flexible JSON maps because their keys vary per category schema.
 */

/* ------------------------------- primitives -------------------------------- */

/** A JSON-serialisable scalar stored in dynamic attribute maps. */
export type JsonScalar = string | number | boolean | null;

/** Dynamic key/value map for `specifications` and variant `attributes`. */
export type AttributeMap = Record<string, JsonScalar>;

export type ProductStatus = "DRAFT" | "PUBLISHED" | "OUT_OF_STOCK";

/* ------------------------------- categories -------------------------------- */

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  full_path?: string;
  description?: string;
  is_active?: boolean;
  dynamic_attributes_schema?: Record<string, AttributeSchemaEntry>;
}

/** A single attribute definition inside a category's blueprint. */
export interface AttributeSchemaEntry {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  label?: string;
  required?: boolean;
  choices?: JsonScalar[];
}

/** Recursive category node returned by the `/categories/tree/` endpoint. */
export interface CategoryTreeNode {
  id: number;
  name: string;
  /** Persian name from the new catalog API (`name_fa`); optional for legacy. */
  name_fa?: string;
  slug: string;
  dynamic_attributes_schema?: Record<string, AttributeSchemaEntry>;
  children: CategoryTreeNode[];
}

/* --------------------------------- brands ---------------------------------- */

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  description?: string;
  is_active?: boolean;
}

/* -------------------------------- variants --------------------------------- */

export interface ProductVariant {
  id: number;
  sku: string;
  price_modifier: string; // DRF DecimalField serialises to string
  final_price: string;
  stock_quantity: number;
  is_in_stock: boolean;
  /** Discriminating options, e.g. { size: 42, color: "Red" }. */
  attributes: AttributeMap;
  is_active: boolean;
}

/* -------------------------------- images ----------------------------------- */

export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
}

/* -------------------------------- products --------------------------------- */

/** Lightweight product shape from the list endpoint. */
export interface ProductListItem {
  id: number;
  title: string;
  slug: string;
  brand: string | null;
  category: string | null;
  base_price: string;
  status: ProductStatus;
  is_featured: boolean;
  in_stock: boolean;
  primary_image: string | null;
}

/** Full product shape from the detail (retrieve) endpoint. */
export interface Product {
  id: number;
  title: string;
  slug: string;
  description: string;
  brand: Brand | null;
  category: Category | null;
  base_price: string;
  status: ProductStatus;
  /** Dynamic spec map validated against the category schema on the backend. */
  specifications: AttributeMap;
  /** Effective (merged ancestry) schema for labelling specs nicely. */
  effective_schema?: Record<string, AttributeSchemaEntry>;
  is_featured: boolean;
  total_stock: number;
  in_stock: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
}

/* ---------------------------- API envelopes -------------------------------- */

/** DRF PageNumberPagination envelope. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/* ----------------------------- filter model -------------------------------- */

/** Sort options exposed in the catalog UI (maps to DRF `ordering`). */
export type SortOption =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "title_asc";

/**
 * Normalised, URL-syncable catalog filter state.
 * Empty/zero fields are omitted from the query string.
 */
export interface CatalogFilters {
  category?: string; // category slug
  brand?: string; // brand slug
  minPrice?: number;
  maxPrice?: number;
  color?: string; // variant attribute facet
  size?: string; // variant attribute facet
  inStock?: boolean;
  search?: string;
  sort?: SortOption;
  page?: number;
}
