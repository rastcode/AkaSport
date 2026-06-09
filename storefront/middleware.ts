/**
 * Next.js Edge middleware — role-based route guarding.
 *
 * Access matrix:
 *   PUBLIC (no auth)        : /, /products, /product/[slug], /cart  (+ all
 *                             other non-listed routes, e.g. /login, /register)
 *   CUSTOMER (any valid JWT) : /checkout, /profile, /orders
 *   STAFF (ADMIN | OWNER)    : /admin/**
 *
 * The storefront catalog and the guest cart are intentionally open so visitors
 * can browse and build a cart before ever authenticating.
 *
 * The JWT is base64-decoded (NOT signature-verified) only to read the role for
 * UX redirects; the Django backend re-validates every request and remains the
 * authoritative gate. Expired tokens are treated as unauthenticated.
 */

import { NextResponse, type NextRequest } from "next/server";

type Role = "OWNER" | "ADMIN" | "CUSTOMER";

const PREFIX = process.env.NEXT_PUBLIC_COOKIE_PREFIX || "akasport";
const ACCESS_COOKIE = `${PREFIX}_access`;
const ROLE_COOKIE = `${PREFIX}_role`;

/**
 * Paths that require any authenticated user.
 * NOTE: `/cart` is deliberately NOT here — the guest cart is public.
 */
const CUSTOMER_PATHS = ["/checkout", "/profile", "/orders"];

/** Paths that require the ADMIN or OWNER role. */
const STAFF_PATHS = ["/admin"];

/** Paths an already-authenticated user should be redirected away from. */
const GUEST_ONLY_PATHS = ["/login", "/register"];

interface MinimalJwt {
  exp?: number;
  role?: Role;
}

/** Decode a JWT payload at the Edge without external deps. */
function decodeJwtPayload(token: string): MinimalJwt | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const json = atob(padded); // available in the Edge runtime
    return JSON.parse(json) as MinimalJwt;
  } catch {
    return null;
  }
}

function isExpired(payload: MinimalJwt | null): boolean {
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

/** Match `pathname` against a list of path prefixes (exact or nested). */
function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(ACCESS_COOKIE)?.value ?? null;
  const payload = token ? decodeJwtPayload(token) : null;
  const authenticated = Boolean(token) && !isExpired(payload);

  const role: Role | null =
    (payload?.role as Role | undefined) ??
    (request.cookies.get(ROLE_COOKIE)?.value as Role | undefined) ??
    null;

  const isStaff = role === "ADMIN" || role === "OWNER";

  // 1) Guest-only pages: send authenticated users to a sensible home.
  if (authenticated && startsWithAny(pathname, GUEST_ONLY_PATHS)) {
    return NextResponse.redirect(new URL(isStaff ? "/admin/dashboard" : "/", request.url));
  }

  // 2) Staff sector: require ADMIN/OWNER.
  if (startsWithAny(pathname, STAFF_PATHS)) {
    if (!authenticated) return redirectToLogin(request, pathname);
    if (!isStaff) return NextResponse.redirect(new URL("/403", request.url));
    return NextResponse.next();
  }

  // 3) Customer sector: require any authenticated user.
  if (startsWithAny(pathname, CUSTOMER_PATHS)) {
    if (!authenticated) return redirectToLogin(request, pathname);
    return NextResponse.next();
  }

  // 4) Everything else — including /, /products, /product/*, /cart — is public.
  return NextResponse.next();
}

function redirectToLogin(request: NextRequest, from: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", from); // preserve intended destination
  return NextResponse.redirect(url);
}

/**
 * Run middleware on app routes only, excluding static assets and Next internals.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
