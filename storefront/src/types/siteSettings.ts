export interface SiteSettings {
  site_name: string;
  footer_description: string;
  copyright_text: string;
  address: string;
  phone: string;
  mobile: string;
  email: string;
  support_hours: string;
  instagram_url: string;
  telegram_url: string;
  whatsapp_url: string;
  linkedin_url: string;
  aparat_url: string;
  youtube_url: string;
  show_contact_info: boolean;
  show_social_links: boolean;
  show_trust_badges: boolean;
  enamad_enabled: boolean;
  enamad_title: string;
  enamad_url: string;
  enamad_image_url: string | null;
  ecommerce_badge_enabled: boolean;
  ecommerce_badge_title: string;
  ecommerce_badge_url: string;
  ecommerce_badge_image_url: string | null;
}

export type SiteSettingsTextField =
  | "site_name"
  | "footer_description"
  | "copyright_text"
  | "address"
  | "phone"
  | "mobile"
  | "email"
  | "support_hours"
  | "instagram_url"
  | "telegram_url"
  | "whatsapp_url"
  | "linkedin_url"
  | "aparat_url"
  | "youtube_url"
  | "enamad_title"
  | "enamad_url"
  | "ecommerce_badge_title"
  | "ecommerce_badge_url";

export type SiteSettingsBooleanField =
  | "show_contact_info"
  | "show_social_links"
  | "show_trust_badges"
  | "enamad_enabled"
  | "ecommerce_badge_enabled";

export type UpdateSiteSettingsPayload = Partial<
  Pick<SiteSettings, SiteSettingsTextField | SiteSettingsBooleanField>
> & {
  enamad_image?: File | null;
  ecommerce_badge_image?: File | null;
};
