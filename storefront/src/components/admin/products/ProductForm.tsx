"use client";

/**
 * فرم مشترک ساخت/ویرایش محصول (ADMIN / OWNER) — RTL / فارسی.
 *
 * فیلدها مطابق AdminProductWriteSerializer واقعی بک‌اند هستند. تنوع‌ها (variants)
 * در این فرم نیستند و جداگانه در صفحه‌ی ویرایش مدیریت می‌شوند.
 */

import { useMemo, useRef, useState, type FormEvent } from "react";

import type { Brand, Category, ProductDetail, ProductStatus } from "@/types/catalog";
import type { AdminProductWritePayload } from "@/types/adminCatalog";

const ACCEPTED_IMAGE = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE = 5 * 1024 * 1024;

function validateImageFile(f: File): string | null {
  if (!f.type.startsWith("image/") || !ACCEPTED_IMAGE.includes(f.type))
    return "فرمت تصویر معتبر نیست. لطفاً JPG، PNG یا WebP انتخاب کنید.";
  if (f.size > MAX_IMAGE) return "حجم تصویر نباید بیشتر از ۵ مگابایت باشد.";
  return null;
}

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "DRAFT", label: "پیش‌نویس" },
  { value: "PUBLISHED", label: "منتشرشده" },
  { value: "OUT_OF_STOCK", label: "ناموجود" },
  { value: "ARCHIVED", label: "بایگانی‌شده" },
];

interface SpecRow {
  key: string;
  value: string;
}

function specsToRows(specs: Record<string, unknown> | undefined): SpecRow[] {
  if (!specs || typeof specs !== "object") return [];
  return Object.entries(specs).map(([key, value]) => ({
    key,
    value: value == null ? "" : String(value),
  }));
}

export interface ProductFormProps {
  initial?: ProductDetail | null;
  categories: Category[];
  brands: Brand[];
  submitting: boolean;
  submitLabel: string;
  fieldErrors?: Record<string, string[]>;
  /** نمایش بخش «تصویر اصلی محصول» (فقط در فرم ساخت). */
  showImageUpload?: boolean;
  onSubmit: (payload: AdminProductWritePayload, imageFile?: File | null) => void;
}

export function ProductForm({
  initial,
  categories,
  brands,
  submitting,
  submitLabel,
  fieldErrors,
  showImageUpload = false,
  onSubmit,
}: ProductFormProps) {
  const [titleFa, setTitleFa] = useState(initial?.title_fa ?? "");
  const [titleEn, setTitleEn] = useState(initial?.title_en ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [shortDesc, setShortDesc] = useState(initial?.short_description_fa ?? "");
  const [desc, setDesc] = useState(initial?.description_fa ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    initial?.category?.id ? String(initial.category.id) : "",
  );
  const [brandId, setBrandId] = useState<string>(
    initial?.brand?.id ? String(initial.brand.id) : "",
  );
  const [basePrice, setBasePrice] = useState<string>(
    initial?.base_price ?? "",
  );
  const [discountPrice, setDiscountPrice] = useState<string>(
    initial?.discount_price ?? "",
  );
  const [status, setStatus] = useState<ProductStatus>(initial?.status ?? "DRAFT");
  const [isFeatured, setIsFeatured] = useState<boolean>(initial?.is_featured ?? false);
  const [seoTitle, setSeoTitle] = useState(initial?.seo_title ?? "");
  const [seoDesc, setSeoDesc] = useState(initial?.seo_description ?? "");
  const [specRows, setSpecRows] = useState<SpecRow[]>(
    specsToRows(initial?.specifications),
  );

  const [localError, setLocalError] = useState<string | null>(null);

  // تصویر اصلی (فقط در فرم ساخت).
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  function pickImage(f: File | null) {
    setLocalError(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (f) {
      const problem = validateImageFile(f);
      if (problem) {
        setLocalError(problem);
        setImageFile(null);
        setImagePreview(null);
        if (imageRef.current) imageRef.current.value = "";
        return;
      }
    }
    setImageFile(f);
    setImagePreview(f ? URL.createObjectURL(f) : null);
  }

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        label: c.full_path || c.name_fa,
      })),
    [categories],
  );

  function updateSpec(idx: number, patch: Partial<SpecRow>) {
    setSpecRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addSpec() {
    setSpecRows((rows) => [...rows, { key: "", value: "" }]);
  }
  function removeSpec(idx: number) {
    setSpecRows((rows) => rows.filter((_, i) => i !== idx));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (!titleFa.trim()) {
      setLocalError("عنوان فارسی محصول الزامی است.");
      return;
    }
    if (!categoryId) {
      setLocalError("انتخاب دسته‌بندی الزامی است.");
      return;
    }
    const base = Number(basePrice);
    if (!basePrice || Number.isNaN(base) || base < 0) {
      setLocalError("قیمت پایه باید یک عدد معتبر باشد.");
      return;
    }
    let discount: number | null = null;
    if (discountPrice !== "" && discountPrice != null) {
      discount = Number(discountPrice);
      if (Number.isNaN(discount) || discount < 0) {
        setLocalError("قیمت با تخفیف باید یک عدد معتبر باشد.");
        return;
      }
      if (discount > base) {
        setLocalError("قیمت با تخفیف نمی‌تواند بیشتر از قیمت پایه باشد.");
        return;
      }
    }

    const specifications: Record<string, string> = {};
    for (const row of specRows) {
      const k = row.key.trim();
      if (k) specifications[k] = row.value.trim();
    }

    const payload: AdminProductWritePayload = {
      title_fa: titleFa.trim(),
      title_en: titleEn.trim() || undefined,
      slug: slug.trim() || undefined,
      short_description_fa: shortDesc.trim() || undefined,
      description_fa: desc.trim() || undefined,
      category: Number(categoryId),
      brand: brandId ? Number(brandId) : null,
      base_price: base,
      discount_price: discount,
      status,
      specifications,
      seo_title: seoTitle.trim() || undefined,
      seo_description: seoDesc.trim() || undefined,
      is_featured: isFeatured,
    };
    onSubmit(payload, showImageUpload ? imageFile : null);
  }

  const err = (name: string) => fieldErrors?.[name];

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate dir="rtl">
      {localError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {localError}
        </div>
      )}

      {/* اطلاعات اصلی */}
      <section className="rounded-xl border border-silver bg-white p-5">
        <h2 className="mb-4 text-lg font-bold text-iron-grey">اطلاعات اصلی</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="عنوان فارسی" value={titleFa} onChange={setTitleFa} required errors={err("title_fa")} />
          <TextField label="عنوان انگلیسی (اختیاری)" value={titleEn} onChange={setTitleEn} errors={err("title_en")} />
          <TextField label="اسلاگ (اختیاری؛ خودکار ساخته می‌شود)" value={slug} onChange={setSlug} errors={err("slug")} />
          <div>
            <label className="form-label" htmlFor="pf-category">دسته‌بندی<span className="text-red-600"> *</span></label>
            <select id="pf-category" className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— انتخاب دسته‌بندی —</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <FieldError errors={err("category")} />
          </div>
          <div>
            <label className="form-label" htmlFor="pf-brand">برند (اختیاری)</label>
            <select id="pf-brand" className="input-field" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">— بدون برند —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name_fa}</option>
              ))}
            </select>
            <FieldError errors={err("brand")} />
          </div>
          <div>
            <label className="form-label" htmlFor="pf-status">وضعیت</label>
            <select id="pf-status" className="input-field" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <FieldError errors={err("status")} />
          </div>
        </div>

        <div className="mt-4">
          <TextField label="توضیح کوتاه (اختیاری)" value={shortDesc} onChange={setShortDesc} errors={err("short_description_fa")} />
        </div>
        <div className="mt-4">
          <label className="form-label" htmlFor="pf-desc">توضیحات (اختیاری)</label>
          <textarea id="pf-desc" className="input-field min-h-[7rem]" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <FieldError errors={err("description_fa")} />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-iron-grey">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 accent-bondi-blue" />
          محصول منتخب (نمایش ویژه)
        </label>
      </section>

      {/* قیمت‌گذاری */}
      <section className="rounded-xl border border-silver bg-white p-5">
        <h2 className="mb-4 text-lg font-bold text-iron-grey">قیمت‌گذاری (تومان)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label="قیمت پایه" value={basePrice} onChange={setBasePrice} required inputMode="numeric" errors={err("base_price")} />
          <TextField label="قیمت با تخفیف (اختیاری)" value={discountPrice} onChange={setDiscountPrice} inputMode="numeric" errors={err("discount_price")} />
        </div>
        <p className="mt-2 text-xs text-silver">مبالغ را به تومان و بدون جداکننده وارد کنید (مثلاً ۱۲۵۰۰۰۰).</p>
      </section>

      {/* مشخصات فنی */}
      <section className="rounded-xl border border-silver bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-iron-grey">مشخصات فنی (اختیاری)</h2>
          <button type="button" onClick={addSpec} className="rounded-lg border border-silver px-3 py-1.5 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue">
            + افزودن ویژگی
          </button>
        </div>
        {specRows.length === 0 ? (
          <p className="text-sm text-silver">ویژگی‌ای اضافه نشده است.</p>
        ) : (
          <div className="space-y-2">
            {specRows.map((row, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <input className="input-field flex-1" placeholder="نام ویژگی (مثلاً جنس)" value={row.key} onChange={(e) => updateSpec(idx, { key: e.target.value })} />
                <input className="input-field flex-1" placeholder="مقدار (مثلاً پنبه)" value={row.value} onChange={(e) => updateSpec(idx, { value: e.target.value })} />
                <button type="button" onClick={() => removeSpec(idx)} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50" aria-label="حذف ویژگی">
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* سئو */}
      <section className="rounded-xl border border-silver bg-white p-5">
        <h2 className="mb-4 text-lg font-bold text-iron-grey">سئو (اختیاری)</h2>
        <div className="space-y-4">
          <TextField label="عنوان سئو" value={seoTitle} onChange={setSeoTitle} errors={err("seo_title")} />
          <TextField label="توضیحات سئو" value={seoDesc} onChange={setSeoDesc} errors={err("seo_description")} />
        </div>
      </section>

      {/* تصویر اصلی محصول (فقط هنگام ساخت) */}
      {showImageUpload && (
        <section className="rounded-xl border border-silver bg-white p-5">
          <h2 className="mb-1 text-lg font-bold text-iron-grey">تصویر اصلی محصول</h2>
          <p className="mb-3 text-xs text-blue-slate">
            یک تصویر برای محصول انتخاب کنید (JPG، PNG یا WebP — حداکثر ۵ مگابایت). این
            تصویر به‌عنوان تصویر اصلی ثبت می‌شود.
          </p>
          <input
            ref={imageRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-iron-grey file:ml-3 file:rounded-lg file:border-0 file:bg-brand-dark file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark/90"
          />
          {imagePreview && (
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-silver/60 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="پیش‌نمایش تصویر" className="h-full w-full object-contain p-1" />
              </div>
              <span className="text-xs text-blue-slate">پیش‌نمایش تصویر انتخاب‌شده</span>
            </div>
          )}
        </section>
      )}

      <div className="flex justify-end gap-3">
        <button type="submit" disabled={submitting} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? "در حال ذخیره…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------ زیرکامپوننت‌ها ------------------------------ */

function TextField({
  label,
  value,
  onChange,
  required = false,
  inputMode,
  errors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  inputMode?: "text" | "numeric";
  errors?: string[];
}) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        className="input-field"
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
      />
      <FieldError errors={errors} />
    </div>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{errors.join(" ")}</p>;
}
