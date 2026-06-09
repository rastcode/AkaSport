/**
 * Axios API client with automatic JWT attach + silent refresh.
 *
 * - Request interceptor attaches the access token as `Authorization: Bearer`.
 * - Response interceptor catches 401s, performs a single refresh against
 *   `/auth/token/refresh/`, and retries the original request. Concurrent 401s
 *   share one in-flight refresh (request queue) to avoid a refresh stampede.
 */

import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

import type { ApiError } from "@/types/auth";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  persistAccessToken,
} from "@/lib/tokens";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

/* ----------------------- request: attach bearer token ---------------------- */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

/* ----------------------- response: silent token refresh -------------------- */
interface RetriableConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null): void {
  pendingQueue.forEach((resolve) => resolve(token));
  pendingQueue = [];
}

/** Hook invoked when refresh fails terminally (e.g. to force logout in UI). */
let onAuthFailure: (() => void) | null = null;
export function setAuthFailureHandler(handler: () => void): void {
  onAuthFailure = handler;
}

async function performRefresh(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    // Use a bare axios call so this request skips the interceptors.
    const { data } = await axios.post<{ access: string; refresh?: string }>(
      `${BASE_URL}/auth/token/refresh/`,
      { refresh },
      { headers: { "Content-Type": "application/json" } },
    );
    persistAccessToken(data.access);
    return data.access;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // Only attempt refresh once per request, and never for the refresh call.
    const isRefreshCall = original?.url?.includes("/auth/token/refresh/");
    if (status !== 401 || !original || original._retry || isRefreshCall) {
      return Promise.reject(normalizeError(error));
    }

    original._retry = true;

    if (isRefreshing) {
      // Queue until the in-flight refresh resolves, then retry.
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) {
            reject(normalizeError(error));
            return;
          }
          const headers = AxiosHeaders.from(original.headers);
          headers.set("Authorization", `Bearer ${token}`);
          original.headers = headers;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    const newToken = await performRefresh();
    isRefreshing = false;
    flushQueue(newToken);

    if (!newToken) {
      clearTokens();
      onAuthFailure?.();
      return Promise.reject(normalizeError(error));
    }

    const headers = AxiosHeaders.from(original.headers);
    headers.set("Authorization", `Bearer ${newToken}`);
    original.headers = headers;
    return api(original);
  },
);

/* ----------------------------- error normaliser ---------------------------- */
export function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as Record<string, unknown> | undefined;

    let message = "Something went wrong. Please try again.";
    let fieldErrors: Record<string, string[]> | undefined;

    if (data) {
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray((data as { detail?: unknown }).detail)) {
        message = ((data as { detail: unknown[] }).detail as string[]).join(" ");
      } else {
        // DRF field errors: { field: ["msg", ...] }
        fieldErrors = {};
        for (const [key, value] of Object.entries(data)) {
          if (Array.isArray(value)) {
            fieldErrors[key] = value.map(String);
          } else if (typeof value === "string") {
            fieldErrors[key] = [value];
          }
        }
        const first = Object.values(fieldErrors)[0]?.[0];
        if (first) message = first;
      }
    } else if (error.code === "ECONNABORTED") {
      message = "The request timed out. Check your connection and retry.";
    } else if (error.message === "Network Error") {
      message = "Cannot reach the server. Is the backend running?";
    }

    return { status, message, fieldErrors };
  }
  return { status: 0, message: "An unexpected error occurred." };
}

export default api;
