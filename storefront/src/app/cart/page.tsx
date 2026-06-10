"use client";

/**
 * صفحه‌ی سبد خرید (RTL / فارسی) — Client Component.
 *
 * داده از `CartContext` (متصل به /api/orders/cart/) می‌آید. فقط برای کاربر
 * لاگین‌شده کار می‌کند؛ در غیر این صورت پیام فارسی و لینک ورود نشان داده می‌شود.
 */

import Link from "next/link";

import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartSummary } from "@/components/cart/CartSummary";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatNumber } from "@/lib/persian";

export default function CartPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    items,
    isLoading,
    isSyncing,
    totalQuantity,
    subtotal,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  // بارگذاری وضعیت احراز هویت
  if (authLoading) {
    return <CenterSpinner />;
  }

  // کاربر لاگین نیست
  if (!isAuthenticated) {
    return (
      <main
        dir="rtl"
        className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-4 text-center"
      >
        <h1 className="text-2xl font-extrabold text-iron-grey">سبد خرید</h1>
        <p className="mt-3 text-blue-slate">
          برای مشاهده سبد خرید ابتدا وارد حساب کاربری شوید.
        </p>
        <Link href="/login?next=/cart" className="btn-primary mt-6">
          ورود به حساب کاربری
        </Link>
      </main>
    );
  }

  if (isLoading) {
    return <CenterSpinner />;
  }

  // سبد خالی
  if (items.length === 0) {
    return (
      <main
        dir="rtl"
        className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-4 text-center"
      >
        <h1 className="text-2xl font-extrabold text-iron-grey">سبد خرید شما خالی است.</h1>
        <p className="mt-2 text-blue-slate">
          محصولات متنوع ورزشی ما را ببینید و خرید را آغاز کنید.
        </p>
        <Link href="/products" className="btn-primary mt-6">
          مشاهده‌ی محصولات
        </Link>
      </main>
    );
  }

  return (
    <main dir="rtl" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 border-b border-silver pb-5">
        <h1 className="text-3xl font-extrabold text-iron-grey">سبد خرید</h1>
        <p className="mt-1 text-sm text-blue-slate">
          {formatNumber(totalQuantity)} کالا در سبد شما
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <section aria-label="اقلام سبد خرید">
          <ul className="divide-y divide-silver overflow-hidden rounded-xl border border-silver bg-dust-grey">
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                busy={isSyncing}
                onChangeQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => clearCart()}
              disabled={isSyncing}
              className="text-sm font-semibold text-blue-slate transition-colors hover:text-red-600 disabled:opacity-50"
            >
              خالی کردن سبد
            </button>
            <Link href="/products" className="text-sm font-semibold text-bondi-blue hover:text-bondi-blue-dark">
              ← ادامه‌ی خرید
            </Link>
          </div>
        </section>

        <aside className="h-fit">
          <CartSummary totalQuantity={totalQuantity} subtotal={subtotal} />
        </aside>
      </div>
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
