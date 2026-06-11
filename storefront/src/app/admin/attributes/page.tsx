"use client";

/**
 * مدیریت رنگ‌ها و سایزها (ADMIN / OWNER) — RTL / فارسی.
 * این داده‌ها بلافاصله در فرم افزودن/ویرایش محصول قابل انتخاب می‌شوند.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import {
  createColor,
  createSize,
  deleteColor,
  deleteSize,
  listColors,
  listSizes,
  updateColor,
  updateSize,
} from "@/services/adminCatalogService";
import { formatNumber } from "@/lib/persian";
import type { ApiError } from "@/types/auth";
import type { Color, Size } from "@/types/catalog";

export default function AdminAttributesPage() {
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";

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
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-silver pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-iron-grey">رنگ‌ها و سایزها</h1>
            <p className="mt-1 text-sm text-blue-slate">این مقادیر در ساخت تنوع‌های محصول استفاده می‌شوند.</p>
          </div>
          <Link href="/admin/dashboard" className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue">← داشبورد</Link>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ColorManager />
          <SizeManager />
        </div>
      </div>
    </main>
  );
}

/* ------------------------------- رنگ‌ها --------------------------------- */

function ColorManager() {
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameFa, setNameFa] = useState("");
  const [hex, setHex] = useState("#");
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setColors(await listColors());
    } catch {
      setError("خطا در دریافت رنگ‌ها.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function reset() {
    setEditingId(null);
    setNameFa("");
    setHex("#");
    setIsActive(true);
  }

  async function submit() {
    setError(null);
    setMsg(null);
    if (!nameFa.trim()) { setError("نام رنگ الزامی است."); return; }
    const hexValue = hex.trim();
    if (hexValue && hexValue !== "#" && !/^#([0-9a-fA-F]{6})$/.test(hexValue)) {
      setError("کد رنگ باید به شکل #RRGGBB باشد.");
      return;
    }
    const body = {
      name_fa: nameFa.trim(),
      hex_code: hexValue && hexValue !== "#" ? hexValue : "",
      is_active: isActive,
    };
    setBusy(true);
    try {
      if (editingId) { await updateColor(editingId, body); setMsg("رنگ به‌روزرسانی شد."); }
      else { await createColor(body); setMsg("رنگ جدید ساخته شد."); }
      reset();
      await load();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.fieldErrors?.name_fa?.[0] ?? apiErr?.message ?? "عملیات ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Color) {
    if (!window.confirm(`رنگ «${c.name_fa}» حذف شود؟`)) return;
    setBusy(true); setError(null); setMsg(null);
    try {
      await deleteColor(c.id);
      setMsg("رنگ حذف شد.");
      if (editingId === c.id) reset();
      await load();
    } catch (err) {
      setError((err as ApiError)?.message ?? "حذف ناموفق بود.");
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-silver bg-white p-5">
      <h2 className="mb-4 text-lg font-bold text-iron-grey">رنگ‌ها</h2>
      {msg && <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}
      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-3 rounded-lg border border-silver/60 bg-brand-light/40 p-3">
        <div>
          <label className="form-label">نام رنگ<span className="text-red-600"> *</span></label>
          <input className="input-field" value={nameFa} onChange={(e) => setNameFa(e.target.value)} placeholder="مثلاً مشکی" />
        </div>
        <div className="flex items-center gap-2">
          <input type="color" value={/^#([0-9a-fA-F]{6})$/.test(hex) ? hex : "#000000"} onChange={(e) => setHex(e.target.value)} className="h-10 w-12 cursor-pointer rounded border border-silver" aria-label="انتخاب رنگ" />
          <input className="input-field flex-1" value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#RRGGBB" inputMode="text" />
        </div>
        <label className="flex items-center gap-2 text-sm text-iron-grey">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-brand-accent" />
          فعال
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={submit} disabled={busy} className="btn-primary disabled:opacity-50">{busy ? "…" : editingId ? "ذخیره" : "افزودن رنگ"}</button>
          {editingId && <button type="button" onClick={reset} className="rounded-lg border border-silver px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue">انصراف</button>}
        </div>
      </div>

      <div className="mt-4">
        {loading ? <CenterSpinner inline /> : colors.length === 0 ? (
          <p className="py-4 text-center text-sm text-blue-slate">رنگی ثبت نشده است.</p>
        ) : (
          <ul className="space-y-2">
            {colors.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-lg border border-silver/60 p-2">
                <span className="h-5 w-5 shrink-0 rounded-full border border-silver" style={{ backgroundColor: c.hex_code || "#ccc" }} aria-hidden />
                <span className="flex-1 text-sm font-medium text-iron-grey">{c.name_fa}</span>
                {!c.is_active && <span className="text-[11px] text-brand-muted">غیرفعال</span>}
                <button type="button" onClick={() => { setEditingId(c.id); setNameFa(c.name_fa); setHex(c.hex_code || "#"); setIsActive(c.is_active); }} className="rounded px-2 py-1 text-xs font-semibold text-blue-slate hover:text-bondi-blue">ویرایش</button>
                <button type="button" onClick={() => remove(c)} disabled={busy} className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">حذف</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------- سایزها --------------------------------- */

function SizeManager() {
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [nameFa, setNameFa] = useState("");
  const [value, setValue] = useState("");
  const [order, setOrder] = useState("0");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSizes(await listSizes());
    } catch {
      setError("خطا در دریافت سایزها.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function reset() {
    setEditingId(null);
    setNameFa("");
    setValue("");
    setOrder("0");
  }

  async function submit() {
    setError(null);
    setMsg(null);
    if (!nameFa.trim()) { setError("نام سایز الزامی است."); return; }
    if (!value.trim()) { setError("مقدار سایز الزامی است."); return; }
    const body = { name_fa: nameFa.trim(), value: value.trim(), display_order: Number(order) || 0 };
    setBusy(true);
    try {
      if (editingId) { await updateSize(editingId, body); setMsg("سایز به‌روزرسانی شد."); }
      else { await createSize(body); setMsg("سایز جدید ساخته شد."); }
      reset();
      await load();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.fieldErrors?.value?.[0] ?? apiErr?.fieldErrors?.name_fa?.[0] ?? apiErr?.message ?? "عملیات ناموفق بود.");
    } finally { setBusy(false); }
  }

  async function remove(s: Size) {
    if (!window.confirm(`سایز «${s.name_fa}» حذف شود؟`)) return;
    setBusy(true); setError(null); setMsg(null);
    try {
      await deleteSize(s.id);
      setMsg("سایز حذف شد.");
      if (editingId === s.id) reset();
      await load();
    } catch (err) {
      setError((err as ApiError)?.message ?? "حذف ناموفق بود.");
    } finally { setBusy(false); }
  }

  return (
    <section className="rounded-xl border border-silver bg-white p-5">
      <h2 className="mb-4 text-lg font-bold text-iron-grey">سایزها</h2>
      {msg && <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}
      {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-3 rounded-lg border border-silver/60 bg-brand-light/40 p-3">
        <div>
          <label className="form-label">نام سایز<span className="text-red-600"> *</span></label>
          <input className="input-field" value={nameFa} onChange={(e) => setNameFa(e.target.value)} placeholder="مثلاً ۴۲ یا ایکس‌لارج" />
        </div>
        <div>
          <label className="form-label">مقدار (یکتا)<span className="text-red-600"> *</span></label>
          <input className="input-field" value={value} onChange={(e) => setValue(e.target.value)} placeholder="مثلاً 42 یا XL" />
        </div>
        <div>
          <label className="form-label">ترتیب نمایش</label>
          <input className="input-field" value={order} onChange={(e) => setOrder(e.target.value)} inputMode="numeric" />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={submit} disabled={busy} className="btn-primary disabled:opacity-50">{busy ? "…" : editingId ? "ذخیره" : "افزودن سایز"}</button>
          {editingId && <button type="button" onClick={reset} className="rounded-lg border border-silver px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue">انصراف</button>}
        </div>
      </div>

      <div className="mt-4">
        {loading ? <CenterSpinner inline /> : sizes.length === 0 ? (
          <p className="py-4 text-center text-sm text-blue-slate">سایزی ثبت نشده است.</p>
        ) : (
          <ul className="space-y-2">
            {sizes.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-lg border border-silver/60 p-2">
                <span className="flex-1 text-sm font-medium text-iron-grey">{s.name_fa} <span className="text-xs text-brand-muted">({s.value})</span></span>
                <span className="text-[11px] text-brand-muted">ترتیب {formatNumber(s.display_order ?? 0)}</span>
                <button type="button" onClick={() => { setEditingId(s.id); setNameFa(s.name_fa); setValue(s.value); setOrder(String(s.display_order ?? 0)); }} className="rounded px-2 py-1 text-xs font-semibold text-blue-slate hover:text-bondi-blue">ویرایش</button>
                <button type="button" onClick={() => remove(s)} disabled={busy} className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">حذف</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CenterSpinner({ inline = false }: { inline?: boolean }) {
  const spinner = <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />;
  if (inline) return <div className="flex justify-center py-8">{spinner}</div>;
  return <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">{spinner}</main>;
}
