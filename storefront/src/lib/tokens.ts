/**
 * Token + cookie utilities.
 *
 * Tokens are persisted in cookies (not localStorage) so that the Next.js
 * middleware — which runs on the Edge and cannot read localStorage — can read
 * the role for route guarding. Cookies are scoped, `SameSite=Lax`, and (in
 * production over HTTPS) `Secure`.
 *
 * SECURITY NOTE: These cookies are NOT httpOnly because the SPA itself must
 * attach the access token to API requests. The middleware guard is a UX
 * convenience; the Django backend remains the authoritative enforcement point
 * (it validates the JWT signature on every request). For maximum hardening,
 * move to a BFF pattern with httpOnly cookies set by a Next.js route handler.
 */

import { jwtDecode } from "jwt-decode";

import type { DecodedToken, UserRole } from "@/types/auth";

const PREFIX = process.env.NEXT_PUBLIC_COOKIE_PREFIX || "akasport";

export const ACCESS_COOKIE = `${PREFIX}_access`;
export const REFRESH_COOKIE = `${PREFIX}_refresh`;
export const ROLE_COOKIE = `${PREFIX}_role`;

const isBrowser = (): boolean => typeof document !== "undefined";

/* ------------------------------- cookie I/O -------------------------------- */

interface CookieOptions {
  maxAgeSeconds?: number;
  path?: string;
}

export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): void {
  if (!isBrowser()) return;
  const { maxAgeSeconds = 60 * 60 * 24 * 7, path = "/" } = options;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${name}=${encodeURIComponent(value)}` +
    `; Max-Age=${maxAgeSeconds}; Path=${path}; SameSite=Lax${secure}`;
}

export function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

export function deleteCookie(name: string, path = "/"): void {
  if (!isBrowser()) return;
  document.cookie = `${name}=; Max-Age=0; Path=${path}; SameSite=Lax`;
}

/* ------------------------------ token helpers ------------------------------ */

export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
}

/** True if the token is missing/undecodable/expired (with a small skew). */
export function isTokenExpired(token: string | null, skewSeconds = 15): boolean {
  if (!token) return true;
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return decoded.exp <= nowSeconds + skewSeconds;
}

export function getAccessToken(): string | null {
  return getCookie(ACCESS_COOKIE);
}

export function getRefreshToken(): string | null {
  return getCookie(REFRESH_COOKIE);
}

export function getRoleFromCookie(): UserRole | null {
  const role = getCookie(ROLE_COOKIE);
  return role === "OWNER" || role === "ADMIN" || role === "CUSTOMER"
    ? role
    : null;
}

/** Persist a freshly-issued token pair and the derived role cookie. */
export function persistTokens(access: string, refresh: string): void {
  const decoded = decodeToken(access);
  setCookie(ACCESS_COOKIE, access, { maxAgeSeconds: 60 * 60 }); // ~access TTL
  setCookie(REFRESH_COOKIE, refresh, { maxAgeSeconds: 60 * 60 * 24 * 7 });
  if (decoded?.role) {
    setCookie(ROLE_COOKIE, decoded.role, { maxAgeSeconds: 60 * 60 * 24 * 7 });
  }
}

/** Update only the access cookie (used after a silent refresh). */
export function persistAccessToken(access: string): void {
  setCookie(ACCESS_COOKIE, access, { maxAgeSeconds: 60 * 60 });
  const decoded = decodeToken(access);
  if (decoded?.role) {
    setCookie(ROLE_COOKIE, decoded.role, { maxAgeSeconds: 60 * 60 * 24 * 7 });
  }
}

export function clearTokens(): void {
  deleteCookie(ACCESS_COOKIE);
  deleteCookie(REFRESH_COOKIE);
  deleteCookie(ROLE_COOKIE);
}
