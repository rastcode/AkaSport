"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  // CTA اصلی فروشگاه — Strawberry Red با hover به Flag Red.
  primary:
    "bg-brand-accent text-white hover:bg-brand-danger focus:ring-brand-accent/40",
  // outline تمیز و premium با Space Indigo (نه قرمز).
  outline:
    "border border-brand-dark text-brand-dark bg-white hover:bg-brand-dark hover:text-white focus:ring-brand-dark/30",
  ghost:
    "border border-brand-muted/40 bg-white text-brand-dark hover:bg-brand-light focus:ring-brand-dark/20",
  danger:
    "bg-brand-danger text-white hover:bg-brand-danger/90 focus:ring-brand-danger/40",
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
