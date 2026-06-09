import { cn } from "@/lib/cn";
import { formatToman, toPersianDigits } from "@/lib/persian";

/**
 * نمایش قیمت به تومان با ارقام فارسی.
 * در صورت وجود قیمت اصلی (`original`)، آن را خط‌خورده و قیمت نهایی را برجسته
 * نشان می‌دهد — مناسب کارت‌های دارای تخفیف.
 */
export function Price({
  amount,
  original,
  size = "md",
  className,
}: {
  amount: string | number;
  original?: string | number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const hasDiscount =
    original !== undefined &&
    original !== null &&
    Number(original) > Number(amount);

  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
  } as const;

  return (
    <div className={cn("flex flex-col items-start gap-0.5", className)}>
      {hasDiscount && (
        <span className="text-xs text-silver line-through">
          {toPersianDigits(Number(original).toLocaleString("en-US"))}
        </span>
      )}
      <span
        className={cn(
          "font-extrabold text-iron-grey",
          sizes[size],
        )}
      >
        {formatToman(amount)}
      </span>
    </div>
  );
}
