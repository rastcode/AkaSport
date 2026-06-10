"use client";

/**
 * فرم اطلاعات گیرنده + کد تخفیف و دکمه‌ی ثبت سفارش (RTL / فارسی).
 * مقادیر را به والد (صفحه‌ی checkout) می‌سپارد تا فراخوان API انجام شود.
 */

import { useState, type FormEvent } from "react";

import type { CheckoutPayload } from "@/types/order";

export interface CheckoutFormErrors {
  message?: string | null;
  fieldErrors?: Record<string, string[]>;
  stockErrors?: string[];
}

export function CheckoutForm({
  submitting,
  errors,
  onSubmit,
}: {
  submitting: boolean;
  errors: CheckoutFormErrors;
  onSubmit: (payload: CheckoutPayload) => void;
}) {
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [line1, setLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [coupon, setCoupon] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (
      !receiverName.trim() ||
      !receiverPhone.trim() ||
      !province.trim() ||
      !city.trim() ||
      !line1.trim()
    ) {
      setLocalError("لطفاً همه‌ی فیلدهای الزامی را تکمیل کنید.");
      return;
    }

    onSubmit({
      receiver_name: receiverName.trim(),
      receiver_phone: receiverPhone.trim(),
      shipping_address: {
        province: province.trim(),
        city: city.trim(),
        line1: line1.trim(),
        postal_code: postalCode.trim() || undefined,
      },
      coupon_code: coupon.trim() || undefined,
    });
  }

  const couponError = errors.fieldErrors?.coupon_code?.[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate dir="rtl">
      {/* خطاهای کلی */}
      {(localError || errors.message) && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">{localError || errors.message}</p>
          {errors.stockErrors && errors.stockErrors.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1">
              {errors.stockErrors.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* اطلاعات گیرنده */}
      <section className="rounded-xl border border-silver bg-dust-grey p-6">
        <h2 className="mb-5 text-lg font-bold text-iron-grey">اطلاعات گیرنده</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="receiver_name" label="نام گیرنده" value={receiverName} onChange={setReceiverName} placeholder="نام و نام خانوادگی" />
          <Field id="receiver_phone" label="شماره تماس" value={receiverPhone} onChange={setReceiverPhone} placeholder="۰۹۱۲۳۴۵۶۷۸۹" inputMode="numeric" />
          <Field id="province" label="استان" value={province} onChange={setProvince} placeholder="مثلاً تهران" />
          <Field id="city" label="شهر" value={city} onChange={setCity} placeholder="مثلاً تهران" />
          <Field id="postal_code" label="کد پستی" value={postalCode} onChange={setPostalCode} placeholder="۱۰ رقمی" inputMode="numeric" />
        </div>
        <div className="mt-4">
          <label htmlFor="line1" className="form-label">آدرس کامل</label>
          <textarea
            id="line1"
            rows={3}
            className="input-field resize-none"
            placeholder="خیابان، کوچه، پلاک، واحد"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
          />
        </div>
      </section>

      {/* کد تخفیف */}
      <section className="rounded-xl border border-silver bg-dust-grey p-6">
        <label htmlFor="coupon" className="form-label">کد تخفیف (اختیاری)</label>
        <input
          id="coupon"
          type="text"
          className="input-field"
          placeholder="مثلاً WELCOME10"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
        />
        {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
        <p className="mt-1 text-xs text-silver">
          اعتبار کد تخفیف هنگام ثبت سفارش بررسی می‌شود.
        </p>
      </section>

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? "در حال ثبت سفارش…" : "ثبت و پرداخت سفارش"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel";
}) {
  return (
    <div>
      <label htmlFor={id} className="form-label">{label}</label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
