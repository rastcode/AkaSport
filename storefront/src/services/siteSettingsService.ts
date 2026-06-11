import api from "@/lib/api";
import type { SiteSettings } from "@/types/siteSettings";
import type { UpdateSiteSettingsPayload } from "@/types/siteSettings";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function nullableText(value: unknown): string | null {
  const normalized = text(value);
  return normalized || null;
}

function normalizeSiteSettings(value: unknown): SiteSettings | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;

  return {
    site_name: text(data.site_name),
    footer_description: text(data.footer_description),
    copyright_text: text(data.copyright_text),
    address: text(data.address),
    phone: text(data.phone),
    mobile: text(data.mobile),
    email: text(data.email),
    support_hours: text(data.support_hours),
    instagram_url: text(data.instagram_url),
    telegram_url: text(data.telegram_url),
    whatsapp_url: text(data.whatsapp_url),
    linkedin_url: text(data.linkedin_url),
    aparat_url: text(data.aparat_url),
    youtube_url: text(data.youtube_url),
    show_contact_info: flag(data.show_contact_info, true),
    show_social_links: flag(data.show_social_links, true),
    show_trust_badges: flag(data.show_trust_badges, true),
    enamad_enabled: flag(data.enamad_enabled, false),
    enamad_title: text(data.enamad_title),
    enamad_url: text(data.enamad_url),
    enamad_image_url: nullableText(data.enamad_image_url),
    ecommerce_badge_enabled: flag(data.ecommerce_badge_enabled, false),
    ecommerce_badge_title: text(data.ecommerce_badge_title),
    ecommerce_badge_url: text(data.ecommerce_badge_url),
    ecommerce_badge_image_url: nullableText(
      data.ecommerce_badge_image_url,
    ),
  };
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const response = await fetch(`${API_BASE}/site/settings/`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return normalizeSiteSettings(await response.json());
  } catch {
    return null;
  }
}

export async function getAdminSiteSettings(): Promise<SiteSettings> {
  const { data } = await api.get<SiteSettings>("/site/admin/settings/");
  return data;
}

export async function updateAdminSiteSettings(
  payload: UpdateSiteSettingsPayload,
): Promise<SiteSettings> {
  const hasFile =
    payload.enamad_image instanceof File ||
    payload.ecommerce_badge_image instanceof File;

  if (!hasFile) {
    const { enamad_image, ecommerce_badge_image, ...jsonPayload } = payload;
    const { data } = await api.patch<SiteSettings>(
      "/site/admin/settings/",
      jsonPayload,
    );
    return data;
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value instanceof File) {
      form.append(key, value);
    } else if (typeof value === "boolean") {
      form.append(key, value ? "true" : "false");
    } else if (typeof value === "string") {
      form.append(key, value);
    }
  }

  const { data } = await api.patch<SiteSettings>(
    "/site/admin/settings/",
    form,
  );
  return data;
}
