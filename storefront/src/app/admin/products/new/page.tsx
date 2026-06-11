"use client";

/**
 * مدیریت محصولات — ساخت محصول جدید (ADMIN / OWNER) — RTL / فارسی.
 *
 * از فرم مشترک ProductForm و endpoint واقعی POST /catalog/admin/products/
 * استفاده می‌کند. پس از موفقیت به صفحه‌ی ویرایش همان محصول هدایت می‌شود.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProductForm } from "@/components/admin/products/ProductForm";
import { useAuth } from "@/context/AuthContext";
import {
  createAdminProduct,
  getCatalogLookups,
  uploadProductImage,
  type CatalogLookups,
} from "@/services/adminCatalogService";
import type { ApiError } from "@/types/auth";
import type { AdminProductWritePayload } from "@/types/adminCatalog";

export default function NewProductPage() {
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";
  const router = useRouter();

  const [lookups, setLookups] = useState<CatalogLookups | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (authLoading || !isStaff) return;
    getCatalogLookups()
      .then(setLookups)
      .catch(() => setError("خطا در دریافت دسته‌بندی‌ها و برندها."));
  }, [authLoading, isStaff]);

  async function handleSubmit(
    payload: AdminProductWritePayload,
    imageFile?: File | null,
  ) {
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await createAdminProduct(payload);

      // اگر تصویر اصلی انتخاب شده بود، با id محصولِ ساخته‌شده آپلودش کن.
      if (imageFile) {
        try {
          const form = new FormData();
          form.append("product", String(created.id));
          form.append("image", imageFile);
          form.append("is_primary", "true");
          await uploadProductImage(form);
          router.replace(`/admin/products/${encodeURIComponent(created.slug)}?created=2`);
          return;
        } catch {
          // محصول ساخته شد ولی تصویر آپلود نشد؛ کاربر بعداً اضافه می‌کند.
          router.replace(`/admin/products/${encodeURIComponent(created.slug)}?created=3`);
          return;
        }
      }

      router.replace(`/admin/products/${encodeURIComponent(created.slug)}?created=1`);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "ساخت محصول ناموفق بود. لطفاً دوباره تلاش کنید.");
      setFieldErrors(apiErr?.fieldErrors ?? {});
      setSubmitting(false);
    }
  }

  if (authLoading) return <CenterSpinner />;

  if (!isStaff) return <Forbidden />;

  return (
    <main dir="rtl" className="min-h-screen bg-dust-grey/40">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-5 text-sm text-blue-slate">
          <Link href="/admin/products" className="hover:text-bondi-blue">← بازگشت به مدیریت محصولات</Link>
        </nav>

        <header className="mb-6 border-b border-silver pb-5">
          <h1 className="text-2xl font-extrabold text-iron-grey">محصول جدید</h1>
          <p className="mt-1 text-sm text-blue-slate">پس از ساخت، می‌توانید تنوع‌ها و موجودی را اضافه کنید.</p>
        </header>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!lookups ? (
          <CenterSpinner inline />
        ) : (
          <ProductForm
            categories={lookups.categories}
            brands={lookups.brands}
            submitting={submitting}
            submitLabel="ساخت محصول"
            fieldErrors={fieldErrors}
            showImageUpload
            onSubmit={handleSubmit}
          />
        )}
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

function CenterSpinner({ inline = false }: { inline?: boolean }) {
  const spinner = <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />;
  if (inline) return <div className="flex justify-center py-16">{spinner}</div>;
  return <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">{spinner}</main>;
}
