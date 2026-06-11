"use client";

/**
 * مدیریت تنوع‌های یک محصول (ADMIN / OWNER) — RTL / فارسی.
 *
 * از endpointهای واقعی ادمین استفاده می‌کند:
 *   POST   /catalog/admin/variants/       (ساخت)
 *   PATCH  /catalog/admin/variants/{id}/  (ویرایش)
 *   DELETE /catalog/admin/variants/{id}/  (حذف)
 *
 * پس از هر تغییر موفق، `onChanged` فراخوانی می‌شود تا والد محصول را دوباره
 * بخواند (refetch ساده، بدون optimistic update پیچیده).
 */

import { useState } from "react";

import {
  createVariant,
  deleteVariant,
  updateVariant,
} from "@/services/adminCatalogService";
import { formatToman } from "@/lib/persian";
import type { ApiError } from "@/types/auth";
import type { Color, ProductDetail, ProductVariant, Size } from "@/types/catalog";
import type { AdminVariantWritePayload } from "@/types/adminCatalog";

interface Props {
  product: ProductDetail;
  colors: Color[];
  sizes: Size[];
  onChanged: () => void;
}

export function VariantsManager({ product, colors, sizes, onChanged }: Props) {
  return (
    <section dir="rtl" className="rounded-xl border border-silver bg-white p-5">
      <h2 className="mb-4 text-lg font-bold text-iron-grey">تنوع‌های محصول</h2>

      {product.variants.length === 0 ? (
        <p className="mb-4 text-sm text-silver">هنوز تنوعی ثبت نشده است.</p>
      ) : (
        <div className="space-y-3">
          {product.variants.map((v) => (
            <VariantRow
              key={v.id}
              variant={v}
              colors={colors}
              sizes={sizes}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}

      <div className="mt-5 border-t border-dust-grey pt-5">
        <VariantCreate
          productId={product.id}
          existing={product.variants}
          colors={colors}
          sizes={sizes}
          onChanged={onChanged}
        />
      </div>
    </section>
  );
}

/* ----------------------------- ردیف ویرایش ------------------------------ */

function VariantRow({
  variant,
  colors,
  sizes,
  onChanged,
}: {
  variant: ProductVariant;
  colors: Color[];
  sizes: Size[];
  onChanged: () => void;
}) {
  const [sku, setSku] = useState(variant.sku);
  const [colorId, setColorId] = useState<string>(variant.color ? String(variant.color.id) : "");
  const [sizeId, setSizeId] = useState<string>(variant.size ? String(variant.size.id) : "");
  const [price, setPrice] = useState<string>(variant.price);
  const [discount, setDiscount] = useState<string>(variant.discount_price ?? "");
  const [stock, setStock] = useState<string>(String(variant.stock_quantity));
  const [active, setActive] = useState<boolean>(variant.is_active);

  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    setError(null);
    const payload: Partial<AdminVariantWritePayload> = {
      sku: sku.trim(),
      color: colorId ? Number(colorId) : null,
      size: sizeId ? Number(sizeId) : null,
      price: Number(price),
      discount_price: discount === "" ? null : Number(discount),
      stock_quantity: Number(stock),
      is_active: active,
    };
    try {
      await updateVariant(variant.id, payload);
      setMsg("ذخیره شد.");
      onChanged();
    } catch (err) {
      setError((err as ApiError)?.message ?? "ذخیره‌ی تنوع ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`تنوع «${variant.sku}» حذف شود؟ این عمل قابل بازگشت نیست.`)) return;
    setRemoving(true);
    setError(null);
    try {
      await deleteVariant(variant.id);
      onChanged();
    } catch (err) {
      setError((err as ApiError)?.message ?? "حذف تنوع ناموفق بود.");
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-lg border border-silver bg-dust-grey/30 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="کد انبار (SKU)">
          <input className="input-field" value={sku} onChange={(e) => setSku(e.target.value)} />
        </Field>
        <Field label="رنگ">
          <select className="input-field" value={colorId} onChange={(e) => setColorId(e.target.value)}>
            <option value="">—</option>
            {colors.map((c) => <option key={c.id} value={c.id}>{c.name_fa}</option>)}
          </select>
        </Field>
        <Field label="سایز">
          <select className="input-field" value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
            <option value="">—</option>
            {sizes.map((s) => <option key={s.id} value={s.id}>{s.name_fa}</option>)}
          </select>
        </Field>
        <Field label="قیمت (تومان)">
          <input className="input-field" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="تخفیف (اختیاری)">
          <input className="input-field" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </Field>
        <Field label="موجودی">
          <input className="input-field" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-iron-grey">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-bondi-blue" />
          فعال
        </label>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-emerald-600">{msg}</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
          <span className="text-xs text-silver">قیمت مؤثر: {formatToman(variant.effective_price)}</span>
          <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-bondi-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-bondi-blue-dark disabled:opacity-50">
            {saving ? "در حال ذخیره…" : "ذخیره"}
          </button>
          <button type="button" onClick={remove} disabled={removing} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
            {removing ? "…" : "حذف"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ افزودن تنوع ----------------------------- */

function VariantCreate({
  productId,
  existing,
  colors,
  sizes,
  onChanged,
}: {
  productId: number;
  existing: ProductVariant[];
  colors: Color[];
  sizes: Size[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [colorId, setColorId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [stock, setStock] = useState("0");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setSku(""); setColorId(""); setSizeId(""); setPrice(""); setDiscount(""); setStock("0");
  }

  async function create() {
    setError(null);
    if (!sku.trim()) { setError("کد انبار (SKU) الزامی است."); return; }
    if (!price || Number.isNaN(Number(price))) { setError("قیمت معتبر وارد کنید."); return; }
    // جلوگیری از ترکیب تکراری رنگ + سایز.
    const newColor = colorId ? Number(colorId) : null;
    const newSize = sizeId ? Number(sizeId) : null;
    const duplicate = existing.some(
      (v) => (v.color?.id ?? null) === newColor && (v.size?.id ?? null) === newSize,
    );
    if (duplicate) {
      setError("تنوعی با این ترکیب رنگ و سایز از قبل وجود دارد.");
      return;
    }
    setSaving(true);
    try {
      await createVariant({
        product: productId,
        sku: sku.trim(),
        color: colorId ? Number(colorId) : null,
        size: sizeId ? Number(sizeId) : null,
        price: Number(price),
        discount_price: discount === "" ? null : Number(discount),
        stock_quantity: Number(stock) || 0,
        is_active: true,
      });
      reset();
      setOpen(false);
      onChanged();
    } catch (err) {
      setError((err as ApiError)?.message ?? "افزودن تنوع ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-silver px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue">
        + افزودن تنوع جدید
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-bondi-blue/40 bg-bondi-blue/5 p-4">
      <h3 className="mb-3 text-sm font-bold text-iron-grey">تنوع جدید</h3>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="کد انبار (SKU)"><input className="input-field" value={sku} onChange={(e) => setSku(e.target.value)} /></Field>
        <Field label="رنگ">
          <select className="input-field" value={colorId} onChange={(e) => setColorId(e.target.value)}>
            <option value="">—</option>
            {colors.map((c) => <option key={c.id} value={c.id}>{c.name_fa}</option>)}
          </select>
        </Field>
        <Field label="سایز">
          <select className="input-field" value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
            <option value="">—</option>
            {sizes.map((s) => <option key={s.id} value={s.id}>{s.name_fa}</option>)}
          </select>
        </Field>
        <Field label="قیمت (تومان)"><input className="input-field" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
        <Field label="تخفیف (اختیاری)"><input className="input-field" inputMode="numeric" value={discount} onChange={(e) => setDiscount(e.target.value)} /></Field>
        <Field label="موجودی"><input className="input-field" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} /></Field>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={create} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? "در حال افزودن…" : "افزودن تنوع"}
        </button>
        <button type="button" onClick={() => { setOpen(false); reset(); setError(null); }} className="rounded-lg border border-silver px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue">
          انصراف
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-silver">{label}</label>
      {children}
    </div>
  );
}
