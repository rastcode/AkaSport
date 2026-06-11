/**
 * تایپ‌های نظر و امتیاز محصول — متناظر با ProductReviewSerializer و
 * AdminProductReviewSerializer بک‌اند.
 */

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

/** نظر عمومی (خروجی ProductReviewSerializer). */
export interface ProductReview {
  id: number;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  status: ReviewStatus;
  user_display: string;
  created_at: string;
}

/** نمای مدیریتی نظر (خروجی AdminProductReviewSerializer). */
export interface AdminProductReview extends ProductReview {
  product: number;
  product_title: string;
  product_slug: string;
  user: number;
}

/** بدنه‌ی ثبت نظر. */
export interface ReviewCreatePayload {
  rating: number;
  title?: string;
  comment: string;
}
