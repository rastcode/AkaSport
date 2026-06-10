"use client";

/**
 * فروشگاه سراسری سبد خرید — فقط سمت سرور (backend-only).
 *
 * سبد تنها برای کاربر لاگین‌شده کار می‌کند و از `/api/orders/cart/` می‌آید
 * (بدون guest cart با localStorage). متدها بر اساس شناسه‌ی تنوع (variantId) کار
 * می‌کنند و به‌صورت داخلی به شناسه‌ی CartItem نگاشت می‌شوند تا با PATCH/DELETE
 * بک‌اند سازگار باشند.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/context/AuthContext";
import {
  addCartItem,
  clearCart as clearCartApi,
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/services/cartService";
import type {
  CartContextValue,
  ServerCart,
  ServerCartItem,
} from "@/types/cart";

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [items, setItems] = useState<ServerCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const applyCart = useCallback((cart: ServerCart) => {
    setItems(cart.items ?? []);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    try {
      const cart = await getCart();
      applyCart(cart);
    } catch {
      /* در صورت خطای گذرا، وضعیت فعلی حفظ می‌شود */
    }
  }, [isAuthenticated, applyCart]);

  // بارگذاری اولیه و واکنش به ورود/خروج کاربر.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      if (!isAuthenticated) {
        if (!cancelled) {
          setItems([]);
          setIsLoading(false);
        }
        return;
      }
      try {
        const cart = await getCart();
        if (!cancelled) applyCart(cart);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading, applyCart]);

  /* ------------------------------ نگاشت‌ها ------------------------------ */
  const itemIdByVariant = useCallback(
    (variantId: number): number | null => {
      const line = items.find((it) => it.product_variant === variantId);
      return line ? line.id : null;
    },
    [items],
  );

  /* ------------------------------- متدها ------------------------------- */
  const addToCart = useCallback(
    async (variantId: number, quantity: number, _meta?: unknown) => {
      if (!isAuthenticated || quantity < 1) return;
      setIsSyncing(true);
      try {
        const cart = await addCartItem(variantId, quantity, "add");
        applyCart(cart);
      } finally {
        setIsSyncing(false);
      }
    },
    [isAuthenticated, applyCart],
  );

  const updateQuantity = useCallback(
    async (variantId: number, quantity: number) => {
      const id = itemIdByVariant(variantId);
      if (id === null || quantity < 1) return;
      setIsSyncing(true);
      try {
        const cart = await updateCartItem(id, quantity);
        applyCart(cart);
      } finally {
        setIsSyncing(false);
      }
    },
    [itemIdByVariant, applyCart],
  );

  const removeFromCart = useCallback(
    async (variantId: number) => {
      const id = itemIdByVariant(variantId);
      if (id === null) return;
      setIsSyncing(true);
      try {
        const cart = await removeCartItem(id);
        applyCart(cart);
      } finally {
        setIsSyncing(false);
      }
    },
    [itemIdByVariant, applyCart],
  );

  const clearCart = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    setIsSyncing(true);
    try {
      await clearCartApi();
      setItems([]);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated]);

  /* ------------------------------- مشتقات ------------------------------ */
  const totalQuantity = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.line_total || 0), 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalQuantity,
      subtotal,
      isLoading,
      isSyncing,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refresh,
    }),
    [
      items,
      totalQuantity,
      subtotal,
      isLoading,
      isSyncing,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refresh,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (ctx === undefined) {
    throw new Error("useCart must be used within a <CartProvider>.");
  }
  return ctx;
}
