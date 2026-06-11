"use client";

/**
 * مدیریت نظرات (ADMIN / OWNER) — RTL / فارسی.
 * فهرست همه‌ی نظرها با فیلتر وضعیت/جست‌وجو و اکشن‌های تأیید/رد/حذف.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import {
  deleteReview,
  listAdminReviews,
  updateReviewStatus,
} from "@/services/adminCatalogService";
import { formatNumber, formatPersianDate } from "@/lib/persian";
import type { ApiError } from "@/types/auth";
import type { AdminProductReview, ReviewStatus } from "@/types/review";

type StatusFilter = "ALL" | ReviewStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "همه" },
  { value: "PENDING", label: "در انتظار تأیید" },
  { value: "APPROVED", label: "تأیید شده" },
  { value: "REJECTED", label: "رد شده" },
];

const STATUS_FA: Record<ReviewStatus, { label: string; cls: string }> = {
  PENDING: { label: "در انتظار تأیید", cls: "bg-amber-50 text-amber-700" },
  APPROVED: { label: "تأییدشده", cls: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "ردشده", cls: "bg-brand-danger/10 text-brand-danger" },
};

export default function AdminReviewsPage() {
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";

  const [reviews, setReviews] = useState<AdminProductReview[]>([]);
  const [count, setCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminReviews({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search || undefined,
      });
      setReviews(data.results);
      setCount(data.count);
    } catch {
      setError("خطا در دریافت نظرها.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    if (authLoading || !isStaff) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isStaff, load]);

  async function setStatus(r: AdminProductReview, status: ReviewStatus) {
    setBusyId(r.id);
    setError(null);
    setNotice(null);
    try {
      await updateReviewStatus(r.id, status);
      setNotice(status === "APPROVED" ? "نظر تأیید شد." : "نظر رد شد.");
      await load();
    } catch (err) {
      setError((err as ApiError)?.message ?? "عملیات ناموفق بود.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(r: AdminProductReview) {
    if (!window.confirm("این نظر حذف شود؟ این عمل قابل بازگشت نیست.")) return;
    setBusyId(r.id);
    setError(null);
    setNotice(null);
    try {
      await deleteReview(r.id);
      setNotice("نظر حذف شد.");
      await load();
    } catch (err) {
      setError((err as ApiError)?.message ?? "حذف ناموفق بود.");
    } finally {
      setBusyId(null);
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
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-silver pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-iron-grey">مدیریت نظرات</h1>
            <p className="mt-1 text-sm text-blue-slate">
              {loading ? "در حال بارگذاری…" : `${formatNumber(count)} نظر`}
            </p>
          </div>
          <Link href="/admin/dashboard" className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue">← داشبورد</Link>
        </header>

        {notice && <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* فیلترها */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors " +
                  (statusFilter === f.value
                    ? "bg-bondi-blue text-white"
                    : "border border-silver bg-white text-blue-slate hover:border-bondi-blue")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="md:mr-auto flex items-center gap-2">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput.trim()); }}
              placeholder="جست‌وجو در محصول یا متن نظر"
              className="input-field md:w-72"
            />
            <button type="button" onClick={() => setSearch(searchInput.trim())} className="btn-primary shrink-0">جست‌وجو</button>
          </div>
        </div>

        {/* فهرست */}
        {loading ? (
          <CenterSpinner inline />
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-silver bg-white p-12 text-center">
            <p className="font-semibold text-iron-grey">نظری برای نمایش وجود ندارد.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-silver/60 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/product/${encodeURIComponent(r.product_slug)}`} target="_blank" className="font-semibold text-iron-grey hover:text-bondi-blue">
                      {r.product_title}
                    </Link>
                    <span className="text-xs text-brand-accent">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    {r.is_verified_purchase && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">خریدار</span>
                    )}
                    <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + STATUS_FA[r.status].cls}>{STATUS_FA[r.status].label}</span>
                  </div>
                  <span className="text-xs text-silver">{formatPersianDate(r.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-blue-slate">کاربر #{formatNumber(r.user)}</p>
                {r.title && <p className="mt-2 font-bold text-iron-grey">{r.title}</p>}
                <p className="mt-1 leading-relaxed text-blue-slate">{r.comment}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {r.status !== "APPROVED" && (
                    <button type="button" onClick={() => setStatus(r, "APPROVED")} disabled={busyId === r.id} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">تأیید</button>
                  )}
                  {r.status !== "REJECTED" && (
                    <button type="button" onClick={() => setStatus(r, "REJECTED")} disabled={busyId === r.id} className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50">رد کردن</button>
                  )}
                  <button type="button" onClick={() => remove(r)} disabled={busyId === r.id} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">حذف</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function CenterSpinner({ inline = false }: { inline?: boolean }) {
  const spinner = <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />;
  if (inline) return <div className="flex justify-center py-16">{spinner}</div>;
  return <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">{spinner}</main>;
}
