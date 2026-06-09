import Link from "next/link";

import { cn } from "@/lib/cn";

/** لوگوی فروشگاه آکامارکت (RTL). */
export function Logo({
  className,
  withText = true,
}: {
  className?: string;
  withText?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="آکامارکت — صفحه‌ی اصلی"
      className={cn("flex items-center gap-2", className)}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bondi-blue text-sm font-black text-white shadow-sm">
        آکا
      </span>
      {withText && (
        <span className="text-xl font-extrabold text-iron-grey">
          آکامارکت
        </span>
      )}
    </Link>
  );
}
