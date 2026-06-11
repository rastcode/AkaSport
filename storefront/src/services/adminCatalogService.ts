/**
 * لایه‌ی سرویس مدیریت کاتالوگ (ADMIN / OWNER) — متصل به Backend Catalog API واقعی.
 *
 * از کلاینت axios احراز هویت‌شده‌ی پروژه (`@/lib/api`) استفاده می‌کند تا توکن JWT
 * به‌صورت خودکار ضمیمه شود. هیچ endpoint جدیدی ساخته نشده و از productService
 * قدیمی یا apps.products استفاده نمی‌شود.
 *
 * نکته‌ی فهرست: endpoint عمومی `/catalog/products/` وقتی با توکن staff فراخوانی
 * شود، همه‌ی وضعیت‌ها (نه فقط منتشرشده) را برمی‌گرداند و فیلتر/جست‌وجو/مرتب‌سازی
 * سمت‌سرور دارد. بنابراین فهرست ادمین از همین endpoint با احراز هویت استفاده
 * می‌کند.
 *
 * نکته‌ی نوشتن: عملیات CRUD از مسیرهای ادمین (`/catalog/admin/...`) انجام می‌شود
 * که با `IsAdminOrOwner` محافظت شده‌اند.
 */

import api from "@/lib/api";
import type {
  Brand,
  Category,
  Color,
  PaginatedResponse,
  ProductDetail,
  ProductImage,
  ProductListItem,
  ProductQueryParams,
  Size,
} from "@/types/catalog";
import type {
  AdminProductWritePayload,
  AdminVariantWritePayload,
} from "@/types/adminCatalog";
import type { AdminProductReview, ReviewStatus } from "@/types/review";

const CATALOG = "/catalog";
const ADMIN = "/catalog/admin";

/** ساخت پارامترهای کوئری فهرست محصولات (همان قرارداد بک‌اند). */
function productParams(params: ProductQueryParams): Record<string, string> {
  const q: Record<string, string> = {};
  if (params.page && params.page > 1) q.page = String(params.page);
  if (params.search) q.search = params.search;
  if (params.category) q.category = params.category;
  if (params.brand) q.brand = params.brand;
  if (typeof params.min_price === "number") q.min_price = String(params.min_price);
  if (typeof params.max_price === "number") q.max_price = String(params.max_price);
  if (params.color) q.color = params.color;
  if (params.size) q.size = params.size;
  if (params.in_stock) q.in_stock = "true";
  if (params.has_discount) q.has_discount = "true";
  if (params.is_featured) q.is_featured = "true";
  if (params.ordering) q.ordering = params.ordering;
  return q;
}

/**
 * فهرست محصولات برای ادمین (با توکن staff → همه‌ی وضعیت‌ها).
 * صفحه‌بندی و فیلترهای سمت‌سرور حفظ می‌شوند.
 */
export async function listAdminProducts(
  params: ProductQueryParams = {},
): Promise<PaginatedResponse<ProductListItem>> {
  const { data } = await api.get<PaginatedResponse<ProductListItem>>(
    `${CATALOG}/products/`,
    { params: productParams(params) },
  );
  return data;
}

/** دریافت یک محصول کامل برای ویرایش (مسیر ادمین، با اسلاگ). */
export async function getAdminProduct(slug: string): Promise<ProductDetail> {
  const { data } = await api.get<ProductDetail>(
    `${ADMIN}/products/${encodeURIComponent(slug)}/`,
  );
  return data;
}

/**
 * ساخت محصول جدید؛ ProductDetail ساخته‌شده را برمی‌گرداند.
 *
 * نکته: interceptor پاسخ در `@/lib/api` خطاها را پیش‌تر به `ApiError` (شامل
 * `fieldErrors`) نرمال‌سازی می‌کند، پس همان خطا مستقیماً propagate می‌شود و
 * فراخواننده با `err as ApiError` آن را مدیریت می‌کند.
 */
export async function createAdminProduct(
  payload: AdminProductWritePayload,
): Promise<ProductDetail> {
  const { data } = await api.post<ProductDetail>(`${ADMIN}/products/`, payload);
  return data;
}

/** ویرایش محصول (PATCH؛ بدون ارسال variants تا تنوع‌ها دست‌نخورده بمانند). */
export async function updateAdminProduct(
  slug: string,
  payload: Partial<AdminProductWritePayload>,
): Promise<ProductDetail> {
  const { data } = await api.patch<ProductDetail>(
    `${ADMIN}/products/${encodeURIComponent(slug)}/`,
    payload,
  );
  return data;
}

/** حذف محصول (hard delete در بک‌اند). */
export async function deleteAdminProduct(slug: string): Promise<void> {
  await api.delete(`${ADMIN}/products/${encodeURIComponent(slug)}/`);
}

/**
 * تغییر فقط فلگ «محصول ویژه» (is_featured) با PATCH جزئی؛ هیچ فیلد دیگری از
 * محصول overwrite نمی‌شود.
 */
export async function setProductFeatured(
  slug: string,
  isFeatured: boolean,
): Promise<ProductDetail> {
  const { data } = await api.patch<ProductDetail>(
    `${ADMIN}/products/${encodeURIComponent(slug)}/`,
    { is_featured: isFeatured },
  );
  return data;
}

/* ------------------------------- تنوع‌ها --------------------------------- */

export async function createVariant(
  payload: AdminVariantWritePayload,
): Promise<void> {
  await api.post(`${ADMIN}/variants/`, payload);
}

export async function updateVariant(
  id: number,
  payload: Partial<AdminVariantWritePayload>,
): Promise<void> {
  await api.patch(`${ADMIN}/variants/${id}/`, payload);
}

export async function deleteVariant(id: number): Promise<void> {
  await api.delete(`${ADMIN}/variants/${id}/`);
}

/* ------------------------------- تصاویر --------------------------------- */

/**
 * آپلود تصویر محصول (multipart). `form` باید شامل product و image باشد و
 * اختیاری variant/alt_text_fa/is_primary/display_order.
 *
 * نکته: axios هنگام دیدن FormData، هدر Content-Type را خودش با boundary صحیح
 * تنظیم می‌کند، پس نیازی به تعیین دستی نیست.
 */
export async function uploadProductImage(
  form: FormData,
): Promise<ProductImage> {
  const { data } = await api.post<ProductImage>(`${ADMIN}/images/`, form);
  return data;
}

/** حذف یک تصویر محصول. */
export async function deleteProductImage(id: number): Promise<void> {
  await api.delete(`${ADMIN}/images/${id}/`);
}

/* ------------------------------- lookupها -------------------------------- */

/** دریافت همه‌ی صفحه‌های یک endpoint صفحه‌بندی‌شده. */
async function fetchAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | null = path;
  // سقف ایمنی برای جلوگیری از حلقه‌ی بی‌پایان.
  for (let guard = 0; guard < 50 && next; guard += 1) {
    const { data }: { data: PaginatedResponse<T> | T[] } = await api.get(next);
    if (Array.isArray(data)) {
      out.push(...data);
      break;
    }
    out.push(...data.results);
    next = data.next ? data.next.replace(/^.*\/api/, "") : null;
  }
  return out;
}

export interface CatalogLookups {
  categories: Category[];
  brands: Brand[];
  colors: Color[];
  sizes: Size[];
}

/** lookupهای لازم برای فرم‌ها (دسته/برند/رنگ/سایز) — همه‌ی صفحه‌ها. */
export async function getCatalogLookups(): Promise<CatalogLookups> {
  const [categories, brands, colors, sizes] = await Promise.all([
    fetchAll<Category>(`${ADMIN}/categories/`),
    fetchAll<Brand>(`${ADMIN}/brands/`),
    fetchAll<Color>(`${ADMIN}/colors/`),
    fetchAll<Size>(`${ADMIN}/sizes/`),
  ]);
  return { categories, brands, colors, sizes };
}

/* --------------------- CRUD دسته‌بندی / برند / رنگ / سایز -------------------- */
/* همه از endpointهای موجودِ ادمین استفاده می‌کنند. ورودی می‌تواند FormData (برای
 * آپلود تصویر/لوگو) یا یک شیء ساده (JSON) باشد؛ axios هدر مناسب را خودش می‌سازد. */

type WriteBody = FormData | Record<string, unknown>;

// --- دسته‌بندی (lookup با slug) ---
export async function listCategories(): Promise<Category[]> {
  return fetchAll<Category>(`${ADMIN}/categories/`);
}
export async function createCategory(body: WriteBody): Promise<Category> {
  const { data } = await api.post<Category>(`${ADMIN}/categories/`, body);
  return data;
}
export async function updateCategory(slug: string, body: WriteBody): Promise<Category> {
  const { data } = await api.patch<Category>(
    `${ADMIN}/categories/${encodeURIComponent(slug)}/`,
    body,
  );
  return data;
}
export async function deleteCategory(slug: string): Promise<void> {
  await api.delete(`${ADMIN}/categories/${encodeURIComponent(slug)}/`);
}

// --- برند (lookup با slug) ---
export async function listBrands(): Promise<Brand[]> {
  return fetchAll<Brand>(`${ADMIN}/brands/`);
}
export async function createBrand(body: WriteBody): Promise<Brand> {
  const { data } = await api.post<Brand>(`${ADMIN}/brands/`, body);
  return data;
}
export async function updateBrand(slug: string, body: WriteBody): Promise<Brand> {
  const { data } = await api.patch<Brand>(
    `${ADMIN}/brands/${encodeURIComponent(slug)}/`,
    body,
  );
  return data;
}
export async function deleteBrand(slug: string): Promise<void> {
  await api.delete(`${ADMIN}/brands/${encodeURIComponent(slug)}/`);
}

// --- رنگ (lookup با id) ---
export async function listColors(): Promise<Color[]> {
  return fetchAll<Color>(`${ADMIN}/colors/`);
}
export async function createColor(body: WriteBody): Promise<Color> {
  const { data } = await api.post<Color>(`${ADMIN}/colors/`, body);
  return data;
}
export async function updateColor(id: number, body: WriteBody): Promise<Color> {
  const { data } = await api.patch<Color>(`${ADMIN}/colors/${id}/`, body);
  return data;
}
export async function deleteColor(id: number): Promise<void> {
  await api.delete(`${ADMIN}/colors/${id}/`);
}

// --- نظرات (lookup با id) ---
export interface AdminReviewQuery {
  status?: ReviewStatus;
  product?: string;
  search?: string;
  page?: number;
}

export async function listAdminReviews(
  query: AdminReviewQuery = {},
): Promise<PaginatedResponse<AdminProductReview>> {
  const params: Record<string, string | number> = {};
  if (query.status) params.status = query.status;
  if (query.product) params.product = query.product;
  if (query.search) params.search = query.search;
  if (query.page && query.page > 1) params.page = query.page;
  const { data } = await api.get<
    PaginatedResponse<AdminProductReview> | AdminProductReview[]
  >(`${ADMIN}/reviews/`, { params });
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return data;
}

export async function updateReviewStatus(
  id: number,
  status: ReviewStatus,
): Promise<AdminProductReview> {
  const { data } = await api.patch<AdminProductReview>(`${ADMIN}/reviews/${id}/`, {
    status,
  });
  return data;
}

export async function deleteReview(id: number): Promise<void> {
  await api.delete(`${ADMIN}/reviews/${id}/`);
}

// --- سایز (lookup با id) ---
export async function listSizes(): Promise<Size[]> {
  return fetchAll<Size>(`${ADMIN}/sizes/`);
}
export async function createSize(body: WriteBody): Promise<Size> {
  const { data } = await api.post<Size>(`${ADMIN}/sizes/`, body);
  return data;
}
export async function updateSize(id: number, body: WriteBody): Promise<Size> {
  const { data } = await api.patch<Size>(`${ADMIN}/sizes/${id}/`, body);
  return data;
}
export async function deleteSize(id: number): Promise<void> {
  await api.delete(`${ADMIN}/sizes/${id}/`);
}
