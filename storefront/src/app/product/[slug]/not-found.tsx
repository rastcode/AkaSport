import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "محصول یافت نشد",
  robots: { index: false, follow: false },
};

export default function ProductNotFound() {
  return (
    <main dir="rtl" className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-iron-grey">محصول یافت نشد</h1>
      <p className="mt-3 text-blue-slate">
        محصول موردنظر وجود ندارد یا دیگر در دسترس نیست.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-block font-semibold text-bondi-blue hover:underline"
      >
        مشاهده محصولات
      </Link>
    </main>
  );
}
