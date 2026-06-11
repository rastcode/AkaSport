"use client";

/**
 * مدیریت دسته‌بندی‌ها (ADMIN / OWNER) — RTL / فارسی.
 *
 * ساخت/ویرایش/حذف دسته‌بندی با endpointهای موجودِ ادمین. تصویر/آیکون روی فیلد
 * `icon` آپلود می‌شود (همان فیلدی که صفحه‌ی اصلی برای کارت دسته‌بندی می‌خواند).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { useAuth } from "@/context/AuthContext";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/services/adminCatalogService";
import { resolveMediaUrl } from "@/services/catalogService";
import { formatNumber } from "@/lib/persian";
import type { ApiError } from "@/types/auth";
import type { Category } from "@/types/catalog";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

function validateImage(f: File): string | null {
  if (!f.type.startsWith("image/") || !ACCEPTED.includes(f.type))
    return "فرمت تصویر معتبر نیست. لطفاً JPG، PNG یا WebP انتخاب کنید.";
  if (f.size > MAX_SIZE) return "حجم تصویر نباید بیشتر از ۵ مگابایت باشد.";
  return null;
}

export default function AdminCategoriesPage() {
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // فرم (ساخت یا ویرایش)
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [nameFa, setNameFa] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [parent, setParent] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await listCategories());
    } catch {
      setError("خطا در دریافت دسته‌بندی‌ها.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isStaff) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isStaff, load]);

  const parentOptions = useMemo(
    () => categories.filter((c) => c.slug !== editingSlug),
    [categories, editingSlug],
  );

  function resetForm() {
    setEditingSlug(null);
    setNameFa("");
    setNameEn("");
    setParent("");
    setDisplayOrder("0");
    setIsActive(true);
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function startEdit(c: Category) {
    setEditingSlug(c.slug);
    setNameFa(c.name_fa);
    setNameEn(c.name_en ?? "");
    setParent(c.parent ? String(c.parent) : "");
    setDisplayOrder(String(c.display_order ?? 0));
    setIsActive(c.is_active);
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setNotice(null);
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pickFile(f: File | null) {
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    if (f) {
      const problem = validateImage(f);
      if (problem) {
        setError(problem);
        setFile(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    setError(null);
    setNotice(null);
    if (!nameFa.trim()) {
      setError("نام فارسی دسته‌بندی الزامی است.");
      return;
    }
    const form = new FormData();
    form.append("name_fa", nameFa.trim());
    if (nameEn.trim()) form.append("name_en", nameEn.trim());
    if (parent) form.append("parent", parent);
    form.append("display_order", String(Number(displayOrder) || 0));
    form.append("is_active", isActive ? "true" : "false");
    if (file) form.append("icon", file);

    setBusy(true);
    try {
      if (editingSlug) {
        await updateCategory(editingSlug, form);
        setNotice("دسته‌بندی با موفقیت به‌روزرسانی شد.");
      } else {
        await createCategory(form);
        setNotice("دسته‌بندی جدید ساخته شد.");
      }
      resetForm();
      await load();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(
        apiErr?.fieldErrors?.icon?.[0] ??
          apiErr?.fieldErrors?.name_fa?.[0] ??
          apiErr?.message ??
          "عملیات ناموفق بود.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Category) {
    if (!window.confirm(`دسته‌بندی «${c.name_fa}» حذف شود؟`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await deleteCategory(c.slug);
      setNotice("دسته‌بندی حذف شد.");
      if (editingSlug === c.slug) resetForm();
      await load();
    } catch (err) {
      setError(
        (err as ApiError)?.message ??
          "حذف ناموفق بود. ممکن است محصولاتی به این دسته وابسته باشند.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return <CenterSpinner />;
  if (!isStaff) return <Forbidden />;

  return (
    <main dir="rtl" className="min-h-screen bg-dust-grey/40">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-silver pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-iron-grey">مدیریت دسته‌بندی‌ها</h1>
            <p className="mt-1 text-sm text-blue-slate">ساخت دسته‌بندی و افزودن تصویر/آیکون برای نمایش در صفحه‌ی اصلی.</p>
          </div>
          <Link href="/admin/dashboard" className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue">← داشبورد</Link>
        </header>

        {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* فرم ساخت/ویرایش */}
        <section className="mb-8 rounded-xl border border-silver bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-iron-grey">
            {editingSlug ? "ویرایش دسته‌بندی" : "دسته‌بندی جدید"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="نام فارسی" required value={nameFa} onChange={setNameFa} />
            <Field label="نام انگلیسی (اختیاری)" value={nameEn} onChange={setNameEn} />
            <div>
              <label className="form-label" htmlFor="cat-parent">دسته‌ی والد (اختیاری)</label>
              <select id="cat-parent" className="input-field" value={parent} onChange={(e) => setParent(e.target.value)}>
                <option value="">— بدون والد (دسته‌ی اصلی) —</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_path || c.name_fa}</option>
                ))}
              </select>
            </div>
            <Field label="ترتیب نمایش" value={displayOrder} onChange={setDisplayOrder} inputMode="numeric" />
            <div>
              <label className="form-label" htmlFor="cat-icon">تصویر/آیکون دسته‌بندی</label>
              <input
                id="cat-icon"
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-iron-grey file:ml-3 file:rounded-lg file:border-0 file:bg-brand-dark file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark/90"
              />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-iron-grey">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-brand-accent" />
              فعال
            </label>
          </div>

          {preview && (
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-silver/60 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="پیش‌نمایش" className="h-full w-full object-contain p-1" />
              </div>
              <span className="text-xs text-blue-slate">پیش‌نمایش تصویر انتخاب‌شده</span>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={submit} disabled={busy} className="btn-primary disabled:opacity-50">
              {busy ? "در حال ذخیره…" : editingSlug ? "ذخیره تغییرات" : "ساخت دسته‌بندی"}
            </button>
            {editingSlug && (
              <button type="button" onClick={resetForm} className="rounded-lg border border-silver px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue">انصراف</button>
            )}
          </div>
        </section>

        {/* فهرست */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-iron-grey">دسته‌بندی‌های موجود</h2>
          {loading ? (
            <CenterSpinner inline />
          ) : categories.length === 0 ? (
            <div className="rounded-xl border border-silver bg-white p-10 text-center text-iron-grey">هنوز دسته‌بندی‌ای ثبت نشده است.</div>
          ) : (
            <ul className="space-y-3">
              {categories.map((c) => {
                const iconUrl = resolveMediaUrl(c.icon) || resolveMediaUrl(c.image);
                return (
                  <li key={c.id} className="flex items-center gap-3 rounded-xl border border-silver/60 bg-white p-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-silver/60 bg-white">
                      {iconUrl ? (
                        <Image src={iconUrl} alt={c.name_fa} fill sizes="56px" className="object-contain p-1" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-brand-light text-sm font-black text-brand-accent/60">{c.name_fa.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-iron-grey">{c.full_path || c.name_fa}</p>
                      <p className="mt-0.5 text-xs text-blue-slate">
                        ترتیب: {formatNumber(c.display_order ?? 0)} ·{" "}
                        <span className={c.is_active ? "text-emerald-600" : "text-brand-muted"}>{c.is_active ? "فعال" : "غیرفعال"}</span>
                      </p>
                    </div>
                    <button type="button" onClick={() => startEdit(c)} className="shrink-0 rounded-lg border border-silver px-3 py-1.5 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue">ویرایش</button>
                    <button type="button" onClick={() => remove(c)} disabled={busy} className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">حذف</button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, required, inputMode }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; inputMode?: "text" | "numeric" }) {
  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-600"> *</span>}</label>
      <input className="input-field" value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
    </div>
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
  if (inline) return <div className="flex justify-center py-12">{spinner}</div>;
  return <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">{spinner}</main>;
}
