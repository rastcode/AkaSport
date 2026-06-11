import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { SiteChrome } from "@/components/layout/SiteChrome";

import "./globals.css";

// قلم فارسی‌محور با fallback لاتین برای اعداد و کدهای کالا.
const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "http://localhost:3000";
const DEFAULT_TITLE = "آکامارکت | فروشگاه لوازم ورزشی";
const DEFAULT_DESCRIPTION =
  "خرید آنلاین لوازم ورزشی، پوشاک ورزشی، کفش، کیف و تجهیزات تمرین از آکامارکت.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | آکامارکت",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: "آکامارکت",
  openGraph: {
    type: "website",
    siteName: "آکامارکت",
    locale: "fa_IR",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // یادداشت فاز ۰: ویجت چت پشتیبانی (CustomerChatWidget) موقتاً غیرفعال شده است
  // و تا زمانی که سرویس چت بک‌اند واقعاً آماده و پایدار شود، در layout قرار نمی‌گیرد.
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-screen bg-white font-sans text-iron-grey antialiased">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <SiteChrome>{children}</SiteChrome>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
