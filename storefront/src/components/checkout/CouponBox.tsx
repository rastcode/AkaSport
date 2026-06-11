"use client";

/**
 * بخش «کد تخفیف» در تسویه‌حساب (RTL / فارسی).
 * کد را با subtotalِ سبد اعتبارسنجی می‌کند و مبلغ تخفیف را به والد می‌دهد.
 * اعتبارسنجی نهایی هنگام ثبت سفارش دوباره سمت‌سرور انجام می‌شود.
 */

import { useState } from "react";

import { validateCoupon } from "@/services/couponService";
import { formatToman } from "@/lib/persian";
import type { ApiError } from "@/types/auth";

interface Props {
  subtotal: number;
  appliedCode: string | null;
  appliedDiscount: number;
  onApply: (code: string, discount: number) => void;
  onClear: () => void;
}

export function CouponBox({
  subtotal,
  appliedCode,
  appliedDiscount,
  onApply,
  onClear,
}: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("کد تخفیف را وارد کنید.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await validateCoupon(trimmed, subtotal);
      onApply(res.code, Number(res.discount_amount));
      setCode("");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(
        apiErr?.fieldErrors?.detail?.[0] ??
          apiErr?.message ??
          "کد تخفیف معتبر نیست.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir="rtl" className="rounded-2xl border border-silver/60 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-iron-grey">کد تخفیف</h3>

      {appliedCode ? (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="text-sm">
            <span className="font-bold text-emerald-700">{appliedCode}</span>{" "}
            <span className="text-emerald-700">
              ({formatToman(appliedDiscount)} تخفیف)
            </span>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            حذف کد
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  apply();
                }
              }}
              placeholder="مثلاً AKASPORT10"
              className="input-field flex-1"
              aria-label="کد تخفیف"
            />
            <button
              type="button"
              onClick={apply}
              disabled={busy}
              className="btn-primary shrink-0 disabled:opacity-50"
            >
              {busy ? "…" : "اعمال"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}
