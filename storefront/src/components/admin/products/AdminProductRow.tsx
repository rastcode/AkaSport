import Link from "next/link";

import { formatToman, formatNumber } from "@/lib/persian";
import type { ProductListItem, ProductStatus } from "@/types/catalog";

const STATUS_LABEL: Record<ProductStatus, { label: string; cls: string }> = {
  DRAFT: { label: "پیش‌نویس", cls: "bg-dust-grey text-iron-grey" },
  PUBLISHED: { label: "منتشرشده", cls: "bg-emerald-50 text-emerald-700" },
  OUT_OF_STOCK: { label: "ناموجود", cls: "bg-amber-50 text-amber-700" },
  ARCHIVED: { label: "بایگانی‌شده", cls: "bg-blue-slate/10 text-blue-slate" },
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const s = STATUS_LABEL[status] ?? { label: status, cls: "bg-dust-grey text-iron-grey" };
  return (
    <span className={"inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold " + s.cls}>
      {s.label}
    </span>
  );
}

/**
 * کارت یک محصول در فهرست مدیریت محصولات (RTL / فارسی) — مناسب موبایل.
 */
export function AdminProductRow({ product }: { product: ProductListItem }) {
  const hasDiscount = product.has_discount && product.discount_price;

  return (
    <article dir="rtl" className="rounded-xl border border-silver bg-white p-4 transition-shadow hover:shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-dust-grey pb-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-iron-grey">{product.title_fa}</h3>
          <p className="mt-0.5 truncate text-xs text-silver">{product.slug}</p>
        </div>
        <ProductStatusBadge status={product.status} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-4">
        <Cell label="برند" value={product.brand?.name_fa || "—"} />
        <Cell label="دسته‌بندی" value={product.category?.name_fa || "—"} />
        <Cell
          label="قیمت"
          value={
            hasDiscount
              ? `${formatToman(product.discount_price as string)}`
              : formatToman(product.base_price)
          }
          strong
        />
        <Cell
          label="موجودی"
          value={product.in_stock ? "موجود" : "ناموجود"}
        />
      </dl>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-silver">
          {product.is_featured ? "★ منتخب · " : ""}
          {formatNumber(product.view_count)} بازدید
        </span>
        <Link
          href={`/admin/products/${encodeURIComponent(product.slug)}`}
          className="rounded-lg bg-bondi-blue px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-bondi-blue-dark"
        >
          مشاهده / ویرایش
        </Link>
      </div>
    </article>
  );
}

function Cell({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-silver">{label}</dt>
      <dd className={"mt-0.5 truncate " + (strong ? "font-bold text-blue-slate" : "text-iron-grey")}>{value}</dd>
    </div>
  );
}
