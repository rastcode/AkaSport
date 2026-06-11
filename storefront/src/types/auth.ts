/**
 * Strict auth type definitions shared across the storefront.
 *
 * These mirror the Django backend contract:
 *   - JWT access tokens embed `role`, `email`, `phone_number` (Part 1 claims).
 *   - The unified login endpoint accepts password OR OTP payloads.
 */

/** The three RBAC roles returned by the backend. */
export type UserRole = "OWNER" | "ADMIN" | "CUSTOMER";

export const ADMIN_PERMISSION_KEYS = [
  "can_manage_products",
  "can_manage_categories",
  "can_manage_orders",
  "can_manage_coupons",
  "can_manage_reviews",
  "can_manage_site_settings",
  "can_view_analytics",
  "can_manage_chat",
  "can_manage_users",
] as const;

export type AdminPermissionKey = (typeof ADMIN_PERMISSION_KEYS)[number];
export type AdminPermissions = Record<AdminPermissionKey, boolean>;

/** Authenticated user profile (subset of the backend `/auth/me/` response). */
export interface User {
  id: number;
  email: string | null;
  phone_number: string | null;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  is_phone_verified?: boolean;
  permissions: AdminPermissions | null;
}

/**
 * Shape of the decoded JWT access-token payload.
 * Matches `CustomTokenObtainPairSerializer` + SimpleJWT defaults.
 */
export interface DecodedToken {
  token_type: "access" | "refresh";
  exp: number; // expiry (epoch seconds)
  iat: number; // issued-at (epoch seconds)
  jti: string;
  user_id: number;
  role: UserRole;
  email: string | null;
  phone_number: string | null;
}

/** The JWT pair returned by login / OTP-verify endpoints. */
export interface AuthTokens {
  access: string;
  refresh: string;
}

/** Reactive auth state exposed by the AuthContext. */
export interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  /** True while the provider is restoring session on first mount. */
  isLoading: boolean;
}

/* ----------------------------- Request payloads ---------------------------- */

/** Email/phone + password login (factory routes to EmailAuthService). */
export interface PasswordLoginPayload {
  method?: "password";
  identifier: string; // email or phone
  password: string;
}

/** OTP login (factory routes to OTPAuthService). */
export interface OtpLoginPayload {
  method?: "otp";
  phone_number: string;
  code: string;
}

export type LoginPayload = PasswordLoginPayload | OtpLoginPayload;

/** Request body for issuing an OTP code. */
export interface OtpRequestPayload {
  phone_number: string;
}

/**
 * بدنه‌ی ثبت‌نام مشتری (POST /auth/register/).
 * نقش در سمت سرور به CUSTOMER تثبیت می‌شود؛ کاربر نقش انتخاب نمی‌کند.
 */
export interface RegisterPayload {
  phone_number: string;
  password: string;
  password_confirm: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

/* ----------------------------- API responses ------------------------------ */

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface AdminUser {
  id: number;
  phone_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: "ADMIN";
  is_active: boolean;
  permissions: AdminPermissions & {
    created_at?: string;
    updated_at?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateAdminUserPayload {
  phone_number: string;
  password: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  permissions: AdminPermissions;
}

export interface UpdateAdminUserPayload {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  is_active?: boolean;
  permissions?: Partial<AdminPermissions>;
}

export interface OtpRequestResponse {
  detail: string;
  phone_number: string;
  expires_at: string;
  /** Present only in dev (backend `debug_code`). */
  debug_code?: string;
}

/** Normalised error surfaced to the UI layer. */
export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

/** The context value consumed via `useAuth()`. */
export interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  loginWithOtp: (phone_number: string, code: string) => Promise<User>;
  requestOtp: (phone_number: string) => Promise<OtpRequestResponse>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}
