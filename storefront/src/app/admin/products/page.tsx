"use client";

/**
 * مدیریت محصولات — فهرست (ADMIN / OWNER) — RTL / فارسی.
 *
 * فهرست از endpoint عمومی `/catalog/products/` با توکن staff خوانده می‌شود تا
 * همه‌ی وضعیت‌ها دیده شوند. فیلترهای جست‌وجو/دسته/برند/تخفیف/موجودی سمت‌سرور
 * اعمال می‌شوند و صفحه‌بندی بک‌اند حفظ می‌شود. فیلتر «وضعیت» سمت‌سرور پشتیبانی
 * نمی‌شود، پس روی صفحه‌ی جاری سمت‌کاربر اعمال می‌شود.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AdminProductRow } from "@/components/admin/products/AdminProductRow";
import { useAuth } from "@/context/AuthContext";
import {
  getCatalogLookups,
  listAdminProducts,
  type CatalogLookups,
} from "@/services/adminCatalogService";
import { formatNumber } from "@/lib/persian";
import type { ProductListItem, ProductQueryParams, ProductStatus } from "@/types/catalog";

type StatusFilter = "ALL" | ProductStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "همه وضعیت‌ها" },
  { value: "DRAFT", label: "پیش‌نویس" },
  { value: "PUBLISHED", label: "منتشرشده" },
  { value: "OUT_OF_STOCK", label: "ناموجود" },
  { value: "ARCHIVED", label: "بایگانی‌شده" },
];

const PAGE_SIZE = 20;

export default function AdminProductsPage() {
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";

  const [items, setItems] = useState<ProductListItem[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [lookups, setLookups] = useState<CatalogLookups | null>(null);

  // فیلترهای سمت‌سرور
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [page, setPage] = useState(1);

  // فیلتر سمت‌کاربر (صفحه‌ی جاری)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ProductQueryParams = {
        page,
        search: search || undefined,
        category: category || undefined,
        brand: brand || undefined,
        has_discount: onlyDiscount || undefined,
        in_stock: onlyInStock || undefined,
        ordering: "newest",
      };
      const data = await listAdminProducts(params);
      setItems(data.results);
      setCount(data.count);
      setHasNext(Boolean(data.next));
      setHasPrev(Boolean(data.previous));
    } catch {
      setError("خطا در دریافت محصولات. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }, [page, search, category, brand, onlyDiscount, onlyInStock]);

  useEffect(() => {
    if (authLoading || !isStaff) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isStaff, load]);

  useEffect(() => {
    if (authLoading || !isStaff) return;
    getCatalogLookups()
      .then(setLookups)
      .catch(() => setLookups({ categories: [], brands: [], colors: [], sizes: [] }));
  }, [authLoading, isStaff]);

  const visibleItems = useMemo(() => {
    if (statusFilter === "ALL") return items;
    return items.filter((p) => p.status === statusFilter);
  }, [items, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  function applySearch() {
    setPage(1);
    setSearch(searchInput.trim());
  }

  if (authLoading) return <CenterSpinner />;

  if (!isStaff) {
    return (
      <main dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-dust-grey/40 px-4 text-center">
        <p className="text-5xl font-black text-silver">۴۰۳</p>
        <h1 className="mt-2 text-xl font-bold text-iron-grey">دسترسی غیرمجاز</h1>
        <p className="mt-1 text-blue-slate">این بخش تنها برای مدیران و مالک فروشگاه در دسترس است.</p>
        <Link href="/" className="btn-primary mt-6">بازگشت به فروشگاه</Link>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-dust-grey/40">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* سربرگ */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-silver pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-iron-grey">مدیریت محصولات</h1>
            <p className="mt-1 text-sm text-blue-slate">
              {loading ? "در حال بارگذاری…" : `${formatNumber(count)} محصول`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/products/new" className="btn-primary">+ محصول جدید</Link>
            <Link href="/admin/dashboard" className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate transition-colors hover:border-bondi-blue hover:text-bondi-blue">
              ← داشبورد
            </Link>
          </div>
        </header>

        {/* فیلترها */}
        <div className="mb-6 space-y-3 rounded-xl border border-silver bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1">
              <label className="form-label" htmlFor="search">جست‌وجو</label>
              <input
                id="search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
                placeholder="نام محصول، برند یا دسته‌بندی"
                className="input-field"
              />
            </div>
            <div className="min-w-[10rem]">
              <label className="form-label" htmlFor="f-category">دسته‌بندی</label>
              <select id="f-category" className="input-field" value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }}>
                <option value="">همه</option>
                {lookups?.categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.full_path || c.name_fa}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[9rem]">
              <label className="form-label" htmlFor="f-brand">برند</label>
              <select id="f-brand" className="input-field" value={brand} onChange={(e) => { setPage(1); setBrand(e.target.value); }}>
                <option value="">همه</option>
                {lookups?.brands.map((b) => (
                  <option key={b.id} value={b.slug}>{b.name_fa}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={applySearch} className="btn-primary shrink-0">اعمال</button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-iron-grey">
              <input type="checkbox" checked={onlyDiscount} onChange={(e) => { setPage(1); setOnlyDiscount(e.target.checked); }} className="h-4 w-4 accent-bondi-blue" />
              فقط تخفیف‌دار
            </label>
            <label className="flex items-center gap-2 text-sm text-iron-grey">
              <input type="checkbox" checked={onlyInStock} onChange={(e) => { setPage(1); setOnlyInStock(e.target.checked); }} className="h-4 w-4 accent-bondi-blue" />
              فقط موجود
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-iron-grey" htmlFor="f-status">وضعیت (در این صفحه):</label>
              <select id="f-status" className="input-field !w-auto py-1.5" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                {STATUS_FILTERS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* محتوا */}
        {loading ? (
          <CenterSpinner inline />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-silver bg-white p-12 text-center">
            <p className="font-semibold text-iron-grey">محصولی با این فیلترها یافت نشد.</p>
            <Link href="/admin/products/new" className="btn-primary mt-5">ساخت اولین محصول</Link>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-xl border border-silver bg-white p-12 text-center">
            <p className="font-semibold text-iron-grey">در این صفحه محصولی با وضعیت انتخابی نیست.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((p) => (
              <AdminProductRow key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* صفحه‌بندی */}
        {!loading && !error && items.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button type="button" disabled={!hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate transition-colors hover:border-bondi-blue disabled:cursor-not-allowed disabled:opacity-40">
              صفحه‌ی قبلی →
            </button>
            <span className="text-sm text-blue-slate">صفحه‌ی {formatNumber(page)} از {formatNumber(totalPages)}</span>
            <button type="button" disabled={!hasNext} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate transition-colors hover:border-bondi-blue disabled:cursor-not-allowed disabled:opacity-40">
              ← صفحه‌ی بعدی
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function CenterSpinner({ inline = false }: { inline?: boolean }) {
  const spinner = <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />;
  if (inline) return <div className="flex justify-center py-16">{spinner}</div>;
  return <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">{spinner}</main>;
}
