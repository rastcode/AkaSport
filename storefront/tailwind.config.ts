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
        "dust-grey": "#dcdcdd", // Subtle, soft tone mirroring dusted stone
        silver: "#c5c3c6", // Lustrous metallic sheen for modern elegance
        "iron-grey": "#46494c", // Slate grey with a blue-green cast for durability
        "blue-slate": "#4c5c68", // Hints of blue for cool authority and calm depth
        "bondi-blue": "#1985a1", // Luminous aquatic blue — PRIMARY ACCENT
        // Convenient hover/active shades derived from the accent.
        "bondi-blue-dark": "#13697f",
        "bondi-blue-light": "#22a3c3",
        // Marketplace discount accent (red) — used only for discount badges/CTAs.
        discount: "#e5413f",
      },
      fontFamily: {
        sans: ["var(--font-vazirmatn)", "Vazirmatn", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(70, 73, 76, 0.25)",
        "focus-accent": "0 0 0 3px rgba(25, 133, 161, 0.35)",
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
