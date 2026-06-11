import { isSafeHttpUrl, isSafeRelativeUrl } from "@/lib/url";

const FALLBACK_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  return configured && isSafeHttpUrl(configured)
    ? configured
    : FALLBACK_SITE_URL;
}

export function toAbsoluteUrl(pathOrUrl: string): string {
  const candidate = pathOrUrl.trim();
  if (isSafeHttpUrl(candidate)) return candidate;
  if (!isSafeRelativeUrl(candidate)) return getSiteUrl();
  return `${getSiteUrl()}${candidate.startsWith("/") ? "" : "/"}${candidate}`;
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
