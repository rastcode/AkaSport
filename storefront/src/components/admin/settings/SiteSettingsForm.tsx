"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import { isSafeHttpUrl } from "@/lib/url";
import { resolveMediaUrl } from "@/services/catalogService";
import { updateAdminSiteSettings } from "@/services/siteSettingsService";
import type { ApiError } from "@/types/auth";
import type {
  SiteSettings,
  UpdateSiteSettingsPayload,
} from "@/types/siteSettings";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

interface Props {
  initial: SiteSettings;
  onSaved: (settings: SiteSettings) => void;
}

interface FormState {
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
  ecommerce_badge_enabled: boolean;
  ecommerce_badge_title: string;
  ecommerce_badge_url: string;
}

const URL_FIELDS: Array<keyof FormState> = [
  "instagram_url",
  "telegram_url",
  "whatsapp_url",
  "linkedin_url",
  "aparat_url",
  "youtube_url",
  "enamad_url",
  "ecommerce_badge_url",
];

function stateFromSettings(settings: SiteSettings): FormState {
  return {
    site_name: settings.site_name,
    footer_description: settings.footer_description,
    copyright_text: settings.copyright_text,
    address: settings.address,
    phone: settings.phone,
    mobile: settings.mobile,
    email: settings.email,
    support_hours: settings.support_hours,
    instagram_url: settings.instagram_url,
    telegram_url: settings.telegram_url,
    whatsapp_url: settings.whatsapp_url,
    linkedin_url: settings.linkedin_url,
    aparat_url: settings.aparat_url,
    youtube_url: settings.youtube_url,
    show_contact_info: settings.show_contact_info,
    show_social_links: settings.show_social_links,
    show_trust_badges: settings.show_trust_badges,
    enamad_enabled: settings.enamad_enabled,
    enamad_title: settings.enamad_title,
    enamad_url: settings.enamad_url,
    ecommerce_badge_enabled: settings.ecommerce_badge_enabled,
    ecommerce_badge_title: settings.ecommerce_badge_title,
    ecommerce_badge_url: settings.ecommerce_badge_url,
  };
}

function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "فرمت تصویر معتبر نیست. فقط JPG، PNG یا WebP مجاز است.";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return "حجم تصویر نباید بیشتر از ۵ مگابایت باشد.";
  }
  return null;
}

export function SiteSettingsForm({ initial, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() =>
    stateFromSettings(initial),
  );
  const [enamadFile, setEnamadFile] = useState<File | null>(null);
  const [ecommerceFile, setEcommerceFile] = useState<File | null>(null);
  const [enamadPreview, setEnamadPreview] = useState<string | null>(null);
  const [ecommercePreview, setEcommercePreview] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[]>
  >({});
  const enamadInput = useRef<HTMLInputElement>(null);
  const ecommerceInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (enamadPreview) URL.revokeObjectURL(enamadPreview);
      if (ecommercePreview) URL.revokeObjectURL(ecommercePreview);
    };
  }, [enamadPreview, ecommercePreview]);

  function setText(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setFlag(field: keyof FormState, value: boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function pickImage(kind: "enamad" | "ecommerce", file: File | null) {
    setError(null);
    setNotice(null);
    const currentPreview =
      kind === "enamad" ? enamadPreview : ecommercePreview;
    if (currentPreview) URL.revokeObjectURL(currentPreview);

    if (file) {
      const problem = validateImage(file);
      if (problem) {
        setError(problem);
        if (kind === "enamad") {
          setEnamadFile(null);
          setEnamadPreview(null);
          if (enamadInput.current) enamadInput.current.value = "";
        } else {
          setEcommerceFile(null);
          setEcommercePreview(null);
          if (ecommerceInput.current) ecommerceInput.current.value = "";
        }
        return;
      }
    }

    const preview = file ? URL.createObjectURL(file) : null;
    if (kind === "enamad") {
      setEnamadFile(file);
      setEnamadPreview(preview);
    } else {
      setEcommerceFile(file);
      setEcommercePreview(preview);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setFieldErrors({});

    if (!form.site_name.trim()) {
      setError("نام سایت الزامی است.");
      return;
    }

    for (const field of URL_FIELDS) {
      const value = form[field];
      if (typeof value === "string" && value.trim() && !isSafeHttpUrl(value)) {
        setFieldErrors({ [field]: ["آدرس باید با http:// یا https:// شروع شود."] });
        setError("لطفاً آدرس‌های اینترنتی نامعتبر را اصلاح کنید.");
        return;
      }
    }

    const payload: UpdateSiteSettingsPayload = {
      ...form,
      site_name: form.site_name.trim(),
      footer_description: form.footer_description.trim(),
      copyright_text: form.copyright_text.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      support_hours: form.support_hours.trim(),
      instagram_url: form.instagram_url.trim(),
      telegram_url: form.telegram_url.trim(),
      whatsapp_url: form.whatsapp_url.trim(),
      linkedin_url: form.linkedin_url.trim(),
      aparat_url: form.aparat_url.trim(),
      youtube_url: form.youtube_url.trim(),
      enamad_title: form.enamad_title.trim(),
      enamad_url: form.enamad_url.trim(),
      ecommerce_badge_title: form.ecommerce_badge_title.trim(),
      ecommerce_badge_url: form.ecommerce_badge_url.trim(),
      ...(enamadFile ? { enamad_image: enamadFile } : {}),
      ...(ecommerceFile ? { ecommerce_badge_image: ecommerceFile } : {}),
    };

    setSaving(true);
    try {
      const updated = await updateAdminSiteSettings(payload);
      setForm(stateFromSettings(updated));
      setEnamadFile(null);
      setEcommerceFile(null);
      if (enamadPreview) URL.revokeObjectURL(enamadPreview);
      if (ecommercePreview) URL.revokeObjectURL(ecommercePreview);
      setEnamadPreview(null);
      setEcommercePreview(null);
      if (enamadInput.current) enamadInput.current.value = "";
      if (ecommerceInput.current) ecommerceInput.current.value = "";
      setNotice("تنظیمات سایت با موفقیت ذخیره شد.");
      onSaved(updated);
    } catch (caught) {
      const apiError = caught as ApiError;
      setFieldErrors(apiError.fieldErrors ?? {});
      setError(apiError.message || "ذخیره تنظیمات سایت ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  const currentEnamadImage =
    safeCurrentImage(initial.enamad_image_url);
  const currentEcommerceImage = safeCurrentImage(
    initial.ecommerce_badge_image_url,
  );

  return (
    <form onSubmit={submit} className="space-y-6">
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {notice}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <FormSection title="اطلاعات عمومی">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="site-name"
            label="نام سایت"
            value={form.site_name}
            onChange={(value) => setText("site_name", value)}
            errors={fieldErrors.site_name}
            required
          />
          <TextField
            id="copyright-text"
            label="متن کپی‌رایت"
            value={form.copyright_text}
            onChange={(value) => setText("copyright_text", value)}
            errors={fieldErrors.copyright_text}
          />
          <TextArea
            id="footer-description"
            label="توضیح فوتر"
            value={form.footer_description}
            onChange={(value) => setText("footer_description", value)}
            errors={fieldErrors.footer_description}
            className="sm:col-span-2"
          />
        </div>
      </FormSection>

      <FormSection
        title="اطلاعات تماس"
        toggle={
          <Checkbox
            label="نمایش اطلاعات تماس در فوتر"
            checked={form.show_contact_info}
            onChange={(checked) => setFlag("show_contact_info", checked)}
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextArea
            id="contact-address"
            label="آدرس"
            value={form.address}
            onChange={(value) => setText("address", value)}
            errors={fieldErrors.address}
            className="sm:col-span-2"
          />
          <TextField id="contact-phone" label="تلفن" value={form.phone} onChange={(value) => setText("phone", value)} errors={fieldErrors.phone} />
          <TextField id="contact-mobile" label="موبایل" value={form.mobile} onChange={(value) => setText("mobile", value)} errors={fieldErrors.mobile} />
          <TextField id="contact-email" label="ایمیل" type="email" value={form.email} onChange={(value) => setText("email", value)} errors={fieldErrors.email} />
          <TextField id="support-hours" label="ساعات پاسخ‌گویی" value={form.support_hours} onChange={(value) => setText("support_hours", value)} errors={fieldErrors.support_hours} />
        </div>
      </FormSection>

      <FormSection
        title="شبکه‌های اجتماعی"
        toggle={
          <Checkbox
            label="نمایش شبکه‌های اجتماعی در فوتر"
            checked={form.show_social_links}
            onChange={(checked) => setFlag("show_social_links", checked)}
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <UrlField id="instagram-url" label="Instagram" value={form.instagram_url} onChange={(value) => setText("instagram_url", value)} errors={fieldErrors.instagram_url} />
          <UrlField id="telegram-url" label="Telegram" value={form.telegram_url} onChange={(value) => setText("telegram_url", value)} errors={fieldErrors.telegram_url} />
          <UrlField id="whatsapp-url" label="WhatsApp" value={form.whatsapp_url} onChange={(value) => setText("whatsapp_url", value)} errors={fieldErrors.whatsapp_url} />
          <UrlField id="linkedin-url" label="LinkedIn" value={form.linkedin_url} onChange={(value) => setText("linkedin_url", value)} errors={fieldErrors.linkedin_url} />
          <UrlField id="aparat-url" label="Aparat" value={form.aparat_url} onChange={(value) => setText("aparat_url", value)} errors={fieldErrors.aparat_url} />
          <UrlField id="youtube-url" label="YouTube" value={form.youtube_url} onChange={(value) => setText("youtube_url", value)} errors={fieldErrors.youtube_url} />
        </div>
      </FormSection>

      <FormSection
        title="نمادها و نشان‌های اعتماد"
        toggle={
          <Checkbox
            label="نمایش نمادها در فوتر"
            checked={form.show_trust_badges}
            onChange={(checked) => setFlag("show_trust_badges", checked)}
          />
        }
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <BadgeEditor
            title="ای‌نماد"
            enabled={form.enamad_enabled}
            onEnabledChange={(checked) => setFlag("enamad_enabled", checked)}
            name={form.enamad_title}
            onNameChange={(value) => setText("enamad_title", value)}
            url={form.enamad_url}
            onUrlChange={(value) => setText("enamad_url", value)}
            nameErrors={fieldErrors.enamad_title}
            urlErrors={fieldErrors.enamad_url}
            imageErrors={fieldErrors.enamad_image}
            fileRef={enamadInput}
            preview={enamadPreview || currentEnamadImage}
            onFileChange={(file) => pickImage("enamad", file)}
          />
          <BadgeEditor
            title="نشان دوم"
            enabled={form.ecommerce_badge_enabled}
            onEnabledChange={(checked) =>
              setFlag("ecommerce_badge_enabled", checked)
            }
            name={form.ecommerce_badge_title}
            onNameChange={(value) =>
              setText("ecommerce_badge_title", value)
            }
            url={form.ecommerce_badge_url}
            onUrlChange={(value) =>
              setText("ecommerce_badge_url", value)
            }
            nameErrors={fieldErrors.ecommerce_badge_title}
            urlErrors={fieldErrors.ecommerce_badge_url}
            imageErrors={fieldErrors.ecommerce_badge_image}
            fileRef={ecommerceInput}
            preview={ecommercePreview || currentEcommerceImage}
            onFileChange={(file) => pickImage("ecommerce", file)}
          />
        </div>
        <p className="mt-4 text-xs text-blue-slate">
          برای حذف تصویر فعلی endpoint جداگانه‌ای وجود ندارد؛ انتخاب نکردن فایل،
          تصویر موجود را حفظ می‌کند.
        </p>
      </FormSection>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary min-w-40 disabled:opacity-60">
          {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </button>
      </div>
    </form>
  );
}

function safeCurrentImage(value: string | null): string | null {
  const resolved = resolveMediaUrl(value);
  return resolved && isSafeHttpUrl(resolved) ? resolved : null;
}

function FormSection({
  title,
  toggle,
  children,
}: {
  title: string;
  toggle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-silver bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-dust-grey pb-3">
        <h2 className="text-lg font-bold text-iron-grey">{title}</h2>
        {toggle}
      </div>
      {children}
    </section>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  errors,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="form-label">
        {label}
        {required ? " *" : ""}
      </label>
      <input id={id} type={type} className="input-field" value={value} required={required} onChange={(event) => onChange(event.target.value)} />
      <FieldErrors errors={errors} />
    </div>
  );
}

function UrlField(props: Omit<React.ComponentProps<typeof TextField>, "type">) {
  return <TextField {...props} type="url" />;
}

function TextArea({
  id,
  label,
  value,
  onChange,
  errors,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label">{label}</label>
      <textarea id={id} className="input-field min-h-24" value={value} onChange={(event) => onChange(event.target.value)} />
      <FieldErrors errors={errors} />
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-blue-slate">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-bondi-blue" />
      {label}
    </label>
  );
}

function BadgeEditor({
  title,
  enabled,
  onEnabledChange,
  name,
  onNameChange,
  url,
  onUrlChange,
  nameErrors,
  urlErrors,
  imageErrors,
  fileRef,
  preview,
  onFileChange,
}: {
  title: string;
  enabled: boolean;
  onEnabledChange: (checked: boolean) => void;
  name: string;
  onNameChange: (value: string) => void;
  url: string;
  onUrlChange: (value: string) => void;
  nameErrors?: string[];
  urlErrors?: string[];
  imageErrors?: string[];
  fileRef: React.RefObject<HTMLInputElement>;
  preview: string | null;
  onFileChange: (file: File | null) => void;
}) {
  return (
    <div className="rounded-xl border border-dust-grey p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-bold text-iron-grey">{title}</h3>
        <Checkbox label="فعال" checked={enabled} onChange={onEnabledChange} />
      </div>
      <div className="space-y-4">
        <TextField id={`${title}-title`} label="عنوان" value={name} onChange={onNameChange} errors={nameErrors} />
        <UrlField id={`${title}-url`} label="لینک مقصد" value={url} onChange={onUrlChange} errors={urlErrors} />
        <div>
          <label className="form-label" htmlFor={`${title}-image`}>تصویر</label>
          <input
            ref={fileRef}
            id={`${title}-image`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-iron-grey file:ml-3 file:rounded-lg file:border-0 file:bg-brand-dark file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          <FieldErrors errors={imageErrors} />
        </div>
        {preview && (
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-silver bg-white p-2">
            <Image
              src={preview}
              alt={`پیش‌نمایش ${title}`}
              width={112}
              height={112}
              sizes="112px"
              unoptimized
              className="h-full w-full object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors.join(" ")}</p>;
}
