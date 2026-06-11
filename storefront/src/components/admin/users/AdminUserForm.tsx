"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  EMPTY_ADMIN_PERMISSIONS,
} from "@/lib/adminPermissions";
import {
  createAdminUser,
  updateAdminUser,
} from "@/services/adminUserService";
import type {
  AdminPermissionKey,
  AdminPermissions,
  AdminUser,
  ApiError,
} from "@/types/auth";

const PERMISSION_OPTIONS: Array<{
  key: AdminPermissionKey;
  label: string;
}> = [
  { key: "can_manage_products", label: "مدیریت محصولات، تنوع‌ها و تصاویر" },
  { key: "can_manage_categories", label: "مدیریت دسته‌بندی‌ها، برندها، رنگ‌ها و سایزها" },
  { key: "can_manage_orders", label: "مدیریت سفارش‌ها" },
  { key: "can_manage_coupons", label: "مدیریت کدهای تخفیف" },
  { key: "can_manage_reviews", label: "مدیریت نظرات" },
  { key: "can_manage_site_settings", label: "مدیریت تنظیمات سایت" },
  { key: "can_view_analytics", label: "مشاهده آمار و گزارش‌ها" },
  { key: "can_manage_chat", label: "مدیریت گفت‌وگوهای پشتیبانی" },
  { key: "can_manage_users", label: "مجوز مدیریت کاربران برای توسعه‌های بعدی" },
];

export function AdminUserForm({ admin }: { admin?: AdminUser }) {
  const router = useRouter();
  const isEdit = Boolean(admin);
  const [firstName, setFirstName] = useState(admin?.first_name ?? "");
  const [lastName, setLastName] = useState(admin?.last_name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(admin?.phone_number ?? "");
  const [email, setEmail] = useState(admin?.email ?? "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(admin?.is_active ?? true);
  const initialPermissions = useMemo<AdminPermissions>(
    () => ({
      ...EMPTY_ADMIN_PERMISSIONS,
      ...(admin?.permissions ?? {}),
    }),
    [admin],
  );
  const [permissions, setPermissions] =
    useState<AdminPermissions>(initialPermissions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function togglePermission(key: AdminPermissionKey) {
    setPermissions((current) => ({ ...current, [key]: !current[key] }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      if (admin) {
        await updateAdminUser(admin.id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          is_active: isActive,
          permissions,
        });
        router.push("/admin/admins?updated=1");
      } else {
        await createAdminUser({
          phone_number: phoneNumber.trim(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          permissions,
        });
        router.push("/admin/admins?created=1");
      }
      router.refresh();
    } catch (caught) {
      const apiError = caught as ApiError;
      setError(apiError.message || "ذخیره اطلاعات مدیر ناموفق بود.");
      setFieldErrors(apiError.fieldErrors ?? {});
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-silver bg-white p-5">
        <h2 className="text-lg font-bold text-iron-grey">اطلاعات مدیر</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField label="نام" value={firstName} onChange={setFirstName} errors={fieldErrors.first_name} />
          <TextField label="نام خانوادگی" value={lastName} onChange={setLastName} errors={fieldErrors.last_name} />
          <TextField
            label="شماره موبایل"
            value={phoneNumber}
            onChange={setPhoneNumber}
            disabled={isEdit}
            required={!isEdit}
            errors={fieldErrors.phone_number}
            dir="ltr"
          />
          <TextField label="ایمیل" value={email} onChange={setEmail} type="email" errors={fieldErrors.email} dir="ltr" />
          {!isEdit && (
            <TextField
              label="رمز عبور"
              value={password}
              onChange={setPassword}
              type="password"
              required
              errors={fieldErrors.password}
              dir="ltr"
            />
          )}
          {isEdit && (
            <label className="flex items-center gap-3 self-end rounded-lg border border-silver px-4 py-3 text-sm font-semibold text-iron-grey">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 accent-bondi-blue"
              />
              حساب مدیر فعال باشد
            </label>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-silver bg-white p-5">
        <h2 className="text-lg font-bold text-iron-grey">سطح دسترسی</h2>
        <p className="mt-1 text-sm text-blue-slate">
          مدیر فقط به بخش‌هایی دسترسی دارد که در اینجا فعال شده‌اند.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PERMISSION_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex items-start gap-3 rounded-lg border border-silver px-4 py-3 text-sm text-iron-grey"
            >
              <input
                type="checkbox"
                checked={permissions[option.key]}
                onChange={() => togglePermission(option.key)}
                className="mt-0.5 h-4 w-4 accent-bondi-blue"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "در حال ذخیره..." : isEdit ? "ذخیره تغییرات" : "ساخت مدیر"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/admins")}
          className="rounded-lg border border-silver bg-white px-5 py-3 font-semibold text-iron-grey hover:bg-dust-grey"
        >
          انصراف
        </button>
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  errors,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  errors?: string[];
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="block text-sm font-semibold text-iron-grey">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        dir={dir}
        className="mt-2 w-full rounded-lg border border-silver bg-white px-3 py-2.5 font-normal outline-none focus:border-bondi-blue disabled:bg-dust-grey"
      />
      {errors?.map((message) => (
        <span key={message} className="mt-1 block text-xs font-normal text-red-600">
          {message}
        </span>
      ))}
    </label>
  );
}
