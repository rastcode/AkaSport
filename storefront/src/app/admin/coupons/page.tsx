"use client";

/**
 * مدیریت کدهای تخفیف (ADMIN / OWNER) — RTL / فارسی.
 * ساخت/ویرایش/فعال‌سازی/حذف کوپن با endpointهای واقعی orders.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  updateCoupon,
} from "@/services/couponService";
import { formatToman, formatNumber, formatPersianDate } from "@/lib/persian";
import type { ApiError } from "@/types/auth";
import type { Coupon, CouponFormData, DiscountType } from "@/types/coupon";

type StatusFilter = "all" | "active" | "inactive" | "expired";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "active", label: "فعال" },
  { value: "inactive", label: "غیرفعال" },
  { value: "expired", label: "منقضی‌شده" },
];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminCouponsPage() {
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // فرم
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [value, setValue] = useState("");
  const [active, setActive] = useState(true);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [maxUses, setMaxUses] = useState("0");
  const [minOrder, setMinOrder] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCoupons(await listCoupons(filter === "all" ? undefined : filter));
    } catch {
      setError("خطا در دریافت کدهای تخفیف.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (authLoading || !isStaff) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isStaff, load]);

  function reset() {
    setEditingId(null);
    setCode("");
    setDiscountType("PERCENTAGE");
    setValue("");
    setActive(true);
    setValidFrom("");
    setValidTo("");
    setMaxUses("0");
    setMinOrder("");
    setMaxDiscount("");
  }

  function startEdit(c: Coupon) {
    setEditingId(c.id);
    setCode(c.code);
    setDiscountType(c.discount_type);
    setValue(c.value);
    setActive(c.active);
    setValidFrom(toLocalInput(c.valid_from));
    setValidTo(toLocalInput(c.valid_to));
    setMaxUses(String(c.max_uses ?? 0));
    setMinOrder(c.min_order_amount ?? "");
    setMaxDiscount(c.max_discount_amount ?? "");
    setNotice(null);
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    setError(null);
    setNotice(null);
    if (!code.trim()) { setError("کد تخفیف الزامی است."); return; }
    const num = Number(value);
    if (!value || Number.isNaN(num) || num <= 0) { setError("مقدار تخفیف باید بزرگ‌تر از صفر باشد."); return; }
    if (discountType === "PERCENTAGE" && num > 100) { setError("درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد."); return; }

    const payload: CouponFormData = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      value: num,
      active,
      max_uses: Number(maxUses) || 0,
      valid_from: validFrom ? new Date(validFrom).toISOString() : undefined,
      valid_to: validTo ? new Date(validTo).toISOString() : null,
      min_order_amount: minOrder ? Number(minOrder) : null,
      max_discount_amount: maxDiscount ? Number(maxDiscount) : null,
    };

    setBusy(true);
    try {
      if (editingId) { await updateCoupon(editingId, payload); setNotice("کد تخفیف به‌روزرسانی شد."); }
      else { await createCoupon(payload); setNotice("کد تخفیف جدید ساخته شد."); }
      reset();
      await load();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.fieldErrors?.code?.[0] ?? apiErr?.fieldErrors?.value?.[0] ?? apiErr?.message ?? "عملیات ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c: Coupon) {
    setBusy(true);
    setError(null);
    try {
      await updateCoupon(c.id, { active: !c.active });
      await load();
    } catch (err) {
      setError((err as ApiError)?.message ?? "تغییر وضعیت ناموفق بود.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Coupon) {
    if (!window.confirm(`کد «${c.code}» حذف شود؟`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCoupon(c.id);
      setNotice("کد تخفیف حذف شد.");
      if (editingId === c.id) reset();
      await load();
    } catch (err) {
      setError((err as ApiError)?.message ?? "حذف ناموفق بود.");
    } finally {
      setBusy(false);
    }
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
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-silver pb-5">
          <h1 className="text-2xl font-extrabold text-iron-grey">مدیریت کدهای تخفیف</h1>
          <Link href="/admin/dashboard" className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue">← داشبورد</Link>
        </header>

        {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* فرم */}
        <section className="mb-8 rounded-xl border border-silver bg-white p-5">
          <h2 className="mb-4 text-lg font-bold text-iron-grey">{editingId ? "ویرایش کد تخفیف" : "کد تخفیف جدید"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="کد" required value={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="AKASPORT10" />
            <div>
              <label className="form-label">نوع تخفیف</label>
              <select className="input-field" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
                <option value="PERCENTAGE">درصدی</option>
                <option value="FIXED">مبلغ ثابت (تومان)</option>
              </select>
            </div>
            <Field label={discountType === "PERCENTAGE" ? "مقدار (درصد)" : "مقدار (تومان)"} required value={value} onChange={setValue} inputMode="numeric" />
            <Field label="حداکثر دفعات استفاده (۰ = نامحدود)" value={maxUses} onChange={setMaxUses} inputMode="numeric" />
            <Field label="حداقل مبلغ سفارش (اختیاری، تومان)" value={minOrder} onChange={setMinOrder} inputMode="numeric" />
            {discountType === "PERCENTAGE" && (
              <Field label="سقف تخفیف (اختیاری، تومان)" value={maxDiscount} onChange={setMaxDiscount} inputMode="numeric" />
            )}
            <div>
              <label className="form-label">تاریخ شروع (اختیاری)</label>
              <input type="datetime-local" className="input-field" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div>
              <label className="form-label">تاریخ پایان (اختیاری)</label>
              <input type="datetime-local" className="input-field" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-iron-grey">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-brand-accent" />
              فعال
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={submit} disabled={busy} className="btn-primary disabled:opacity-50">{busy ? "در حال ذخیره…" : editingId ? "ذخیره تغییرات" : "ساخت کد"}</button>
            {editingId && <button type="button" onClick={reset} className="rounded-lg border border-silver px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue">انصراف</button>}
          </div>
        </section>

        {/* فیلتر + فهرست */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => setFilter(f.value)} className={"rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors " + (filter === f.value ? "bg-bondi-blue text-white" : "border border-silver bg-white text-blue-slate hover:border-bondi-blue")}>{f.label}</button>
          ))}
        </div>

        {loading ? (
          <CenterSpinner inline />
        ) : coupons.length === 0 ? (
          <div className="rounded-xl border border-silver bg-white p-12 text-center">
            <p className="font-semibold text-iron-grey">هنوز کد تخفیفی ساخته نشده است.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {coupons.map((c) => (
              <li key={c.id} className="rounded-xl border border-silver/60 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-iron-grey">{c.code}</span>
                    <span className="rounded-full bg-brand-accent/10 px-2 py-0.5 text-[11px] font-semibold text-brand-accent">
                      {c.discount_type === "PERCENTAGE" ? `${formatNumber(Number(c.value))}٪` : formatToman(c.value)}
                    </span>
                    <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + (c.active ? "bg-emerald-50 text-emerald-700" : "bg-dust-grey text-blue-slate")}>{c.active ? "فعال" : "غیرفعال"}</span>
                  </div>
                  <span className="text-xs text-silver">استفاده: {formatNumber(c.used_count)}{c.max_uses ? ` / ${formatNumber(c.max_uses)}` : ""}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-blue-slate">
                  {c.min_order_amount && <span>حداقل سفارش: {formatToman(c.min_order_amount)}</span>}
                  {c.max_discount_amount && <span>سقف تخفیف: {formatToman(c.max_discount_amount)}</span>}
                  {c.valid_to && <span>انقضا: {formatPersianDate(c.valid_to)}</span>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => startEdit(c)} className="rounded-lg border border-silver px-3 py-1.5 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue">ویرایش</button>
                  <button type="button" onClick={() => toggleActive(c)} disabled={busy} className="rounded-lg border border-silver px-3 py-1.5 text-sm font-semibold text-blue-slate hover:border-bondi-blue disabled:opacity-50">{c.active ? "غیرفعال‌سازی" : "فعال‌سازی"}</button>
                  <button type="button" onClick={() => remove(c)} disabled={busy} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">حذف</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function Field({ label, value, onChange, required, inputMode, placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; inputMode?: "text" | "numeric"; placeholder?: string }) {
  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-600"> *</span>}</label>
      <input className="input-field" value={value} inputMode={inputMode} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CenterSpinner({ inline = false }: { inline?: boolean }) {
  const spinner = <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />;
  if (inline) return <div className="flex justify-center py-12">{spinner}</div>;
  return <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">{spinner}</main>;
}
