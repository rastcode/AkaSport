"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  hasAdminPermission,
  hasAnyAdminPermission,
} from "@/lib/adminPermissions";
import type { AdminPermissionKey, User } from "@/types/auth";

function requiredPermission(pathname: string): AdminPermissionKey | "OWNER" | null {
  if (pathname.startsWith("/admin/admins")) return "OWNER";
  if (pathname.startsWith("/admin/products")) return "can_manage_products";
  if (
    pathname.startsWith("/admin/categories") ||
    pathname.startsWith("/admin/brands") ||
    pathname.startsWith("/admin/attributes")
  ) {
    return "can_manage_categories";
  }
  if (pathname.startsWith("/admin/orders")) return "can_manage_orders";
  if (pathname.startsWith("/admin/coupons")) return "can_manage_coupons";
  if (pathname.startsWith("/admin/reviews")) return "can_manage_reviews";
  if (pathname.startsWith("/admin/settings")) return "can_manage_site_settings";
  if (pathname.startsWith("/admin/analytics")) return "can_view_analytics";
  if (pathname.startsWith("/admin/chat")) return "can_manage_chat";
  return null;
}

function canAccessAdminPath(user: User | null, pathname: string): boolean {
  if (!user) return false;
  const required = requiredPermission(pathname);
  if (required === "OWNER") return user.role === "OWNER";
  if (required) return hasAdminPermission(user, required);
  if (pathname === "/admin" || pathname.startsWith("/admin/dashboard")) {
    return hasAnyAdminPermission(user);
  }
  return user.role === "OWNER";
}

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-dust-grey/40">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-silver border-t-bondi-blue" />
      </main>
    );
  }

  if (!canAccessAdminPath(user, pathname)) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen flex-col items-center justify-center bg-dust-grey/40 px-4 text-center"
      >
        <p className="text-5xl font-black text-silver">403</p>
        <h1 className="mt-2 text-xl font-bold text-iron-grey">دسترسی غیرمجاز</h1>
        <p className="mt-2 max-w-md text-blue-slate">
          شما مجوز دسترسی به این بخش از پنل مدیریت را ندارید.
        </p>
        <Link href="/" className="btn-primary mt-6">
          بازگشت به فروشگاه
        </Link>
      </main>
    );
  }

  return children;
}
