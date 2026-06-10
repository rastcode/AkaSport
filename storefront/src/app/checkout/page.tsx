"use client";

/**
 * صفحه‌ی تسویه‌حساب (RTL / فارسی) — Client Component.
 *
 * مسیر محافظت‌شده (middleware) و فقط برای کاربر لاگین‌شده. اطلاعات گیرنده و کد
 * تخفیف را می‌گیرد و سفارش را با POST /api/orders/checkout/ ثبت می‌کند. چون صفحه‌ی
 * مجزای سفارش‌ها وجود ندارد، پس از موفقیت یک صفحه‌ی تأیید درون‌خطی نشان می‌دهد.
 */

import { useState } from "react";
import Link from "next/link";

import { CheckoutForm, type CheckoutFormErrors } from "@/components/checkout/CheckoutForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { postCheckout } from "@/services/orderService";
import { formatToman, formatNumber } from "@/lib/persian";
import type { CartApiError } from "@/types/cart";
import type { CheckoutPayload, Order } from "@/types/order";

export default function CheckoutPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, isLoading, subtotal, totalQuantity, refresh } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<CheckoutFormErrors>({});
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  if (authLoading || isLoading) {
    return <CenterSpinner />;
  }

  if (!isAuthenticated) {
    return (
      <Centered>
        <h1 className="text-2xl font-extrabold text-iron-grey">تسویه‌حساب</h1>
        <p className="mt-3 text-blue-slate">
          برای تکمیل خرید ابتدا وارد حساب کاربری شوید.
        </p>
        <Link href="/login?next=/checkout" className="btn-primary mt-6">
          ورود به حساب کاربری
        </Link>
      </Centered>
    );
  }

  if (placedOrder) {
    return <OrderSuccess order={placedOrder} />;
  }

  if (items.length === 0) {
    return (
      <Centered>
        <h1 className="text-2xl font-extrabold text-iron-grey">سبد خرید خالی است</h1>
        <p className="mt-2 text-blue-slate">برای تسویه‌حساب ابتدا کالایی به سبد اضافه کنید.</p>
        <Link href="/products" className="btn-primary mt-6">مشاهده‌ی محصولات</Link>
      </Centered>
    );
  }

  async function handleSubmit(payload: CheckoutPayload) {
    setErrors({});
    setSubmitting(true);
    try {
      const order = await postCheckout(payload);
      await refresh(); // سبد پس از ثبت موفق خالی شده است
      setPlacedOrder(order);
    } catch (err) {
      const apiErr = err as CartApiError;
      setErrors({
        message: apiErr.message ?? "خطا در ثبت سفارش.",
        fieldErrors: apiErr.fieldErrors,
        stockErrors: apiErr.stockErrors,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main dir="rtl" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 border-b border-silver pb-5">
        <h1 className="text-3xl font-extrabold text-iron-grey">تسویه‌حساب</h1>
        <p className="mt-1 text-sm text-blue-slate">اطلاعات گیرنده را وارد و سفارش را نهایی کنید.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <CheckoutForm submitting={submitting} errors={errors} onSubmit={handleSubmit} />
        <aside className="h-fit">
          <OrderSummary items={items} subtotal={subtotal} totalQuantity={totalQuantity} />
        </aside>
      </div>
    </main>
  );
}

/* ------------------------------ صفحه‌ی موفقیت ------------------------------ */

function OrderSuccess({ order }: { order: Order }) {
  return (
    <Centered>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bondi-blue/10">
        <svg className="h-10 w-10 text-bondi-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="mt-6 text-2xl font-extrabold text-iron-grey">سفارش شما با موفقیت ثبت شد.</h1>
      <p className="mt-2 text-blue-slate">
        شماره‌ی سفارش: <span className="font-bold">{formatNumber(order.id)}</span>
      </p>

      <div className="mt-6 w-full max-w-md rounded-xl border border-silver bg-dust-grey p-5 text-sm">
        <Row label="جمع کالاها" value={formatToman(order.subtotal)} />
        {Number(order.discount_amount) > 0 && (
          <Row label="تخفیف" value={`− ${formatToman(order.discount_amount)}`} accent="text-green-600" />
        )}
        <Row
          label="هزینه‌ی ارسال"
          value={Number(order.shipping_cost) === 0 ? "رایگان" : formatToman(order.shipping_cost)}
        />
        <div className="mt-2 flex items-center justify-between border-t border-silver pt-3">
          <span className="font-bold text-iron-grey">مبلغ نهایی</span>
          <span className="text-lg font-extrabold text-blue-slate">{formatToman(order.total_amount)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/orders" className="btn-primary sm:px-8">پیگیری سفارش‌ها</Link>
        <Link href="/products" className="btn-ghost sm:px-8">ادامه‌ی خرید</Link>
      </div>
    </Centered>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-blue-slate">{label}</span>
      <span className={"font-semibold " + (accent ?? "text-iron-grey")}>{value}</span>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main dir="rtl" className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      {children}
    </main>
  );
}

function CenterSpinner() {
  return (
    <main className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
    </main>
  );
}
