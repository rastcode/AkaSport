import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SiteChrome } from "@/components/layout/SiteChrome";

import "./globals.css";

// قلم فارسی‌محور با fallback لاتین برای اعداد و کدهای کالا.
const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: "آکامارکت | بازارگاه اینترنتی",
  description:
    "آکامارکت؛ بازارگاه اینترنتی با تنوع بالای کالا، تخفیف‌های ویژه و ارسال سریع به سراسر کشور.",
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
            <SiteChrome>{children}</SiteChrome>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
