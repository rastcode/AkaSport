import type {
  AdminPermissionKey,
  AdminPermissions,
  User,
} from "@/types/auth";

export const EMPTY_ADMIN_PERMISSIONS: AdminPermissions = {
  can_manage_products: false,
  can_manage_categories: false,
  can_manage_orders: false,
  can_manage_coupons: false,
  can_manage_reviews: false,
  can_manage_site_settings: false,
  can_view_analytics: false,
  can_manage_chat: false,
  can_manage_users: false,
};

export function hasAdminPermission(
  user: User | null | undefined,
  permission: AdminPermissionKey,
): boolean {
  if (!user) return false;
  if (user.role === "OWNER") return true;
  if (user.role !== "ADMIN") return false;
  return user.permissions?.[permission] === true;
}

export function hasAnyAdminPermission(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "OWNER") return true;
  if (user.role !== "ADMIN" || !user.permissions) return false;
  return Object.values(user.permissions).some(Boolean);
}
