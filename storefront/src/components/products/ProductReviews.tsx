"use client";

/**
 * بخش «نظرات کاربران» صفحه‌ی محصول (RTL / فارسی) — Client Component.
 *
 * خلاصه‌ی امتیاز + فهرست نظرهای تأییدشده + فرم ثبت نظر برای کاربر لاگین‌شده.
 * نظر جدید با وضعیت «در انتظار تأیید» ثبت می‌شود و تا تأیید مدیر نمایش داده
 * نمی‌شود. از endpointهای واقعی استفاده می‌کند؛ هیچ داده‌ی ساختگی ندارد.
 */

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
import { createProductReview, getProductReviews } from "@/services/reviewService";
import { formatNumber, formatPersianDate, toPersianDigits } from "@/lib/persian";
import type { ApiError } from "@/types/auth";
import type { ProductReview } from "@/types/review";

export function ProductReviews({
  slug,
  averageRating,
  reviewsCount,
}: {
  slug: string;
  averageRating: number | null;
  reviewsCount: number;
}) {
  const { isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProductReviews(slug)
      .then((data) => {
        if (!cancelled) setReviews(data.results);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitMsg(null);
    setSubmitError(null);
    if (rating < 1 || rating > 5) {
      setSubmitError("لطفاً امتیاز خود را انتخاب کنید.");
      return;
    }
    if (comment.trim().length < 5) {
      setSubmitError("متن نظر باید حداقل ۵ کاراکتر باشد.");
      return;
    }
    setSubmitting(true);
    try {
      await createProductReview(slug, {
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });
      setSubmitMsg("نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود.");
      setRating(0);
      setTitle("");
      setComment("");
    } catch (err) {
      const apiErr = err as ApiError;
      setSubmitError(
        apiErr?.fieldErrors?.detail?.[0] ??
          apiErr?.fieldErrors?.comment?.[0] ??
          apiErr?.fieldErrors?.rating?.[0] ??
          apiErr?.message ??
          "ثبت نظر ناموفق بود. لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section dir="rtl" aria-labelledby="reviews-heading" className="mt-10">
      <h2 id="reviews-heading" className="mb-4 text-lg font-bold text-iron-grey">
        نظرات کاربران
      </h2>

      {/* خلاصه‌ی امتیاز */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-silver/60 bg-brand-light/50 p-5">
        <div className="text-center">
          <div className="text-3xl font-extrabold text-brand-dark">
            {averageRating != null ? toPersianDigits(averageRating.toFixed(1)) : "—"}
          </div>
          <StarRow value={Math.round(averageRating ?? 0)} />
        </div>
        <div className="text-sm text-blue-slate">
          {reviewsCount > 0
            ? `بر اساس ${formatNumber(reviewsCount)} نظر تأییدشده`
            : "هنوز نظری برای این محصول ثبت نشده است."}
        </div>
      </div>

      {/* فرم ثبت نظر */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-silver/60 bg-white p-5" noValidate>
          <h3 className="mb-3 text-base font-bold text-iron-grey">ثبت نظر شما</h3>

          {submitMsg && (
            <p role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{submitMsg}</p>
          )}
          {submitError && (
            <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
          )}

          <div className="mb-3">
            <span className="form-label">امتیاز شما</span>
            <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  aria-label={`${n} ستاره`}
                  className="p-0.5"
                >
                  <StarIcon filled={(hover || rating) >= n} className="h-7 w-7" />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="review-title" className="form-label">عنوان (اختیاری)</label>
            <input id="review-title" className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>

          <div className="mb-4">
            <label htmlFor="review-comment" className="form-label">متن نظر</label>
            <textarea id="review-comment" className="input-field min-h-[6rem]" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="تجربه‌ی خود از این محصول را بنویسید…" />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? "در حال ثبت…" : "ثبت نظر"}
          </button>
        </form>
      ) : (
        <div className="mb-6 rounded-xl border border-silver/60 bg-white p-5 text-center">
          <p className="text-sm text-blue-slate">برای ثبت نظر وارد حساب کاربری شوید.</p>
          <Link href={`/login?next=/product/${slug}`} className="btn-primary mt-3">
            ورود به حساب کاربری
          </Link>
        </div>
      )}

      {/* فهرست نظرها */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="rounded-xl border border-silver/60 bg-white p-6 text-center text-sm text-blue-slate">
          هنوز نظر تأییدشده‌ای ثبت نشده است. اولین نفری باشید که نظر می‌دهد.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-silver/60 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-iron-grey">{r.user_display}</span>
                  {r.is_verified_purchase && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">خریدار</span>
                  )}
                </div>
                <span className="text-xs text-silver">{formatPersianDate(r.created_at)}</span>
              </div>
              <div className="mt-1"><StarRow value={r.rating} /></div>
              {r.title && <p className="mt-2 font-bold text-iron-grey">{r.title}</p>}
              <p className="mt-1 leading-relaxed text-blue-slate">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} از ۵ ستاره`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= value} className="h-4 w-4" />
      ))}
    </div>
  );
}

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className + (filled ? " text-brand-accent" : " text-silver")}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.5a.56.56 0 0 1 1.04 0l2.05 4.96 5.36.43c.5.04.7.66.32.99l-4.08 3.5 1.25 5.23c.12.49-.42.88-.85.62L12 17.02l-4.6 2.74c-.42.26-.96-.13-.84-.62l1.25-5.23-4.09-3.5a.56.56 0 0 1 .32-.99l5.36-.43L11.48 3.5Z" />
    </svg>
  );
}
