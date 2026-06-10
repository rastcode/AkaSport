import Link from "next/link";

import { Logo } from "@/components/ui/Logo";

/** پاورقی فروشگاه (RTL / فارسی). */
export function Footer() {
  const year = new Date().getFullYear();

  const columns: { title: string; links: { label: string; href: string }[] }[] =
    [
      {
        title: "با آکامارکت",
        links: [
          { label: "درباره‌ی ما", href: "/" },
          { label: "تماس با ما", href: "/" },
          { label: "فرصت‌های شغلی", href: "/" },
        ],
      },
      {
        title: "خدمات مشتریان",
        links: [
          { label: "پاسخ به پرسش‌های متداول", href: "/" },
          { label: "رویه‌ی بازگرداندن کالا", href: "/" },
          { label: "شرایط استفاده", href: "/" },
        ],
      },
      {
        title: "راهنمای خرید",
        links: [
          { label: "نحوه‌ی ثبت سفارش", href: "/" },
          { label: "شیوه‌های پرداخت", href: "/" },
          { label: "رویه‌ی ارسال سفارش", href: "/" },
        ],
      },
    ];

  return (
    <footer dir="rtl" className="mt-16 border-t border-silver/70 bg-brand-light/60">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-blue-slate">
              بازارگاه اینترنتی آکامارکت؛ خرید مطمئن با تنوع بالای کالا و ارسال
              سریع به سراسر کشور.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-bold text-iron-grey">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-blue-slate transition-colors hover:text-bondi-blue"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-silver/70 pt-6 text-sm text-blue-slate sm:flex-row">
          <span className="font-bold text-iron-grey">آکامارکت</span>
          <span>© {year} — تمامی حقوق محفوظ است.</span>
        </div>
      </div>
    </footer>
  );
}
