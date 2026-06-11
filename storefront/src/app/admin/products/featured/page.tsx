"use client";

/**
 * مدیریت محصولات ویژه (ADMIN / OWNER) — RTL / فارسی.
 *
 * با فیلد موجودِ `is_featured` کار می‌کند؛ افزودن/حذف فقط همان فیلد را با PATCH
 * جزئی تغییر می‌دهد (بدون دست‌زدن به سایر فیلدها). همین محصولات در HeroProductWheel
 * صفحه‌ی اصلی نمایش داده می‌شوند.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { useAuth } from "@/context/AuthContext";
import {
  listAdminProducts,
  setProductFeatured,
} from "@/services/adminCatalogService";
import { resolveMediaUrl } from "@/services/catalogService";
import { ProductImagePlaceholder } from "@/components/products/ProductImagePlaceholder";
import { formatToman, formatNumber } from "@/lib/persian";
import type { ApiError } from "@/types/auth";
import type { ProductListItem } from "@/types/catalog";

const HERO_LIMIT = 6;

export default function FeaturedProductsPage() {
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";

  const [featured, setFeatured] = useState<ProductListItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  // جست‌وجو برای افزودن
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [searching, setSearching] = useState(false);

  const loadFeatured = useCallback(async () => {
    setLoadingFeatured(true);
    try {
      const data = await listAdminProducts({ is_featured: true, ordering: "newest" });
      setFeatured(data.results);
    } catch {
      setError("خطا در دریافت محصولات ویژه.");
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  const loadResults = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const data = await listAdminProducts({
        search: q || undefined,
        ordering: "newest",
      });
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isStaff) {
      setLoadingFeatured(false);
      return;
    }
    void loadFeatured();
  }, [authLoading, isStaff, loadFeatured]);

  useEffect(() => {
    if (authLoading || !isStaff) return;
    void loadResults(search);
  }, [authLoading, isStaff, search, loadResults]);

  const featuredSlugs = useMemo(
    () => new Set(featured.map((p) => p.slug)),
    [featured],
  );

  async function toggleFeatured(p: ProductListItem, makeFeatured: boolean) {
    setBusySlug(p.slug);
    setError(null);
    setNotice(null);
    try {
      await setProductFeatured(p.slug, makeFeatured);
      setNotice(
        makeFeatured ? "محصول به ویژه‌ها اضافه شد." : "محصول از ویژه‌ها حذف شد.",
      );
      await Promise.all([loadFeatured(), loadResults(search)]);
    } catch (err) {
      setError((err as ApiError)?.message ?? "عملیات ناموفق بود. دوباره تلاش کنید.");
    } finally {
      setBusySlug(null);
    }
  }

  function applySearch() {
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
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* سربرگ */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-silver pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-iron-grey">محصولات ویژه</h1>
            <p className="mt-1 text-sm text-blue-slate">
              این محصولات در بخش هیرو و ویترین اصلی صفحه‌ی خانه نمایش داده می‌شوند.
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              در ویترین اصلی حداکثر {formatNumber(HERO_LIMIT)} محصول نمایش داده می‌شود.
            </p>
          </div>
          <Link href="/admin/dashboard" className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate transition-colors hover:border-bondi-blue hover:text-bondi-blue">
            ← داشبورد
          </Link>
        </header>

        {notice && (
          <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
        )}
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* بخش اول: محصولات ویژه‌ی فعلی */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-iron-grey">محصولات ویژه‌ی فعلی</h2>
            {!loadingFeatured && (
              <span className="text-sm text-blue-slate">{formatNumber(featured.length)} محصول</span>
            )}
          </div>

          {loadingFeatured ? (
            <CenterSpinner inline />
          ) : featured.length === 0 ? (
            <div className="rounded-xl border border-dashed border-silver/70 bg-white p-10 text-center">
              <p className="font-semibold text-iron-grey">هنوز محصول ویژه‌ای انتخاب نشده است.</p>
              <p className="mt-1 text-sm text-blue-slate">از بخش پایین، محصول موردنظر را به ویژه‌ها اضافه کنید.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {featured.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  busy={busySlug === p.slug}
                  action="remove"
                  onAction={() => toggleFeatured(p, false)}
                />
              ))}
            </ul>
          )}
        </section>

        {/* بخش دوم: افزودن محصول به ویژه‌ها */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-iron-grey">افزودن محصول به ویژه‌ها</h2>

          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-silver bg-white p-4">
            <div className="min-w-[14rem] flex-1">
              <label className="form-label" htmlFor="feat-search">جست‌وجوی محصول</label>
              <input
                id="feat-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applySearch(); }}
                placeholder="نام محصول، برند یا دسته‌بندی"
                className="input-field"
              />
            </div>
            <button type="button" onClick={applySearch} className="btn-primary shrink-0">جست‌وجو</button>
          </div>

          {searching ? (
            <CenterSpinner inline />
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-silver bg-white p-10 text-center">
              <p className="font-semibold text-iron-grey">محصولی یافت نشد.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {results.map((p) => {
                const already = featuredSlugs.has(p.slug) || p.is_featured;
                return (
                  <ProductRow
                    key={p.id}
                    product={p}
                    busy={busySlug === p.slug}
                    action={already ? "is-featured" : "add"}
                    onAction={() => toggleFeatured(p, true)}
                  />
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

/* ------------------------------ ردیف محصول ------------------------------ */

function ProductRow({
  product,
  busy,
  action,
  onAction,
}: {
  product: ProductListItem;
  busy: boolean;
  action: "remove" | "add" | "is-featured";
  onAction: () => void;
}) {
  const imageUrl = resolveMediaUrl(product.primary_image);
  const price = product.has_discount && product.discount_price
    ? product.discount_price
    : product.base_price;

  return (
    <li className="flex items-center gap-3 rounded-xl border border-silver/60 bg-white p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-silver/60 bg-white">
        {imageUrl ? (
          <Image src={imageUrl} alt={product.title_fa} fill sizes="64px" className="object-contain p-1" />
        ) : (
          <ProductImagePlaceholder size="thumbnail" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link href={`/admin/products/${encodeURIComponent(product.slug)}`} className="block truncate font-semibold text-iron-grey hover:text-bondi-blue">
          {product.title_fa}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-blue-slate">
          {product.brand && <span>{product.brand.name_fa}</span>}
          {product.category && <span>{product.category.name_fa}</span>}
          <span className={product.in_stock ? "text-emerald-600" : "text-brand-muted"}>
            {product.in_stock ? "موجود" : "ناموجود"}
          </span>
        </div>
        <p className="mt-0.5 text-sm font-bold text-blue-slate">{formatToman(price)}</p>
      </div>

      {action === "remove" && (
        <button
          type="button"
          onClick={onAction}
          disabled={busy}
          className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {busy ? "…" : "حذف از ویژه‌ها"}
        </button>
      )}
      {action === "add" && (
        <button
          type="button"
          onClick={onAction}
          disabled={busy}
          className="btn-primary shrink-0 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {busy ? "…" : "افزودن به ویژه‌ها"}
        </button>
      )}
      {action === "is-featured" && (
        <span className="shrink-0 rounded-full bg-brand-accent/10 px-3 py-1 text-xs font-semibold text-brand-accent">
          ویژه است
        </span>
      )}
    </li>
  );
}

function CenterSpinner({ inline = false }: { inline?: boolean }) {
  const spinner = <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />;
  if (inline) return <div className="flex justify-center py-12">{spinner}</div>;
  return <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">{spinner}</main>;
}
