"use client";

import { formatNumber } from "@/lib/persian";

/** RTL-aware quantity stepper (− / value / +) with Persian digits. */
export function QuantityStepper({
  quantity,
  min = 1,
  max,
  onChange,
  disabled = false,
}: {
  quantity: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const canDecrease = !disabled && quantity > min;
  const canIncrease = !disabled && (max === undefined || quantity < max);

  return (
    <div className="inline-flex items-center rounded-lg border border-silver bg-white">
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={!canDecrease}
        aria-label="کاهش تعداد"
        className="px-3 py-1.5 text-lg text-blue-slate transition-colors hover:text-bondi-blue disabled:opacity-40"
      >
        −
      </button>
      <span
        className="w-10 select-none text-center font-semibold text-iron-grey"
        aria-live="polite"
      >
        {formatNumber(quantity)}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={!canIncrease}
        aria-label="افزایش تعداد"
        className="px-3 py-1.5 text-lg text-blue-slate transition-colors hover:text-bondi-blue disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
