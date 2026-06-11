"use client";

/**
 * صفحه‌ی «علاقه‌مندی‌های من» (RTL / فارسی) — Client Component.
 * فقط برای کاربر لاگین‌شده؛ فهرست محصولات علاقه‌مندی با امکان حذف.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { CatalogProductCard } from "@/components/products/CatalogProductCard";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { getWishlist, removeFromWishlist } from "@/services/wishlistService";
import { formatNumber } from "@/lib/persian";
import type { ProductListItem } from "@/types/catalog";

export default function WishlistPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { markRemoved } = useWishlist();

  const [items, setItems] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getWishlist());
    } catch {
      setError("خطا در دریافت علاقه‌مندی‌ها.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, load]);

  async function remove(slug: string) {
    setBusySlug(slug);
    try {
      await removeFromWishlist(slug);
      markRemoved(slug);
      setItems((prev) => prev.filter((p) => p.slug !== slug));
    } catch {
      setError("حذف ناموفق بود. دوباره تلاش کنید.");
    } finally {
      setBusySlug(null);
    }
  }

  if (authLoading) return <CenterSpinner />;

  if (!isAuthenticated) {
    return (
      <Centered>
        <h1 className="text-2xl font-extrabold text-iron-grey">علاقه‌مندی‌های من</h1>
        <p className="mt-3 text-blue-slate">برای مشاهده‌ی علاقه‌مندی‌ها ابتدا وارد حساب کاربری شوید.</p>
        <Link href="/login?next=/profile/wishlist" className="btn-primary mt-6">ورود به حساب کاربری</Link>
      </Centered>
    );
  }

  return (
    <main dir="rtl" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-silver pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-iron-grey">علاقه‌مندی‌های من</h1>
          <p className="mt-1 text-sm text-blue-slate">
            {loading ? "در حال بارگذاری…" : `${formatNumber(items.length)} محصول`}
          </p>
        </div>
        <Link href="/profile" className="rounded-lg border border-silver bg-white px-4 py-2 text-sm font-semibold text-blue-slate hover:border-bondi-blue hover:text-bondi-blue">← حساب کاربری</Link>
      </header>

      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <CenterSpinner inline />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-silver bg-white p-12 text-center">
          <p className="font-semibold text-iron-grey">هنوز محصولی به علاقه‌مندی‌ها اضافه نکرده‌اید.</p>
          <Link href="/products" className="btn-primary mt-5">مشاهده محصولات</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <div key={p.id} className="flex flex-col gap-2">
              <CatalogProductCard product={p} />
              <button
                type="button"
                onClick={() => remove(p.slug)}
                disabled={busySlug === p.slug}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {busySlug === p.slug ? "در حال حذف…" : "حذف از علاقه‌مندی‌ها"}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main dir="rtl" className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      {children}
    </main>
  );
}

function CenterSpinner({ inline = false }: { inline?: boolean }) {
  const spinner = <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />;
  if (inline) return <div className="flex justify-center py-16">{spinner}</div>;
  return <main className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center px-4">{spinner}</main>;
}
