"use client";

/**
 * مدیریت سفارش‌ها — فهرست (ADMIN / OWNER) — RTL / فارسی.
 *
 * فهرست همه‌ی سفارش‌ها را از GET /api/orders/history/ می‌گیرد (بک‌اند برای staff
 * همه‌ی سفارش‌ها را برمی‌گرداند). فیلتر وضعیت سمت سرور (?status=) اعمال می‌شود و
 * صفحه‌بندی بک‌اند حفظ می‌شود؛ جست‌وجوی ساده روی صفحه‌ی جاری سمت کاربر انجام
 * می‌شود (شناسه / نام یا شماره‌ی گیرنده).
 *
 * گارد سمت‌کاربر مکمل middleware است؛ مرجع نهایی، بک‌اند است.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { AdminOrderCard } from "@/components/admin/orders/AdminOrderCard";
import { useAuth } from "@/context/AuthContext";
import { getAdminOrders } from "@/services/adminOrderService";
import { formatNumber } from "@/lib/persian";
import type { Order, OrderStatus } from "@/types/order";

type StatusFilter = "ALL" | OrderStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "همه" },
  { value: "PENDING", label: "در انتظار پرداخت" },
  { value: "PAID", label: "پرداخت‌شده" },
  { value: "PROCESSING", label: "در حال پردازش" },
  { value: "SHIPPED", label: "ارسال‌شده" },
  { value: "DELIVERED", label: "تحویل‌شده" },
  { value: "CANCELED", label: "لغوشده" },
];

const PAGE_SIZE = 20; // مطابق PAGE_SIZE بک‌اند

export default function AdminOrdersPage() {
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";

  const [orders, setOrders] = useState<Order[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminOrders({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page,
      });
      setOrders(data.results);
      setCount(data.count);
      setHasNext(Boolean(data.next));
      setHasPrev(Boolean(data.previous));
    } catch {
      setError("خطا در دریافت سفارش‌ها. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    if (authLoading || !isStaff) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isStaff, load]);

  // جست‌وجوی ساده روی صفحه‌ی جاری (سمت کاربر؛ صفحه‌بندی سرور را نمی‌شکند).
  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      return (
        String(o.id).includes(q) ||
        (o.receiver_name ?? "").toLowerCase().includes(q) ||
        (o.receiver_phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  if (authLoading) return <CenterSpinner />;

  if (!isStaff) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen flex-col items-center justify-center bg-dust-grey/40 px-4 text-center"
      >
        <p className="text-5xl font-black text-silver">۴۰۳</p>
        <h1 className="mt-2 text-xl font-bold text-iron-grey">دسترسی غیرمجاز</h1>
        <p className="mt-1 text-blue-slate">
          این بخش تنها برای مدیران و مالک فروشگاه در دسترس است.
        </p>
        <Link href="/" className="btn-primary mt-6">
          بازگشت به فروشگاه
        </Link>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-dust-grey/40">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* سربرگ */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-silver pb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-iron-grey">
              مدیریت سفارش‌ها
            </h1>
            <p className="mt-1 text-sm text-blue-slate">
              {loading
                ? "در حال بارگذاری…"
                : `${formatNumber(count)} سفارش ثبت‌شده`}
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate transition-colors hover:border-bondi-blue hover:text-bondi-blue"
          >
            ← بازگشت به داشبورد
          </Link>
        </header>

        {/* فیلترها */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
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
          <div className="md:mr-auto">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جست‌وجو در این صفحه: شناسه / نام یا شماره گیرنده"
              className="input-field w-full md:w-80"
              aria-label="جست‌وجوی سفارش در صفحه‌ی جاری"
            />
          </div>
        </div>

        {/* محتوا */}
        {loading ? (
          <CenterSpinner inline />
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-silver bg-white p-12 text-center">
            <p className="font-semibold text-iron-grey">
              {statusFilter === "ALL"
                ? "هنوز هیچ سفارشی ثبت نشده است."
                : "سفارشی با این وضعیت یافت نشد."}
            </p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-xl border border-silver bg-white p-12 text-center">
            <p className="font-semibold text-iron-grey">
              نتیجه‌ای برای جست‌وجوی شما در این صفحه یافت نشد.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleOrders.map((order) => (
              <AdminOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {/* صفحه‌بندی */}
        {!loading && !error && orders.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate transition-colors hover:border-bondi-blue disabled:cursor-not-allowed disabled:opacity-40"
            >
              صفحه‌ی قبلی →
            </button>
            <span className="text-sm text-blue-slate">
              صفحه‌ی {formatNumber(page)} از {formatNumber(totalPages)}
            </span>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate transition-colors hover:border-bondi-blue disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← صفحه‌ی بعدی
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function CenterSpinner({ inline = false }: { inline?: boolean }) {
  const spinner = (
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
  );
  if (inline) {
    return <div className="flex justify-center py-16">{spinner}</div>;
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">
      {spinner}
    </main>
  );
}
