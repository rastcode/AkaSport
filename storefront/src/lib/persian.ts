/**
 * Persian (Farsi) localisation helpers.
 *
 * The storefront is RTL and fully Persian, so numbers, prices and dates are
 * rendered with Persian digits and a Toman suffix.
 */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Convert ASCII digits in a string to Persian digits. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]!);
}

/** Convert Persian/Arabic-indic digits back to ASCII (for parsing input). */
export function toEnglishDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** Group a number with thousands separators (e.g. 1234567 -> "1,234,567"). */
function groupThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "،"); // Persian thousands separator
}

/**
 * Format a price (decimal string or number) as Toman with Persian digits.
 * Backend monetary values are treated as Toman amounts.
 */
export function formatToman(value: string | number): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return toPersianDigits(String(value));
  return `${toPersianDigits(groupThousands(amount))} تومان`;
}

/** Format a plain integer (e.g. a quantity) in Persian digits. */
export function formatNumber(value: string | number): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return toPersianDigits(String(value));
  return toPersianDigits(groupThousands(amount));
}

/** Format an ISO datetime string as a Persian (Jalali) date. */
export function formatPersianDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return toPersianDigits(iso);
  }
}

/** Persian labels for order statuses. */
export const ORDER_STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال‌شده",
  CANCELED: "لغو‌شده",
};
