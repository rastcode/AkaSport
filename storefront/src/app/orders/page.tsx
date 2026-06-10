"use client";

/**
 * صفحه‌ی «سفارش‌های من» (RTL / فارسی) — Client Component.
 *
 * فهرست سفارش‌ها را از GET /api/orders/history/ می‌گیرد. فقط برای کاربر
 * لاگین‌شده؛ در غیر این صورت پیام ورود نشان داده می‌شود.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

import { OrderCard } from "@/components/orders/OrderCard";
import { useAuth } from "@/context/AuthContext";
import { getOrders } from "@/services/orderService";
import type { Order } from "@/types/order";

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrders()
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch(() => {
        if (!cancelled) setError("خطا در دریافت سفارش‌ها. لطفاً دوباره تلاش کنید.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  if (authLoading) return <CenterSpinner />;

  if (!isAuthenticated) {
    return (
      <Centered>
        <h1 className="text-2xl font-extrabold text-iron-grey">سفارش‌های من</h1>
        <p className="mt-3 text-blue-slate">
          برای مشاهده سفارش‌ها ابتدا وارد حساب کاربری شوید.
        </p>
        <Link href="/login?next=/orders" className="btn-primary mt-6">
          ورود به حساب کاربری
        </Link>
      </Centered>
    );
  }

  return (
    <main dir="rtl" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 border-b border-silver pb-5">
        <h1 className="text-3xl font-extrabold text-iron-grey">سفارش‌های من</h1>
        <p className="mt-1 text-sm text-blue-slate">پیگیری و مشاهده‌ی سفارش‌های شما</p>
      </header>

      {loading ? (
        <CenterSpinner inline />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-silver bg-dust-grey/50 p-12 text-center">
          <p className="font-semibold text-iron-grey">هنوز سفارشی ثبت نکرده‌اید.</p>
          <Link href="/products" className="btn-primary mt-5">
            مشاهده‌ی محصولات
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </main>
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

function CenterSpinner({ inline = false }: { inline?: boolean }) {
  const spinner = (
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
  );
  if (inline) {
    return <div className="flex justify-center py-16">{spinner}</div>;
  }
  return (
    <main className="mx-auto flex min-h-[55vh] max-w-4xl items-center justify-center px-4">
      {spinner}
    </main>
  );
}
