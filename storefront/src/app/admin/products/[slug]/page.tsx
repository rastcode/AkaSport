"use client";

/**
 * مدیریت محصولات — مشاهده/ویرایش یک محصول (ADMIN / OWNER) — RTL / فارسی.
 *
 * - ویرایش اطلاعات اصلی: PATCH /catalog/admin/products/{slug}/ (بدون ارسال
 *   variants، تا تنوع‌ها دست‌نخورده بمانند).
 * - تنوع‌ها: CRUD واقعی از طریق VariantsManager.
 * - تصاویر: فقط‌خواندنی (آپلود از API فعلی پشتیبانی نمی‌شود).
 * - حذف محصول: DELETE /catalog/admin/products/{slug}/ با تأیید فارسی.
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ProductForm } from "@/components/admin/products/ProductForm";
import { VariantsManager } from "@/components/admin/products/VariantsManager";
import { ProductImagesManager } from "@/components/admin/products/ProductImagesManager";
import { ProductStatusBadge } from "@/components/admin/products/AdminProductRow";
import { useAuth } from "@/context/AuthContext";
import {
  deleteAdminProduct,
  getAdminProduct,
  getCatalogLookups,
  updateAdminProduct,
  type CatalogLookups,
} from "@/services/adminCatalogService";
import { formatNumber } from "@/lib/persian";
import type { ApiError } from "@/types/auth";
import type { ProductDetail } from "@/types/catalog";
import type { AdminProductWritePayload } from "@/types/adminCatalog";

function EditInner({ slug }: { slug: string }) {
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";
  const router = useRouter();
  const createdFlag = useSearchParams().get("created");
  const createdMessage =
    createdFlag === "2"
      ? "محصول و تصویر اصلی با موفقیت ثبت شدند."
      : createdFlag === "3"
        ? "محصول ساخته شد، اما آپلود تصویر ناموفق بود. می‌توانید بعداً تصویر را اضافه کنید."
        : createdFlag === "1"
          ? "محصول با موفقیت ساخته شد."
          : null;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [lookups, setLookups] = useState<CatalogLookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(createdMessage);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [deleting, setDeleting] = useState(false);

  const loadProduct = useCallback(async () => {
    try {
      const data = await getAdminProduct(slug);
      setProduct(data);
    } catch {
      setLoadError("محصول یافت نشد یا به آن دسترسی ندارید.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (authLoading || !isStaff) {
      setLoading(false);
      return;
    }
    void loadProduct();
    getCatalogLookups()
      .then(setLookups)
      .catch(() => setLookups({ categories: [], brands: [], colors: [], sizes: [] }));
  }, [authLoading, isStaff, loadProduct]);

  async function handleUpdate(payload: AdminProductWritePayload) {
    setSubmitting(true);
    setSaveMsg(null);
    setSaveError(null);
    setFieldErrors({});
    try {
      const updated = await updateAdminProduct(slug, payload);
      setProduct(updated);
      setSaveMsg("تغییرات با موفقیت ذخیره شد.");
      if (updated.slug !== slug) {
        router.replace(`/admin/products/${encodeURIComponent(updated.slug)}`);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setSaveError(apiErr?.message ?? "ذخیره‌ی تغییرات ناموفق بود.");
      setFieldErrors(apiErr?.fieldErrors ?? {});
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    if (!window.confirm(`محصول «${product.title_fa}» برای همیشه حذف شود؟ این عمل قابل بازگشت نیست.`)) return;
    setDeleting(true);
    setSaveError(null);
    try {
      await deleteAdminProduct(slug);
      router.replace("/admin/products");
    } catch (err) {
      setSaveError((err as ApiError)?.message ?? "حذف محصول ناموفق بود.");
      setDeleting(false);
    }
  }

  if (authLoading) return <CenterSpinner />;
  if (!isStaff) return <Forbidden />;
  if (loading) return <CenterSpinner />;

  if (loadError || !product) {
    return (
      <Centered>
        <h1 className="text-2xl font-extrabold text-iron-grey">ویرایش محصول</h1>
        <p className="mt-3 text-blue-slate">{loadError ?? "محصول یافت نشد."}</p>
        <Link href="/admin/products" className="btn-primary mt-6">بازگشت به مدیریت محصولات</Link>
      </Centered>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-dust-grey/40">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-5 text-sm text-blue-slate">
          <Link href="/admin/products" className="hover:text-bondi-blue">← بازگشت به مدیریت محصولات</Link>
        </nav>

        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-silver pb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-iron-grey">{product.title_fa}</h1>
            <ProductStatusBadge status={product.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-silver">
            <span>{formatNumber(product.view_count)} بازدید</span>
            <span>·</span>
            <span>{formatNumber(product.sold_count)} فروش</span>
            <Link href={`/product/${encodeURIComponent(product.slug)}`} target="_blank" className="font-semibold text-bondi-blue hover:text-bondi-blue-dark">
              مشاهده در فروشگاه ↗
            </Link>
          </div>
        </header>

        {saveMsg && (
          <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{saveMsg}</div>
        )}
        {saveError && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
        )}

        <div className="space-y-6">
          {lookups && (
            <ProductForm
              initial={product}
              categories={lookups.categories}
              brands={lookups.brands}
              submitting={submitting}
              submitLabel="ذخیره تغییرات"
              fieldErrors={fieldErrors}
              onSubmit={handleUpdate}
            />
          )}

          {lookups && (
            <VariantsManager
              product={product}
              colors={lookups.colors}
              sizes={lookups.sizes}
              onChanged={loadProduct}
            />
          )}

          <ProductImagesManager product={product} onChanged={loadProduct} />

          {/* حذف محصول */}
          <section className="rounded-xl border border-red-200 bg-red-50/40 p-5">
            <h2 className="mb-2 text-lg font-bold text-red-700">حذف محصول</h2>
            <p className="mb-3 text-sm text-iron-grey">با حذف محصول، همه‌ی تنوع‌ها و تصاویر آن نیز حذف می‌شوند. این عمل قابل بازگشت نیست.</p>
            <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {deleting ? "در حال حذف…" : "حذف محصول"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

function Forbidden() {
  return (
    <main dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-dust-grey/40 px-4 text-center">
      <p className="text-5xl font-black text-silver">۴۰۳</p>
      <h1 className="mt-2 text-xl font-bold text-iron-grey">دسترسی غیرمجاز</h1>
      <p className="mt-1 text-blue-slate">این بخش تنها برای مدیران و مالک فروشگاه در دسترس است.</p>
      <Link href="/" className="btn-primary mt-6">بازگشت به فروشگاه</Link>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main dir="rtl" className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      {children}
    </main>
  );
}

function CenterSpinner() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
    </main>
  );
}

export default function EditProductPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<CenterSpinner />}>
      <EditInner slug={params.slug} />
    </Suspense>
  );
}
