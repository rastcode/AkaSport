"use client";

/**
 * تسویه‌حساب و ثبت سفارش (RTL / فارسی).
 *
 * مسیر محافظت‌شده (توسط middleware). چیدمان دوستونه‌ی راست‌چین:
 *   - ستون راست (غالب): اطلاعات آدرس ارسال.
 *   - ستون چپ: خلاصه‌ی سفارش، کد تخفیف، برآورد هزینه‌ی ارسال و مبلغ نهایی.
 *
 * ثبت سفارش به‌صورت تراکنشی در بک‌اند انجام می‌شود و خطاهای کمبود موجودی
 * به‌صورت شفاف به کاربر نمایش داده می‌شوند. پس از موفقیت، صفحه‌ی تأیید سفارش
 * نمایش داده می‌شود.
 */

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { postCheckout } from "@/services/orderService";
import { formatToman, formatNumber, toEnglishDigits } from "@/lib/persian";
import type {
  CartApiError,
  Order,
  ShippingAddress,
} from "@/types/cart";

/** برآورد سمت‌کاربر هزینه‌ی ارسال (مرجع نهایی، پاسخ بک‌اند است). */
const SHIPPING_FREE_THRESHOLD = 150000; // آستانه‌ی ارسال رایگان (تومان)
const SHIPPING_BASE_FEE = 35000; // هزینه‌ی پایه‌ی ارسال (تومان)

interface AddressForm {
  province: string;
  city: string;
  line1: string;
  postal_code: string;
  recipient: string;
  phone: string;
  notes: string;
}

const EMPTY_ADDRESS: AddressForm = {
  province: "",
  city: "",
  line1: "",
  postal_code: "",
  recipient: "",
  phone: "",
  notes: "",
};

export default function CheckoutPage() {
  const { user } = useAuth();
  const { lines, subtotal, totalQuantity, clearCart, isLoading } = useCart();

  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [stockErrors, setStockErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  /* ---------------------------- محاسبات هزینه ---------------------------- */
  const shippingEstimate = useMemo(() => {
    const afterDiscount = Math.max(0, subtotal - discount);
    if (afterDiscount <= 0) return 0;
    return afterDiscount >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_BASE_FEE;
  }, [subtotal, discount]);

  const payable = useMemo(
    () => Math.max(0, subtotal - discount) + shippingEstimate,
    [subtotal, discount, shippingEstimate],
  );

  /* ------------------------------- کد تخفیف ------------------------------ */
  async function applyCoupon() {
    const code = toEnglishDigits(couponCode).trim().toUpperCase();
    setCouponError(null);
    if (!code) {
      setCouponError("لطفاً کد تخفیف را وارد کنید.");
      return;
    }
    setCouponLoading(true);
    try {
      // اعتبارسنجی واقعی کوپن از طریق یک سفارش آزمایشی سبک نیست؛ بنابراین
      // کوپن را هنگام ثبت نهایی سفارش به بک‌اند می‌سپاریم. اینجا کد را
      // ثبت می‌کنیم و بازخورد را پس از تسویه‌حساب دریافت می‌کنیم.
      setAppliedCoupon(code);
      setCouponError(null);
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setDiscount(0);
    setCouponError(null);
  }

  /* ------------------------------ ثبت سفارش ------------------------------ */
  function updateField(key: keyof AddressForm, value: string) {
    setAddress((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const required: (keyof AddressForm)[] = [
      "province",
      "city",
      "line1",
      "postal_code",
      "recipient",
      "phone",
    ];
    const errors: Record<string, string[]> = {};
    for (const key of required) {
      if (!address[key].trim()) errors[key] = ["این فیلد الزامی است."];
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setStockErrors([]);
    if (!validate()) {
      setFormError("لطفاً فیلدهای الزامی آدرس را تکمیل کنید.");
      return;
    }

    const shipping_address: ShippingAddress = {
      province: address.province.trim(),
      city: address.city.trim(),
      line1: address.line1.trim(),
      postal_code: toEnglishDigits(address.postal_code).trim(),
      recipient: address.recipient.trim(),
      phone: toEnglishDigits(address.phone).trim(),
      notes: address.notes.trim() || undefined,
      country: "IR", // بک‌اند فیلد country را الزامی می‌داند
    };

    setSubmitting(true);
    try {
      const order = await postCheckout({
        shipping_address,
        coupon_code: appliedCoupon ?? undefined,
      });
      await clearCart();
      setPlacedOrder(order);
    } catch (err) {
      const apiErr = err as CartApiError;
      setFormError(apiErr.message);
      if (apiErr.stockErrors?.length) setStockErrors(apiErr.stockErrors);
      if (apiErr.fieldErrors) {
        // خطای کوپن را به بخش کوپن منتقل کن
        const couponMsg = apiErr.fieldErrors["coupon_code"]?.[0];
        if (couponMsg) {
          setCouponError(couponMsg);
          setAppliedCoupon(null);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------- نمایش‌ها ------------------------------ */

  if (placedOrder) {
    return <OrderSuccess order={placedOrder} />;
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
      </main>
    );
  }

  if (lines.length === 0) {
    return (
      <main
        className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center"
        dir="rtl"
      >
        <h1 className="text-2xl font-extrabold text-iron-grey">سبد خرید خالی است</h1>
        <p className="mt-2 text-blue-slate">
          برای تسویه‌حساب ابتدا کالایی به سبد خود اضافه کنید.
        </p>
        <Link href="/products" className="btn-primary mt-6">
          مشاهده‌ی محصولات
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" dir="rtl">
      <header className="mb-6 border-b border-silver pb-5">
        <h1 className="text-3xl font-extrabold text-iron-grey">تسویه‌حساب</h1>
        <p className="mt-1 text-sm text-blue-slate">
          اطلاعات ارسال را وارد کنید و سفارش خود را نهایی کنید.
        </p>
      </header>

      {formError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <p className="font-semibold">{formError}</p>
          {stockErrors.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1">
              {stockErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]"
        noValidate
      >
        {/* ستون راست: آدرس ارسال */}
        <section className="rounded-xl border border-silver bg-dust-grey p-6">
          <h2 className="mb-5 text-lg font-bold text-iron-grey">اطلاعات ارسال</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="recipient"
              label="نام گیرنده"
              value={address.recipient}
              onChange={(v) => updateField("recipient", v)}
              error={fieldErrors.recipient}
              placeholder="نام و نام خانوادگی"
              autoComplete="name"
            />
            <Field
              id="phone"
              label="شماره تماس"
              value={address.phone}
              onChange={(v) => updateField("phone", v)}
              error={fieldErrors.phone}
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              inputMode="tel"
            />
            <Field
              id="province"
              label="استان"
              value={address.province}
              onChange={(v) => updateField("province", v)}
              error={fieldErrors.province}
              placeholder="مثلاً تهران"
            />
            <Field
              id="city"
              label="شهر"
              value={address.city}
              onChange={(v) => updateField("city", v)}
              error={fieldErrors.city}
              placeholder="مثلاً تهران"
            />
            <Field
              id="postal_code"
              label="کد پستی"
              value={address.postal_code}
              onChange={(v) => updateField("postal_code", v)}
              error={fieldErrors.postal_code}
              placeholder="۱۰ رقمی"
              inputMode="numeric"
            />
          </div>

          <div className="mt-4">
            <label htmlFor="line1" className="form-label">
              آدرس دقیق
            </label>
            <textarea
              id="line1"
              rows={3}
              className="input-field resize-none"
              placeholder="خیابان، کوچه، پلاک، واحد"
              value={address.line1}
              onChange={(e) => updateField("line1", e.target.value)}
            />
            {fieldErrors.line1 && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.line1[0]}</p>
            )}
          </div>

          <div className="mt-4">
            <label htmlFor="notes" className="form-label">
              یادداشت برای گیرنده (اختیاری)
            </label>
            <textarea
              id="notes"
              rows={2}
              className="input-field resize-none"
              placeholder="مثلاً ساعت تحویل ترجیحی"
              value={address.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </div>
        </section>

        {/* ستون چپ: خلاصه‌ی سفارش */}
        <aside className="h-fit lg:sticky lg:top-6">
          <div className="rounded-xl border border-silver bg-dust-grey p-6">
            <h2 className="mb-4 text-lg font-bold text-iron-grey">خلاصه‌ی سفارش</h2>

            {/* فهرست اقلام */}
            <ul className="mb-4 max-h-48 space-y-2 overflow-y-auto pl-1 text-sm">
              {lines.map((line) => (
                <li
                  key={line.variantId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-blue-slate">
                    {line.title}
                    <span className="text-silver">
                      {" "}
                      ×{formatNumber(line.quantity)}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium text-iron-grey">
                    {formatToman(Number(line.unitPrice || 0) * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            {/* کد تخفیف */}
            <div className="border-t border-silver pt-4">
              <label htmlFor="coupon" className="form-label">
                کد تخفیف
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg border border-bondi-blue/40 bg-bondi-blue/10 px-3 py-2">
                  <span className="text-sm font-semibold text-bondi-blue-dark">
                    کد «{appliedCoupon}» ثبت شد
                  </span>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs font-medium text-blue-slate hover:text-red-600"
                  >
                    حذف
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    id="coupon"
                    type="text"
                    className="input-field"
                    placeholder="مثلاً WELCOME10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponLoading}
                    className="shrink-0 rounded-lg bg-bondi-blue px-4 py-2 text-sm font-semibold
                               text-white transition-colors hover:bg-bondi-blue-dark
                               disabled:opacity-60"
                  >
                    {couponLoading ? "..." : "اعمال"}
                  </button>
                </div>
              )}
              {couponError && (
                <p className="mt-1 text-xs text-red-600">{couponError}</p>
              )}
              <p className="mt-1 text-xs text-silver">
                اعتبار کد تخفیف هنگام ثبت نهایی سفارش بررسی می‌شود.
              </p>
            </div>

            {/* جزئیات هزینه */}
            <dl className="mt-4 space-y-3 border-t border-silver pt-4 text-sm">
              <Row label={`جمع کالاها (${formatNumber(totalQuantity)} قلم)`}>
                {formatToman(subtotal)}
              </Row>
              {discount > 0 && (
                <Row label="تخفیف" accent="text-green-600">
                  − {formatToman(discount)}
                </Row>
              )}
              <Row label="هزینه‌ی ارسال (برآورد)">
                {shippingEstimate === 0 ? "رایگان" : formatToman(shippingEstimate)}
              </Row>
            </dl>

            <div className="mt-4 flex items-center justify-between border-t border-silver pt-4">
              <span className="text-base font-bold text-iron-grey">مبلغ قابل پرداخت</span>
              <span className="text-xl font-extrabold text-blue-slate">
                {formatToman(payable)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary mt-5 w-full"
            >
              {submitting ? "در حال ثبت سفارش…" : "ثبت و پرداخت سفارش"}
            </button>

            <p className="mt-3 text-center text-xs text-silver">
              با ثبت سفارش، شرایط و قوانین فروشگاه را می‌پذیرید.
            </p>
          </div>
        </aside>
      </form>
    </main>
  );
}

/* ------------------------------ زیرکامپوننت‌ها ------------------------------ */

function Field({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  inputMode,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string[];
  placeholder?: string;
  inputMode?: "text" | "tel" | "numeric";
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error[0]}</p>}
    </div>
  );
}

function Row({
  label,
  children,
  accent,
}: {
  label: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-blue-slate">{label}</dt>
      <dd className={"font-semibold " + (accent ?? "text-iron-grey")}>{children}</dd>
    </div>
  );
}

/* --------------------------- صفحه‌ی تأیید سفارش ----------------------------- */

function OrderSuccess({ order }: { order: Order }) {
  return (
    <main
      className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center"
      dir="rtl"
    >
      <div className="animate-fade-in-up flex w-full flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bondi-blue/10">
          <svg
            className="h-10 w-10 text-bondi-blue"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-iron-grey">
          سفارش شما با موفقیت ثبت شد
        </h1>
        <p className="mt-2 text-blue-slate">
          شماره‌ی سفارش: <span className="font-bold">{formatNumber(order.id)}</span>
        </p>

        <div className="mt-6 w-full rounded-xl border border-silver bg-dust-grey p-5 text-sm">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-blue-slate">جمع کالاها</span>
            <span className="font-semibold text-iron-grey">
              {formatToman(order.subtotal)}
            </span>
          </div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-blue-slate">تخفیف</span>
              <span className="font-semibold text-green-600">
                − {formatToman(order.discount_amount)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-blue-slate">هزینه‌ی ارسال</span>
            <span className="font-semibold text-iron-grey">
              {Number(order.shipping_cost) === 0
                ? "رایگان"
                : formatToman(order.shipping_cost)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-silver pt-3">
            <span className="font-bold text-iron-grey">مبلغ پرداخت‌شده</span>
            <span className="text-lg font-extrabold text-blue-slate">
              {formatToman(order.total_amount)}
            </span>
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/orders" className="btn-primary sm:px-8">
            پیگیری سفارش‌ها
          </Link>
          <Link href="/products" className="btn-ghost sm:px-8">
            ادامه‌ی خرید
          </Link>
        </div>
      </div>
    </main>
  );
}
