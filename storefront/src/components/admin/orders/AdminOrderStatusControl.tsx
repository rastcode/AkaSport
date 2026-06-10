"use client";

/**
 * کنترل تغییر وضعیت سفارش (فقط ADMIN/OWNER) — RTL / فارسی.
 *
 * یک انتخاب‌گر ساده با وضعیت‌های مجاز + دکمه‌ی ذخیره. پس از موفقیت، سفارش کامل
 * بازگشتی از بک‌اند را از طریق `onUpdated` به والد می‌دهد تا state تازه شود.
 */

import { useState } from "react";

import { updateOrderStatus } from "@/services/adminOrderService";
import type { ApiError } from "@/types/auth";
import type { Order, OrderStatus } from "@/types/order";

/** برچسب‌های فارسی وضعیت‌ها (مطابق این فاز). */
const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PENDING", label: "در انتظار بررسی" },
  { value: "PAID", label: "پرداخت‌شده" },
  { value: "PROCESSING", label: "در حال پردازش" },
  { value: "SHIPPED", label: "ارسال‌شده" },
  { value: "DELIVERED", label: "تحویل‌شده" },
  { value: "CANCELED", label: "لغوشده" },
];

export function AdminOrderStatusControl({
  order,
  onUpdated,
}: {
  order: Order;
  onUpdated: (updated: Order) => void;
}) {
  const [selected, setSelected] = useState<OrderStatus>(order.status);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = selected !== order.status;

  async function handleSave() {
    setSaving(true);
    setSuccess(null);
    setError(null);
    try {
      const updated = await updateOrderStatus(order.id, selected);
      onUpdated(updated);
      setSelected(updated.status);
      setSuccess("وضعیت سفارش با موفقیت به‌روزرسانی شد.");
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 403) {
        setError("شما اجازه‌ی تغییر وضعیت این سفارش را ندارید.");
      } else if (apiErr?.status === 404) {
        setError("سفارش یافت نشد.");
      } else {
        setError(apiErr?.message ?? "به‌روزرسانی وضعیت ناموفق بود. دوباره تلاش کنید.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      dir="rtl"
      className="rounded-xl border border-silver bg-white p-5"
      aria-label="تغییر وضعیت سفارش"
    >
      <h2 className="mb-3 text-lg font-bold text-iron-grey">تغییر وضعیت سفارش</h2>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="order-status" className="form-label">
            وضعیت جدید
          </label>
          <select
            id="order-status"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value as OrderStatus);
              setSuccess(null);
              setError(null);
            }}
            disabled={saving}
            className="input-field"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "در حال ذخیره…" : "ذخیره تغییر وضعیت"}
        </button>
      </div>

      {!dirty && !success && !error && (
        <p className="mt-3 text-xs text-silver">
          برای ذخیره، ابتدا وضعیت متفاوتی انتخاب کنید.
        </p>
      )}
      {success && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700"
        >
          {success}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </section>
  );
}
