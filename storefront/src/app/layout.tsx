import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { CustomerChatWidget } from "@/components/chat/CustomerChatWidget";

import "./globals.css";

// Persian-first typeface with Latin fallback for SKUs/numbers.
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
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-screen bg-white font-sans text-iron-grey antialiased">
        <AuthProvider>
          <CartProvider>
            <SiteChrome>{children}</SiteChrome>
            <CustomerChatWidget />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
