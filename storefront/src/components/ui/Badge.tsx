import { cn } from "@/lib/cn";
import { toPersianDigits } from "@/lib/persian";

/** نشان تخفیف قرمز (درصد) — به سبک بازارگاه‌های ایرانی. */
export function DiscountBadge({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  if (!percent || percent <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-discount px-2 py-0.5 text-xs font-bold text-white",
        className,
      )}
    >
      ٪{toPersianDigits(percent)}
    </span>
  );
}

/** نشان عمومی (مثل «جدید»، «منتخب»). */
export function Badge({
  children,
  tone = "accent",
  className,
}: {
  children: React.ReactNode;
  tone?: "accent" | "neutral" | "success";
  className?: string;
}) {
  const tones = {
    accent: "bg-bondi-blue text-white",
    neutral: "bg-iron-grey text-white",
    success: "bg-emerald-600 text-white",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
