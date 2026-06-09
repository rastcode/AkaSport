"use client";

/**
 * Global cart store.
 *
 * Dual-mode persistence:
 *   - GUEST  : lines live in localStorage (with a display snapshot per line).
 *   - AUTHED : lines are the source-of-truth Django cart (`/api/orders/cart/`).
 *
 * On login, any guest cart is merged into the server cart (additive), then the
 * local copy is cleared and the server cart becomes authoritative. All mutators
 * are optimistic where safe and fall back to a server refresh on error.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/context/AuthContext";
import {
  clearServerCart,
  deleteCartItem,
  fetchServerCart,
  postCartItem,
} from "@/services/orderService";
import type {
  CartContextValue,
  CartLine,
  CartLineMeta,
  ServerCart,
} from "@/types/cart";

const STORAGE_KEY = "akasport_guest_cart";

const CartContext = createContext<CartContextValue | undefined>(undefined);

/* ------------------------------ local storage ------------------------------ */

function readLocalCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* storage may be unavailable (private mode) — fail silently */
  }
}

/** Map a server cart payload into the unified `CartLine[]` shape. */
function mapServerCart(cart: ServerCart): CartLine[] {
  return cart.items.map((item) => ({
    variantId: item.product_variant,
    quantity: item.quantity,
    lineId: item.id,
    sku: item.sku,
    title: item.product_title,
    unitPrice: item.unit_price,
    image: null,
    availableStock: item.available_stock,
  }));
}

/* -------------------------------- provider --------------------------------- */

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [lines, setLines] = useState<CartLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const mergedForSession = useRef(false);

  /* ----------------------------- server refresh ------------------------- */
  const refresh = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;
    try {
      const cart = await fetchServerCart();
      setLines(mapServerCart(cart));
    } catch {
      /* keep current state on transient failure */
    }
  }, [isAuthenticated]);

  /* ------------------- bootstrap + login/logout transitions ------------- */
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    const bootstrap = async (): Promise<void> => {
      setIsLoading(true);

      if (!isAuthenticated) {
        // Guest: hydrate from localStorage.
        mergedForSession.current = false;
        setLines(readLocalCart());
        setIsLoading(false);
        return;
      }

      // Authenticated: merge any guest cart, then load the server cart.
      setIsSyncing(true);
      try {
        const guestLines = readLocalCart();
        if (guestLines.length > 0 && !mergedForSession.current) {
          // Additive merge: push each guest line to the server cart.
          for (const line of guestLines) {
            try {
              await postCartItem(line.variantId, line.quantity, "add");
            } catch {
              /* skip individual failures (e.g. stock) — best effort */
            }
          }
          writeLocalCart([]);
        }
        mergedForSession.current = true;
        const cart = await fetchServerCart();
        if (!cancelled) setLines(mapServerCart(cart));
      } catch {
        if (!cancelled) setLines([]);
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
          setIsLoading(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  /* ------------------------------- mutators ----------------------------- */

  const addToCart = useCallback(
    async (variantId: number, quantity: number, meta: CartLineMeta) => {
      if (quantity < 1) return;

      if (isAuthenticated) {
        setIsSyncing(true);
        try {
          const cart = await postCartItem(variantId, quantity, "add");
          setLines(mapServerCart(cart));
        } finally {
          setIsSyncing(false);
        }
        return;
      }

      // Guest: merge into local state.
      setLines((prev) => {
        const existing = prev.find((l) => l.variantId === variantId);
        const next = existing
          ? prev.map((l) =>
              l.variantId === variantId
                ? { ...l, quantity: l.quantity + quantity }
                : l,
            )
          : [...prev, { variantId, quantity, ...meta }];
        writeLocalCart(next);
        return next;
      });
    },
    [isAuthenticated],
  );

  const updateQuantity = useCallback(
    async (variantId: number, quantity: number) => {
      const safeQty = Math.max(1, Math.floor(quantity));

      if (isAuthenticated) {
        setIsSyncing(true);
        try {
          // Backend "set" mode replaces the quantity to the exact value.
          const cart = await postCartItem(variantId, safeQty, "set");
          setLines(mapServerCart(cart));
        } finally {
          setIsSyncing(false);
        }
        return;
      }

      setLines((prev) => {
        const next = prev.map((l) =>
          l.variantId === variantId ? { ...l, quantity: safeQty } : l,
        );
        writeLocalCart(next);
        return next;
      });
    },
    [isAuthenticated],
  );

  const removeFromCart = useCallback(
    async (variantId: number) => {
      if (isAuthenticated) {
        const target = lines.find((l) => l.variantId === variantId);
        if (!target?.lineId) {
          await refresh();
          return;
        }
        setIsSyncing(true);
        try {
          const cart = await deleteCartItem(target.lineId);
          setLines(mapServerCart(cart));
        } finally {
          setIsSyncing(false);
        }
        return;
      }

      setLines((prev) => {
        const next = prev.filter((l) => l.variantId !== variantId);
        writeLocalCart(next);
        return next;
      });
    },
    [isAuthenticated, lines, refresh],
  );

  const clearCart = useCallback(async () => {
    if (isAuthenticated) {
      setIsSyncing(true);
      try {
        await clearServerCart();
        setLines([]);
      } finally {
        setIsSyncing(false);
      }
      return;
    }
    writeLocalCart([]);
    setLines([]);
  }, [isAuthenticated]);

  /* ------------------------------- derived ------------------------------ */

  const totalQuantity = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, l) => sum + Number(l.unitPrice || 0) * l.quantity,
        0,
      ),
    [lines],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      isAuthenticatedCart: isAuthenticated,
      isLoading,
      isSyncing,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalQuantity,
      subtotal,
      refresh,
    }),
    [
      lines,
      isAuthenticated,
      isLoading,
      isSyncing,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalQuantity,
      subtotal,
      refresh,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Strongly-typed cart hook. */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (ctx === undefined) {
    throw new Error("useCart must be used within a <CartProvider>.");
  }
  return ctx;
}
