"use client";

/**
 * صفحه‌ی ثبت‌نام مشتری (RTL / فارسی) — Client Component.
 *
 * از endpoint واقعی /api/auth/register/ استفاده می‌کند (نقش در سرور CUSTOMER
 * تثبیت می‌شود). پس از ثبت‌نام موفق، ورود خودکار انجام و به صفحه‌ی اصلی هدایت
 * می‌شود. کاربر نقش انتخاب نمی‌کند.
 */

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import type { ApiError } from "@/types/auth";

function RegisterInner() {
  const { register } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password !== passwordConfirm) {
      setFieldErrors({ password_confirm: ["رمزهای عبور یکسان نیستند."] });
      return;
    }
    if (!phone.trim() || !password) {
      setError("شماره موبایل و رمز عبور الزامی است.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await register({
        phone_number: phone.trim(),
        password,
        password_confirm: passwordConfirm,
        email: email.trim() || undefined,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
      });
      const dest = next && next.startsWith("/") ? next : "/";
      router.replace(user.role === "ADMIN" || user.role === "OWNER" ? "/admin/dashboard" : dest);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr?.message ?? "ثبت‌نام ناموفق بود. لطفاً دوباره تلاش کنید.");
      setFieldErrors(apiErr?.fieldErrors ?? {});
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gradient-to-bl from-dust-grey via-white to-silver px-4 py-10"
    >
      <div className="animate-fade-in-up w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-sm font-bold uppercase tracking-[0.25em] text-bondi-blue">
            آکامارکت
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold text-iron-grey">ساخت حساب کاربری</h1>
          <p className="mt-1 text-sm text-blue-slate">برای خرید، یک حساب جدید بسازید.</p>
        </div>

        <div className="rounded-2xl border border-silver/70 bg-white p-6 shadow-card sm:p-8">
          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field id="phone" label="شماره موبایل" value={phone} onChange={setPhone} placeholder="۰۹۱۲۳۴۵۶۷۸۹" inputMode="numeric" required errors={fieldErrors.phone_number} autoComplete="tel" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="first_name" label="نام" value={firstName} onChange={setFirstName} placeholder="نام" autoComplete="given-name" />
              <Field id="last_name" label="نام خانوادگی" value={lastName} onChange={setLastName} placeholder="نام خانوادگی" autoComplete="family-name" />
            </div>

            <Field id="email" label="ایمیل (اختیاری)" value={email} onChange={setEmail} placeholder="you@example.com" type="email" errors={fieldErrors.email} autoComplete="email" />

            <Field id="password" label="رمز عبور" value={password} onChange={setPassword} type="password" placeholder="••••••••" required errors={fieldErrors.password} autoComplete="new-password" />
            <Field id="password_confirm" label="تکرار رمز عبور" value={passwordConfirm} onChange={setPasswordConfirm} type="password" placeholder="••••••••" required errors={fieldErrors.password_confirm} autoComplete="new-password" />

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "در حال ثبت‌نام…" : "ثبت‌نام"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-blue-slate">
          قبلاً حساب ساخته‌اید؟{" "}
          <Link href="/login" className="font-semibold text-bondi-blue hover:text-bondi-blue-dark">
            وارد شوید
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  required = false,
  errors,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel";
  required?: boolean;
  errors?: string[];
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="form-label">{label}</label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      {errors && errors.length > 0 && (
        <p className="mt-1 text-xs text-red-600">{errors.join(" ")}</p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterInner />
    </Suspense>
  );
}

function RegisterFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-dust-grey">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
    </main>
  );
}
