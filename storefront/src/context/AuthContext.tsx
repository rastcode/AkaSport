"use client";

/**
 * Authentication context.
 *
 * Responsibilities:
 *   - login (unified endpoint), OTP request/verify, logout.
 *   - persist tokens in cookies and restore session across reloads.
 *   - expose reactive { user, role, isAuthenticated, isLoading }.
 *   - register a failure handler so the api refresh-interceptor can force
 *     logout when refresh ultimately fails.
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

import api, {
  normalizeError,
  revokeRefreshToken,
  setAuthFailureHandler,
} from "@/lib/api";
import {
  clearTokens,
  decodeToken,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  persistAccessToken,
  persistTokens,
} from "@/lib/tokens";
import type {
  AuthContextValue,
  LoginPayload,
  LoginResponse,
  OtpRequestResponse,
  RegisterPayload,
  User,
} from "@/types/auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const bootstrapped = useRef(false);

  /* ----------------------------- core actions ---------------------------- */

  const fetchProfile = useCallback(async (): Promise<User> => {
    const { data } = await api.get<User>("/auth/me/");
    setUser(data);
    return data;
  }, []);

  const logout = useCallback((): void => {
    const access = getAccessToken();
    const refresh = getRefreshToken();

    clearTokens();
    setUser(null);

    if (access && refresh) {
      void revokeRefreshToken(access, refresh).catch(() => {
        // Local logout is intentionally final even if server revocation fails.
      });
    }
  }, []);

  const login = useCallback(
    async (payload: LoginPayload): Promise<User> => {
      try {
        const { data } = await api.post<LoginResponse>("/auth/login/", payload);
        persistTokens(data.access, data.refresh);
        // Prefer the user object in the response; fall back to /me/.
        if (data.user) {
          setUser(data.user);
          return data.user;
        }
        return await fetchProfile();
      } catch (error) {
        throw normalizeError(error);
      }
    },
    [fetchProfile],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<User> => {
      try {
        // ثبت‌نام نقش را در سمت سرور به CUSTOMER تثبیت می‌کند.
        await api.post("/auth/register/", payload);
      } catch (error) {
        throw normalizeError(error);
      }
      // ورود خودکار با شماره و رمز عبور (سرور در پاسخ ثبت‌نام توکن نمی‌دهد).
      return login({
        method: "password",
        identifier: payload.phone_number,
        password: payload.password,
      });
    },
    [login],
  );

  const requestOtp = useCallback(
    async (phone_number: string): Promise<OtpRequestResponse> => {
      try {
        const { data } = await api.post<OtpRequestResponse>(
          "/auth/otp/request/",
          { phone_number },
        );
        return data;
      } catch (error) {
        throw normalizeError(error);
      }
    },
    [],
  );

  const loginWithOtp = useCallback(
    async (phone_number: string, code: string): Promise<User> => {
      try {
        const { data } = await api.post<LoginResponse>("/auth/otp/verify/", {
          phone_number,
          code,
        });
        persistTokens(data.access, data.refresh);
        if (data.user) {
          setUser(data.user);
          return data.user;
        }
        return await fetchProfile();
      } catch (error) {
        throw normalizeError(error);
      }
    },
    [fetchProfile],
  );

  /* ----------------------- session bootstrap on mount -------------------- */

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    // Let the api layer force a logout if a refresh ultimately fails.
    setAuthFailureHandler(() => logout());

    const restore = async (): Promise<void> => {
      const access = getAccessToken();
      if (!access) {
        setIsLoading(false);
        return;
      }

      // Seed user from the token claims for an instant, optimistic render.
      const decoded = decodeToken(access);
      if (decoded) {
        setUser({
          id: decoded.user_id,
          email: decoded.email,
          phone_number: decoded.phone_number,
          role: decoded.role,
        });
      }

      try {
        // If the access token is stale, the interceptor refreshes transparently.
        await fetchProfile();
      } catch {
        // Refresh/verify failed -> ensure a clean signed-out state.
        if (isTokenExpired(getAccessToken())) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    void restore();
  }, [fetchProfile, logout]);

  /* ------------------------------ context value -------------------------- */

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      loginWithOtp,
      requestOtp,
      logout,
      refreshProfile: async () => {
        await fetchProfile();
      },
    }),
    [user, isLoading, login, register, loginWithOtp, requestOtp, logout, fetchProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Strongly-typed hook for consuming the auth context. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return ctx;
}
