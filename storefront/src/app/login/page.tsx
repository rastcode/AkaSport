"use client";

/**
 * صفحه‌ی ورود — چندروشه، با تب‌ها (RTL / فارسی).
 *
 * تب ۱: شماره/ایمیل + رمز عبور  → AuthContext.login()
 * تب ۲: شماره + کد یک‌بارمصرف     → requestOtp() سپس loginWithOtp()
 *
 * رنگ‌بندی برند: لایه‌های روشن dust-grey/silver، تایپوگرافی iron-grey/blue-slate،
 * و bondi-blue برای دکمه‌های اصلی.
 */

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import type { ApiError, UserRole } from "@/types/auth";

type TabKey = "password" | "otp";

function destinationForRole(role: UserRole | null, next: string | null): string {
  if (next && next.startsWith("/")) return next;
  return role === "ADMIN" || role === "OWNER" ? "/admin/dashboard" : "/";
}

function LoginInner() {
  const { login, requestOtp, loginWithOtp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [tab, setTab] = useState<TabKey>("password");

  // وضعیت مشترک رابط کاربری
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // تب رمز عبور
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // تب کد یک‌بارمصرف
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);

  function resetMessages() {
    setError(null);
    setFieldErrors({});
    setNotice(null);
  }

  function handleApiError(err: unknown) {
    const apiErr = err as ApiError;
    setError(apiErr?.message ?? "ورود ناموفق بود. لطفاً دوباره تلاش کنید.");
    setFieldErrors(apiErr?.fieldErrors ?? {});
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);
    try {
      const user = await login({ method: "password", identifier, password });
      router.replace(destinationForRole(user.role, next));
    } catch (err) {
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestOtp(event: FormEvent) {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);
    try {
      const res = await requestOtp(phone);
      setOtpRequested(true);
      setNotice(
        res.debug_code
          ? `کد تأیید ارسال شد. کد توسعه: ${res.debug_code}`
          : "یک کد ۶ رقمی به شماره‌ی شما ارسال شد.",
      );
    } catch (err) {
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);
    try {
      const user = await loginWithOtp(phone, code);
      router.replace(destinationForRole(user.role, next));
    } catch (err) {
      handleApiError(err);
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
        {/* سربرگ برند */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-sm font-bold uppercase tracking-[0.25em] text-bondi-blue"
          >
            آکاسپورت
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold text-iron-grey">
            خوش آمدید
          </h1>
          <p className="mt-1 text-sm text-blue-slate">
            برای ادامه وارد حساب کاربری خود شوید.
          </p>
        </div>

        <div className="rounded-2xl border border-silver/70 bg-white p-6 shadow-card sm:p-8">
          {/* تب‌ها */}
          <div
            role="tablist"
            aria-label="روش ورود"
            className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-dust-grey p-1"
          >
            <TabButton
              active={tab === "password"}
              onClick={() => {
                setTab("password");
                resetMessages();
              }}
            >
              شماره / رمز عبور
            </TabButton>
            <TabButton
              active={tab === "otp"}
              onClick={() => {
                setTab("otp");
                resetMessages();
              }}
            >
              کد یک‌بارمصرف
            </TabButton>
          </div>

          {/* هشدارها */}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="mb-4 rounded-lg border border-bondi-blue/30 bg-bondi-blue/10 px-4 py-3 text-sm text-bondi-blue-dark"
            >
              {notice}
            </div>
          )}

          {/* فرم رمز عبور */}
          {tab === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="identifier" className="form-label">
                  شماره تماس یا ایمیل
                </label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  className="input-field"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
                <FieldError errors={fieldErrors.identifier} />
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  رمز عبور
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <FieldError errors={fieldErrors.password} />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? "در حال ورود…" : "ورود"}
              </button>
            </form>
          )}

          {/* فرم کد یک‌بارمصرف */}
          {tab === "otp" && (
            <div className="space-y-4">
              <form
                onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp}
                className="space-y-4"
                noValidate
              >
                <div>
                  <label htmlFor="phone" className="form-label">
                    شماره تماس
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="numeric"
                    className="input-field"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={otpRequested}
                    required
                  />
                  <FieldError errors={fieldErrors.phone_number} />
                </div>

                {otpRequested && (
                  <div className="animate-fade-in-up">
                    <label htmlFor="code" className="form-label">
                      کد تأیید
                    </label>
                    <input
                      id="code"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      className="input-field tracking-[0.5em]"
                      placeholder="------"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      required
                    />
                    <FieldError errors={fieldErrors.code} />
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={submitting}
                >
                  {submitting
                    ? otpRequested
                      ? "در حال بررسی…"
                      : "در حال ارسال کد…"
                    : otpRequested
                      ? "تأیید و ورود"
                      : "ارسال کد"}
                </button>
              </form>

              {otpRequested && (
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="font-medium text-blue-slate hover:text-bondi-blue"
                    onClick={() => {
                      setOtpRequested(false);
                      setCode("");
                      resetMessages();
                    }}
                  >
                    → تغییر شماره
                  </button>
                  <button
                    type="button"
                    className="font-medium text-bondi-blue hover:text-bondi-blue-dark"
                    onClick={handleRequestOtp}
                    disabled={submitting}
                  >
                    ارسال مجدد کد
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-blue-slate">
          حساب کاربری ندارید؟{" "}
          <Link
            href="/register"
            className="font-semibold text-bondi-blue hover:text-bondi-blue-dark"
          >
            ثبت‌نام کنید
          </Link>
        </p>
      </div>
    </main>
  );
}

/* ------------------------------ زیرکامپوننت‌ها ------------------------------ */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        "rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 " +
        (active
          ? "bg-white text-bondi-blue shadow-sm"
          : "text-blue-slate hover:text-iron-grey")
      }
    >
      {children}
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{errors.join(" ")}</p>;
}

/* ------------------------------- خروجی صفحه ------------------------------- */

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-dust-grey">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
    </main>
  );
}
