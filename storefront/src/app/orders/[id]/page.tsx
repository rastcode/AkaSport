"use client";

/**
 * صفحه‌ی جزئیات سفارش (RTL / فارسی) — Client Component.
 *
 * سفارش را از GET /api/orders/history/{id}/ می‌گیرد. فقط برای کاربر لاگین‌شده؛
 * اگر سفارش یافت نشد یا دسترسی نبود، پیام فارسی مناسب نشان می‌دهد.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderItemsList } from "@/components/orders/OrderItemsList";
import { OrderTotals } from "@/components/orders/OrderTotals";
import { useAuth } from "@/context/AuthContext";
import { getOrder } from "@/services/orderService";
import { formatNumber, formatPersianDate } from "@/lib/persian";
import type { Order } from "@/types/order";

function addr(value: Order["shipping_address"], key: string): string | undefined {
  if (value && typeof value === "object") {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

export default function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const orderId = Number(id);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }
    if (!Number.isFinite(orderId)) {
      setError("شناسه‌ی سفارش نامعتبر است.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrder(orderId)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("سفارش یافت نشد یا به آن دسترسی ندارید.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, isAuthenticated, authLoading]);

  if (authLoading) return <CenterSpinner />;

  if (!isAuthenticated) {
    return (
      <Centered>
        <h1 className="text-2xl font-extrabold text-iron-grey">جزئیات سفارش</h1>
        <p className="mt-3 text-blue-slate">
          برای مشاهده سفارش‌ها ابتدا وارد حساب کاربری شوید.
        </p>
        <Link href={`/login?next=/orders/${id}`} className="btn-primary mt-6">
          ورود به حساب کاربری
        </Link>
      </Centered>
    );
  }

  if (loading) return <CenterSpinner />;

  if (error || !order) {
    return (
      <Centered>
        <h1 className="text-2xl font-extrabold text-iron-grey">جزئیات سفارش</h1>
        <p className="mt-3 text-blue-slate">{error ?? "سفارش یافت نشد."}</p>
        <Link href="/orders" className="btn-primary mt-6">
          بازگشت به سفارش‌ها
        </Link>
      </Centered>
    );
  }

  const province = addr(order.shipping_address, "province");
  const city = addr(order.shipping_address, "city");
  const line1 = addr(order.shipping_address, "line1");
  const postalCode = addr(order.shipping_address, "postal_code");

  return (
    <main dir="rtl" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-5 text-sm text-blue-slate">
        <Link href="/orders" className="hover:text-bondi-blue">
          ← بازگشت به سفارش‌ها
        </Link>
      </nav>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-silver pb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-iron-grey">
            سفارش #{formatNumber(order.id)}
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <span className="text-sm text-blue-slate">
          {formatPersianDate(order.created_at)}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* اطلاعات گیرنده و آدرس */}
          <section className="rounded-xl border border-silver bg-white p-5">
            <h2 className="mb-3 text-lg font-bold text-iron-grey">اطلاعات ارسال</h2>
            <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
              <Field label="نام گیرنده" value={order.receiver_name || "—"} />
              <Field label="شماره تماس" value={order.receiver_phone || "—"} />
              <Field
                label="استان / شهر"
                value={[province, city].filter(Boolean).join("، ") || "—"}
              />
              {postalCode && <Field label="کد پستی" value={postalCode} />}
            </dl>
            {line1 && (
              <p className="mt-3 text-sm leading-relaxed text-iron-grey">
                <span className="text-silver">آدرس: </span>
                {line1}
              </p>
            )}
          </section>

          <OrderItemsList items={order.items} />
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <OrderTotals order={order} />
        </aside>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-silver">{label}</dt>
      <dd className="mt-0.5 text-iron-grey">{value}</dd>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-4 text-center"
    >
      {children}
    </main>
  );
}

function CenterSpinner() {
  return (
    <main className="mx-auto flex min-h-[55vh] max-w-5xl items-center justify-center px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
    </main>
  );
}
