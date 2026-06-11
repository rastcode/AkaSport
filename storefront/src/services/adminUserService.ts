import api, { normalizeError } from "@/lib/api";
import type {
  AdminUser,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from "@/types/auth";

const ADMIN_USERS_URL = "/auth/admin/admins/";

export async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    const { data } = await api.get<AdminUser[] | { results: AdminUser[] }>(
      ADMIN_USERS_URL,
    );
    return Array.isArray(data) ? data : data.results;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function createAdminUser(
  payload: CreateAdminUserPayload,
): Promise<AdminUser> {
  try {
    const { data } = await api.post<AdminUser>(ADMIN_USERS_URL, payload);
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function getAdminUser(id: number): Promise<AdminUser> {
  try {
    const { data } = await api.get<AdminUser>(`${ADMIN_USERS_URL}${id}/`);
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function updateAdminUser(
  id: number,
  payload: UpdateAdminUserPayload,
): Promise<AdminUser> {
  try {
    const { data } = await api.patch<AdminUser>(
      `${ADMIN_USERS_URL}${id}/`,
      payload,
    );
    return data;
  } catch (error) {
    throw normalizeError(error);
  }
}
