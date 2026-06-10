"use client";

/**
 * مدیریت سفارش‌ها — جزئیات یک سفارش (ADMIN / OWNER) — RTL / فارسی.
 *
 * سفارش را از GET /api/orders/history/{id}/ می‌گیرد (staff به همه‌ی سفارش‌ها
 * دسترسی دارد). نمایش اطلاعات مشتری/گیرنده، آدرس، اقلام و جمع‌بندی مالی.
 *
 * تغییر وضعیت: بک‌اند فعلاً endpointی برای تغییر وضعیت سفارش ندارد، پس این بخش
 * فقط‌خواندنی است (هیچ تغییر ساختگی انجام نمی‌شود).
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderItemsList } from "@/components/orders/OrderItemsList";
import { OrderTotals } from "@/components/orders/OrderTotals";
import { AdminOrderStatusControl } from "@/components/admin/orders/AdminOrderStatusControl";
import { useAuth } from "@/context/AuthContext";
import { getAdminOrder } from "@/services/adminOrderService";
import { formatNumber, formatPersianDate } from "@/lib/persian";
import type { Order } from "@/types/order";

function addr(value: Order["shipping_address"], key: string): string | undefined {
  if (value && typeof value === "object") {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

export default function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const orderId = Number(id);
  const { role, isLoading: authLoading } = useAuth();
  const isStaff = role === "OWNER" || role === "ADMIN";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isStaff) {
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
    getAdminOrder(orderId)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setError("سفارش یافت نشد یا به آن دسترسی ندارید.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, isStaff, authLoading]);

  if (authLoading) return <CenterSpinner />;

  if (!isStaff) {
    return (
      <Centered>
        <p className="text-5xl font-black text-silver">۴۰۳</p>
        <h1 className="mt-2 text-xl font-bold text-iron-grey">دسترسی غیرمجاز</h1>
        <p className="mt-1 text-blue-slate">
          این بخش تنها برای مدیران و مالک فروشگاه در دسترس است.
        </p>
        <Link href="/" className="btn-primary mt-6">
          بازگشت به فروشگاه
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
        <Link href="/admin/orders" className="btn-primary mt-6">
          بازگشت به مدیریت سفارش‌ها
        </Link>
      </Centered>
    );
  }

  const province = addr(order.shipping_address, "province");
  const city = addr(order.shipping_address, "city");
  const line1 = addr(order.shipping_address, "line1");
  const postalCode = addr(order.shipping_address, "postal_code");
  const notes = addr(order.shipping_address, "notes");

  return (
    <main dir="rtl" className="min-h-screen bg-dust-grey/40">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-5 text-sm text-blue-slate">
          <Link href="/admin/orders" className="hover:text-bondi-blue">
            ← بازگشت به مدیریت سفارش‌ها
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
            {/* اطلاعات مشتری و گیرنده */}
            <section className="rounded-xl border border-silver bg-white p-5">
              <h2 className="mb-3 text-lg font-bold text-iron-grey">
                اطلاعات مشتری و ارسال
              </h2>
              <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
                <Field label="شناسه‌ی مشتری" value={`کاربر #${formatNumber(order.user)}`} />
                <Field label="نام گیرنده" value={order.receiver_name || "—"} />
                <Field label="شماره گیرنده" value={order.receiver_phone || "—"} />
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
              {notes && (
                <p className="mt-2 text-sm leading-relaxed text-iron-grey">
                  <span className="text-silver">یادداشت: </span>
                  {notes}
                </p>
              )}
            </section>

            <OrderItemsList items={order.items} />

            {/* تغییر وضعیت سفارش (فقط ADMIN/OWNER) */}
            <AdminOrderStatusControl order={order} onUpdated={setOrder} />
          </div>

          <aside className="h-fit lg:sticky lg:top-24">
            <OrderTotals order={order} />
          </aside>
        </div>
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
      className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center"
    >
      {children}
    </main>
  );
}

function CenterSpinner() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
    </main>
  );
}
