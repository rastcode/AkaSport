import type { Config } from "tailwindcss";

/**
 * AkaSport Tailwind configuration.
 *
 * The brand palette is exposed as first-class color utilities, e.g.
 *   bg-bondi-blue, text-iron-grey, border-blue-slate, ring-silver
 *
 * `bondi-blue` is the primary accent for active links, buttons and CTAs.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ---------------------------------------------------------------- //
        // پالت برند AkaSport (semantic) — sporty / premium / bold
        //   brand-dark   #2b2d42  Space Indigo   (متن اصلی، هدر/فوتر، پنل ادمین)
        //   brand-muted  #8d99ae  Lavender Grey  (متن کم‌اهمیت، border ملایم)
        //   brand-light  #edf2f4  Platinum       (پس‌زمینه‌ی صفحات/بخش‌های ملایم)
        //   brand-accent #ef233c  Strawberry Red (CTA اصلی، badge تخفیف، انرژی)
        //   brand-danger #d90429  Flag Red       (hover قرمز، خطا، حذف)
        // ---------------------------------------------------------------- //
        brand: {
          dark: "#2b2d42",
          muted: "#8d99ae",
          light: "#edf2f4",
          accent: "#ef233c",
          danger: "#d90429",
        },

        // ---------------------------------------------------------------- //
        // Aliasهای قدیمی — نام‌ها حفظ شده‌اند ولی به پالت جدید نگاشت شده‌اند تا
        // کلاس‌های موجود در همه‌ی صفحات بدون تغییر، رنگ جدید بگیرند.
        //   نکته‌ی کنتراست: iron-grey و blue-slate (متن) عمداً به brand-dark
        //   نگاشت شده‌اند، نه lavender، تا خوانایی متن فارسی حفظ شود.
        // ---------------------------------------------------------------- //
        "dust-grey": "#edf2f4", // → brand-light (پس‌زمینه‌ی ملایم)
        silver: "#8d99ae", // → brand-muted (border/متن خیلی کم‌رنگ)
        "iron-grey": "#2b2d42", // → brand-dark (متن اصلی)
        "blue-slate": "#2b2d42", // → brand-dark (متن ثانویه؛ کنتراست امن)
        "bondi-blue": "#ef233c", // → brand-accent (accent اصلی / CTA)
        "bondi-blue-dark": "#d90429", // → brand-danger (hover)
        "bondi-blue-light": "#f4495a", // طیف روشن‌ترِ Strawberry برای گرادیان‌ها
        discount: "#ef233c", // → brand-accent (badge تخفیف)
      },
      fontFamily: {
        sans: ["var(--font-vazirmatn)", "Vazirmatn", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // سایه‌ی کارت با ته‌مایه‌ی Space Indigo
        card: "0 10px 30px -12px rgba(43, 45, 66, 0.25)",
        // حلقه‌ی فوکوس با accent قرمز (Strawberry Red)
        "focus-accent": "0 0 0 3px rgba(239, 35, 60, 0.35)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
