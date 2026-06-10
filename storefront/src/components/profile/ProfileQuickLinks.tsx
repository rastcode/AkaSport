import Link from "next/link";

/**
 * کارت‌های دسترسی سریع حساب کاربری (RTL / فارسی).
 * لینک به سفارش‌ها، سبد خرید و ادامه‌ی خرید؛ و برای ADMIN/OWNER لینک پنل مدیریت.
 */
export function ProfileQuickLinks({ isStaff }: { isStaff: boolean }) {
  const links: { href: string; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      href: "/orders",
      title: "سفارش‌های من",
      desc: "پیگیری و مشاهده‌ی سفارش‌ها",
      icon: <OrdersIcon />,
    },
    {
      href: "/cart",
      title: "سبد خرید",
      desc: "مشاهده‌ی اقلام انتخاب‌شده",
      icon: <CartIcon />,
    },
    {
      href: "/products",
      title: "ادامه‌ی خرید",
      desc: "مشاهده‌ی محصولات فروشگاه",
      icon: <ShopIcon />,
    },
  ];

  if (isStaff) {
    links.push({
      href: "/admin/dashboard",
      title: "پنل مدیریت",
      desc: "مدیریت فروشگاه",
      icon: <AdminIcon />,
    });
  }

  return (
    <section dir="rtl" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex items-center gap-4 rounded-2xl border border-silver/60 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-accent/40 hover:shadow-card"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
            {link.icon}
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-iron-grey">{link.title}</span>
            <span className="block text-xs text-blue-slate">{link.desc}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

function OrdersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h6a2 2 0 0 1 2 2v12l-5-3-5 3V7a2 2 0 0 1 2-2Z" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.4c.5 0 .94.34 1.07.83L8.1 16.2a1.5 1.5 0 0 0 1.45 1.1h7.7a1.5 1.5 0 0 0 1.46-1.13l1.6-6.4a1.13 1.13 0 0 0-1.1-1.4H6M9 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm9 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}
function ShopIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5 4.5 4h15L21 9.5M4 9.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5M4 9.5h16" />
    </svg>
  );
}
function AdminIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Z" />
    </svg>
  );
}
