"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-bondi-blue text-white hover:bg-bondi-blue-dark focus:ring-bondi-blue/40",
  outline:
    "border border-bondi-blue text-bondi-blue bg-white hover:bg-bondi-blue hover:text-white focus:ring-bondi-blue/30",
  ghost:
    "border border-silver bg-white text-blue-slate hover:bg-dust-grey focus:ring-bondi-blue/30",
  danger:
    "bg-discount text-white hover:opacity-90 focus:ring-discount/40",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3 text-base",
};

/** دکمه‌ی پایه با واریانت‌های طراحی. برای پیوندها از `buttonClass` استفاده کنید. */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200",
        "focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** کلاس‌های دکمه برای استفاده روی `<Link>` (ناوبری). */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2",
    VARIANT[variant],
    SIZE[size],
    className,
  );
}
