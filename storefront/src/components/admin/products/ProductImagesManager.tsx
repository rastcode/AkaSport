"use client";

/**
 * مدیریت تصاویر محصول (ADMIN / OWNER) — RTL / فارسی.
 *
 * نمایش تصاویر موجود + آپلود تصویر جدید (multipart) + حذف، با endpointهای واقعی:
 *   POST   /catalog/admin/images/        (آپلود)
 *   DELETE /catalog/admin/images/{id}/   (حذف)
 *
 * منطق «تصویر اصلی» در بک‌اند مدیریت می‌شود؛ پس از هر تغییر، `onChanged`
 * فراخوانی می‌شود تا محصول دوباره خوانده شود.
 */

import { useRef, useState } from "react";
import Image from "next/image";

import {
  deleteProductImage,
  uploadProductImage,
} from "@/services/adminCatalogService";
import { resolveMediaUrl } from "@/services/catalogService";
import { ProductImagePlaceholder } from "@/components/products/ProductImagePlaceholder";
import type { ApiError } from "@/types/auth";
import type { ProductDetail, ProductVariant } from "@/types/catalog";

interface Props {
  product: ProductDetail;
  onChanged: () => void;
}

function variantLabel(v: ProductVariant): string {
  const parts = [v.color?.name_fa, v.size?.name_fa].filter(Boolean);
  return parts.length ? parts.join(" - ") : v.sku;
}

export function ProductImagesManager({ product, onChanged }: Props) {
  const variants = product.variants;

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [variantId, setVariantId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  function onPickFile(f: File | null) {
    setSuccess(null);
    setError(null);
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function resetForm() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setAltText("");
    setVariantId("");
    setIsPrimary(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleUpload() {
    setSuccess(null);
    setError(null);
    if (!file) {
      setError("لطفاً ابتدا یک فایل تصویر انتخاب کنید.");
      return;
    }
    const form = new FormData();
    form.append("product", String(product.id));
    form.append("image", file);
    if (altText.trim()) form.append("alt_text_fa", altText.trim());
    if (variantId) form.append("variant", variantId);
    if (isPrimary) form.append("is_primary", "true");

    setUploading(true);
    try {
      await uploadProductImage(form);
      resetForm();
      setSuccess("تصویر با موفقیت آپلود شد.");
      onChanged();
    } catch (err) {
      setError((err as ApiError)?.message ?? "آپلود تصویر ناموفق بود. دوباره تلاش کنید.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("این تصویر حذف شود؟ این عمل قابل بازگشت نیست.")) return;
    setRemovingId(id);
    setError(null);
    setSuccess(null);
    try {
      await deleteProductImage(id);
      onChanged();
    } catch (err) {
      setError((err as ApiError)?.message ?? "حذف تصویر ناموفق بود.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section dir="rtl" className="rounded-xl border border-silver bg-white p-5">
      <h2 className="mb-4 text-lg font-bold text-iron-grey">تصاویر محصول</h2>

      {/* تصاویر موجود */}
      {product.images.length === 0 ? (
        <div className="mb-5 rounded-xl border border-dashed border-silver/70 bg-brand-light/50 p-8 text-center">
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-xl">
            <ProductImagePlaceholder size="thumbnail" />
          </div>
          <p className="mt-3 text-sm text-blue-slate">هنوز تصویری برای این محصول ثبت نشده است.</p>
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {product.images.map((img) => {
            const url = resolveMediaUrl(img.image);
            const variant = variants.find((v) => v.id === img.variant);
            return (
              <div key={img.id} className="overflow-hidden rounded-xl border border-silver/60 bg-white">
                <div className="relative aspect-square w-full bg-brand-light">
                  {url ? (
                    <Image src={url} alt={img.alt_text_fa || product.title_fa} fill sizes="160px" className="object-cover" />
                  ) : (
                    <ProductImagePlaceholder size="thumbnail" />
                  )}
                  {img.is_primary && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-brand-accent px-2 py-0.5 text-[10px] font-bold text-white">
                      اصلی
                    </span>
                  )}
                </div>
                <div className="p-2">
                  {img.alt_text_fa && (
                    <p className="line-clamp-1 text-[11px] text-iron-grey">{img.alt_text_fa}</p>
                  )}
                  {variant && (
                    <p className="line-clamp-1 text-[11px] text-blue-slate">تنوع: {variantLabel(variant)}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(img.id)}
                    disabled={removingId === img.id}
                    className="mt-1.5 w-full rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    {removingId === img.id ? "در حال حذف…" : "حذف"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* فرم آپلود */}
      <div className="rounded-xl border border-dashed border-brand-muted/40 bg-brand-light/40 p-4">
        <h3 className="mb-3 text-sm font-bold text-iron-grey">افزودن تصویر جدید</h3>

        {error && (
          <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {success && (
          <p role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="img-file">فایل تصویر</label>
            <input
              id="img-file"
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-iron-grey file:ml-3 file:rounded-lg file:border-0 file:bg-brand-dark file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark/90"
            />
          </div>

          <div>
            <label className="form-label" htmlFor="img-alt">متن جایگزین (اختیاری)</label>
            <input
              id="img-alt"
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="توضیح کوتاه تصویر"
              className="input-field"
            />
          </div>

          {variants.length > 0 && (
            <div>
              <label className="form-label" htmlFor="img-variant">تنوع مرتبط (اختیاری)</label>
              <select
                id="img-variant"
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className="input-field"
              >
                <option value="">تصویر کلی محصول</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>{variantLabel(v)}</option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 self-end pb-2 text-sm text-iron-grey">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 accent-brand-accent"
            />
            تنظیم به‌عنوان تصویر اصلی
          </label>
        </div>

        {preview && (
          <div className="mt-3 flex items-center gap-3">
            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-silver/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="پیش‌نمایش تصویر" className="h-full w-full object-cover" />
            </div>
            <span className="text-xs text-blue-slate">پیش‌نمایش تصویر انتخاب‌شده</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !file}
          className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "در حال آپلود…" : "آپلود تصویر"}
        </button>
      </div>
    </section>
  );
}
