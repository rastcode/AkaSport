"use client";

/**
 * کارت‌های تحلیلی داشبورد (RTL / فارسی).
 *
 * داده‌ها از `/api/analytics/dashboard/` (بک‌اند بخش ۵) دریافت می‌شوند:
 * درآمد کل، تعداد سفارشات، هشدار موجودی انبار و پرفروش‌ترین تنوع‌ها.
 */

import { useEffect, useState } from "react";

import { fetchDashboard } from "@/services/analyticsService";
import { formatToman, formatNumber } from "@/lib/persian";
import type { DashboardData, DashboardPeriod } from "@/types/analytics";

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  daily: "روزانه",
  weekly: "هفتگی",
  monthly: "ماهانه",
  yearly: "سالانه",
  all: "کل دوره",
};

export function AnalyticsCards() {
  const [period, setPeriod] = useState<DashboardPeriod>("monthly");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDashboard(period)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError("دریافت داده‌های تحلیلی ناموفق بود.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <section dir="rtl" aria-label="آمار فروشگاه" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-iron-grey">نمای کلی فروش</h2>
        <div className="flex flex-wrap gap-1 rounded-lg bg-dust-grey p-1">
          {(Object.keys(PERIOD_LABELS) as DashboardPeriod[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors " +
                (period === key
                  ? "bg-bondi-blue text-white"
                  : "text-blue-slate hover:text-iron-grey")
              }
            >
              {PERIOD_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {error}
        </div>
      ) : loading || !data ? (
        <CardsSkeleton />
      ) : (
        <>
          {/* کارت‌های شاخص */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="درآمد کل"
              value={formatToman(data.summary.total_revenue)}
              accent
              icon={<RevenueIcon />}
            />
            <StatCard
              label="تعداد سفارشات"
              value={formatNumber(data.summary.total_orders)}
              icon={<OrdersIcon />}
            />
            <StatCard
              label="میانگین ارزش سفارش"
              value={formatToman(data.summary.average_order_value)}
              icon={<AvgIcon />}
            />
            <StatCard
              label="هشدار موجودی انبار"
              value={`${formatNumber(data.low_stock_alerts.length)} کالا`}
              warning={data.low_stock_alerts.length > 0}
              icon={<AlertIcon />}
            />
          </div>

          {/* پرفروش‌ها و موجودی کم */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopSellers data={data} />
            <LowStock data={data} />
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------- کارت آمار --------------------------------- */

function StatCard({
  label,
  value,
  icon,
  accent = false,
  warning = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={
        "flex items-center gap-4 rounded-xl border p-4 " +
        (accent
          ? "border-bondi-blue/30 bg-bondi-blue/5"
          : warning
            ? "border-amber-300 bg-amber-50"
            : "border-silver bg-dust-grey")
      }
    >
      <div
        className={
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white " +
          (warning ? "bg-amber-500" : "bg-bondi-blue")
        }
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-blue-slate">{label}</p>
        <p className="mt-0.5 truncate text-lg font-extrabold text-iron-grey">
          {value}
        </p>
      </div>
    </div>
  );
}

function TopSellers({ data }: { data: DashboardData }) {
  return (
    <div className="rounded-xl border border-silver bg-white p-5">
      <h3 className="mb-3 text-sm font-bold text-iron-grey">
        پرفروش‌ترین محصولات
      </h3>
      {data.top_selling_variants.length === 0 ? (
        <p className="py-6 text-center text-sm text-blue-slate">
          فروشی در این بازه ثبت نشده است.
        </p>
      ) : (
        <ol className="space-y-2">
          {data.top_selling_variants.map((v, i) => (
            <li
              key={v.product_variant_id ?? v.sku}
              className="flex items-center gap-3 rounded-lg bg-dust-grey/50 p-2.5"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bondi-blue text-xs font-bold text-white">
                {formatNumber(i + 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-iron-grey">
                  {v.product_title}
                </p>
                <p className="truncate text-xs text-silver">کد: {v.sku}</p>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-blue-slate">
                  {formatNumber(v.units_sold)} عدد
                </p>
                <p className="text-xs text-blue-slate">{formatToman(v.revenue)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function LowStock({ data }: { data: DashboardData }) {
  return (
    <div className="rounded-xl border border-silver bg-white p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-iron-grey">
        هشدار موجودی انبار
        {data.low_stock_alerts.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            {formatNumber(data.low_stock_alerts.length)}
          </span>
        )}
      </h3>
      {data.low_stock_alerts.length === 0 ? (
        <p className="py-6 text-center text-sm text-blue-slate">
          موجودی همه‌ی کالاها مطلوب است. ✓
        </p>
      ) : (
        <ul className="space-y-2">
          {data.low_stock_alerts.map((item) => (
            <li
              key={item.product_variant_id}
              className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-iron-grey">
                  {item.product_title}
                </p>
                <p className="truncate text-xs text-blue-slate">کد: {item.sku}</p>
              </div>
              <span className="shrink-0 rounded-md bg-amber-500 px-2 py-1 text-xs font-bold text-white">
                {formatNumber(item.stock_quantity)} باقی‌مانده
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-silver bg-dust-grey"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl border border-silver bg-dust-grey" />
        <div className="h-56 animate-pulse rounded-xl border border-silver bg-dust-grey" />
      </div>
    </div>
  );
}

/* -------------------------------- icons ------------------------------------ */
function RevenueIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m4-9a4 4 0 0 0-4-2c-1.8 0-4 .9-4 3s2.2 2.6 4 3 4 .9 4 3-2.2 3-4 3a4 4 0 0 1-4-2" />
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}
function AvgIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17 9 11l4 4 8-8M21 7h-4M21 7v4" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}
