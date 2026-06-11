"use client";

/**
 * زمینه‌ی علاقه‌مندی‌ها (client) — RTL / فارسی.
 *
 * مجموعه‌ی اسلاگ محصولاتِ علاقه‌مندیِ کاربر را یک‌بار پس از ورود می‌خواند و در کل
 * برنامه به اشتراک می‌گذارد، تا دکمه‌های قلب در کارت‌ها بدون درخواست‌های متعدد،
 * وضعیت درست را نشان دهند. چون فهرست محصولات سمت‌سرور و بدون توکن گرفته می‌شود،
 * وضعیت دقیق علاقه‌مندی در کلاینت از همین زمینه می‌آید.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { getWishlist, toggleWishlist } from "@/services/wishlistService";

interface WishlistContextValue {
  /** اسلاگ‌های علاقه‌مندی. */
  slugs: Set<string>;
  count: number;
  isLoading: boolean;
  isWishlisted: (slug: string) => boolean;
  /** toggle؛ وضعیت جدید را برمی‌گرداند. */
  toggle: (slug: string) => Promise<boolean>;
  /** حذف از حالت محلی (پس از حذف در صفحه‌ی علاقه‌مندی‌ها). */
  markRemoved: (slug: string) => void;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [slugs, setSlugs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setSlugs(new Set());
      return;
    }
    setIsLoading(true);
    try {
      const items = await getWishlist();
      setSlugs(new Set(items.map((p) => p.slug)));
    } catch {
      /* بی‌صدا؛ در صورت خطا فهرست خالی می‌ماند */
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isWishlisted = useCallback((slug: string) => slugs.has(slug), [slugs]);

  const toggle = useCallback(async (slug: string) => {
    const next = await toggleWishlist(slug);
    setSlugs((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(slug);
      else copy.delete(slug);
      return copy;
    });
    return next;
  }, []);

  const markRemoved = useCallback((slug: string) => {
    setSlugs((prev) => {
      const copy = new Set(prev);
      copy.delete(slug);
      return copy;
    });
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      slugs,
      count: slugs.size,
      isLoading,
      isWishlisted,
      toggle,
      markRemoved,
      refresh,
    }),
    [slugs, isLoading, isWishlisted, toggle, markRemoved, refresh],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist باید درون WishlistProvider استفاده شود.");
  }
  return ctx;
}
