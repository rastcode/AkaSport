"use client";

/**
 * مدیریت برندها (ADMIN / OWNER) — RTL / فارسی.
 * ساخت/ویرایش/حذف برند با endpointهای موجود؛ لوگو اختیاری (multipart).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { useAuth } from "@/context/AuthContext";
import {
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
} from "@/services/adminCatalogService";
import { resolveMediaUrl } from "@/services/catalogService";
import type { ApiError } from "@/types/auth";
import type { Brand } from "@/types/catalog";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

function validateImage(f: File): string | null {
  if (!f.type.startsWith("image/") || !ACCEPTED.includes(f.type))
    return "فرمت تصویر معتبر نیست. لطفاً JPG، PNG یا WebP انتخاب کنید.";
  if (f.size > MAX_SIZE) return "حجم تصویر نباید بیشتر از ۵ مگابایت باشد.";
  return null;
}

export default function AdminBrandsPage() {
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [nameFa, setNameFa] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [desc, setDesc] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBrands(await listBrands());
    } catch {
      setError("خطا در دریافت برندها.");
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

  function resetForm() {
    setEditingSlug(null);
    setNameFa("");
    setNameEn("");
    setDesc("");
    setIsActive(true);
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function startEdit(b: Brand) {
    setEditingSlug(b.slug);
    setNameFa(b.name_fa);
    setNameEn(b.name_en ?? "");
    setDesc(b.description_fa ?? "");
    setIsActive(b.is_active);
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
      setError("نام فارسی برند الزامی است.");
      return;
    }
    const form = new FormData();
    form.append("name_fa", nameFa.trim());
    if (nameEn.trim()) form.append("name_en", nameEn.trim());
    form.append("description_fa", desc.trim());
    form.append("is_active", isActive ? "true" : "false");
    if (file) form.append("logo", file);

    setBusy(true);
    try {
      if (editingSlug) {
        await updateBrand(editingSlug, form);
        setNotice("برند با موفقیت به‌روزرسانی شد.");
      } else {
        await createBrand(form);
        setNotice("برند جدید ساخته شد.");
      }
      resetForm();
      await load();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.fieldErrors?.name_fa?.[0] ?? apiErr?.fieldErrors?.logo?.[0] ?? apiErr?.message ?? "عملیات ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(b: Brand) {
    if (!window.confirm(`برند «${b.name_fa}» حذف شود؟`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await deleteBrand(b.slug);
      setNotice("برند حذف شد.");
      if (editingSlug === b.slug) resetForm();
      await load();
    } catch (err) {
      setError((err as ApiError)?.message ?? "حذف ناموفق بود. ممکن است محصولاتی به این برند وابسته باشند.");
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
            <h1 className="text-2xl font-extrabold text-iron-grey">مدیریت برندها</h1>
            <p className="mt-1 text-sm text-blue-slate">ساخت، ویرایش و حذف برندها و افزودن لوگو.</p>
          </div>
          <Link href="/admin/dashboard" className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue">← داشبورد</Link>
        </header>

        {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <section className="mb-8 rounded-xl border border-silver bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-iron-grey">{editingSlug ? "ویرایش برند" : "برند جدید"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">نام فارسی<span className="text-red-600"> *</span></label>
              <input className="input-field" value={nameFa} onChange={(e) => setNameFa(e.target.value)} />
            </div>
            <div>
              <label className="form-label">نام انگلیسی (اختیاری)</label>
              <input className="input-field" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">توضیحات (اختیاری)</label>
              <textarea className="input-field min-h-[5rem]" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="brand-logo">لوگو (اختیاری)</label>
              <input id="brand-logo" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-iron-grey file:ml-3 file:rounded-lg file:border-0 file:bg-brand-dark file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark/90" />
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
              <span className="text-xs text-blue-slate">پیش‌نمایش لوگو</span>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={submit} disabled={busy} className="btn-primary disabled:opacity-50">{busy ? "در حال ذخیره…" : editingSlug ? "ذخیره تغییرات" : "ساخت برند"}</button>
            {editingSlug && <button type="button" onClick={resetForm} className="rounded-lg border border-silver px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue">انصراف</button>}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold text-iron-grey">برندهای موجود</h2>
          {loading ? (
            <CenterSpinner inline />
          ) : brands.length === 0 ? (
            <div className="rounded-xl border border-silver bg-white p-10 text-center text-iron-grey">هنوز برندی ثبت نشده است.</div>
          ) : (
            <ul className="space-y-3">
              {brands.map((b) => {
                const logoUrl = resolveMediaUrl(b.logo);
                return (
                  <li key={b.id} className="flex items-center gap-3 rounded-xl border border-silver/60 bg-white p-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-silver/60 bg-white">
                      {logoUrl ? (
                        <Image src={logoUrl} alt={b.name_fa} fill sizes="48px" className="object-contain p-1" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-brand-light text-sm font-black text-brand-accent/60">{b.name_fa.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-iron-grey">{b.name_fa}</p>
                      <p className="mt-0.5 text-xs"><span className={b.is_active ? "text-emerald-600" : "text-brand-muted"}>{b.is_active ? "فعال" : "غیرفعال"}</span></p>
                    </div>
                    <button type="button" onClick={() => startEdit(b)} className="shrink-0 rounded-lg border border-silver px-3 py-1.5 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue">ویرایش</button>
                    <button type="button" onClick={() => remove(b)} disabled={busy} className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">حذف</button>
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
