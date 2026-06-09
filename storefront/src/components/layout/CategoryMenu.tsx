"use client";

/**
 * نوار دسته‌بندی‌ها + منوی بزرگ «همه دسته‌ها» (به سبک بازارگاه).
 *
 * درخت دسته‌ها از بک‌اند کاتالوگ خوانده می‌شود. تا پیش از آماده‌شدن API کاتالوگ،
 * این مؤلفه به‌صورت ایمن تخریب می‌شود: فقط دکمه‌ی «همه دسته‌ها» با پیوند به
 * فهرست محصولات نمایش داده می‌شود (بدون داده‌ی ساختگی).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { getCategoryTree } from "@/services/productService";
import type { CategoryTreeNode } from "@/types/product";
import { cn } from "@/lib/cn";

export function CategoryMenu() {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCategoryTree()
      .then((nodes) => {
        if (!cancelled) setTree(nodes);
      })
      .catch(() => {
        /* catalog API not ready yet — degrade gracefully */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  const topLevel = tree.slice(0, 8);

  return (
    <nav
      aria-label="دسته‌بندی محصولات"
      className="border-b border-silver bg-white"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">
        {/* دکمه‌ی همه دسته‌ها + منوی بزرگ */}
        <div
          className="relative"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex items-center gap-2 py-3 text-sm font-bold text-iron-grey hover:text-bondi-blue"
          >
            <MenuIcon className="h-5 w-5" />
            همه دسته‌ها
          </button>

          {open && (
            <div
              className="absolute right-0 top-full z-40 w-64 rounded-xl border border-silver bg-white p-2 shadow-card"
              onMouseEnter={openMenu}
              onMouseLeave={scheduleClose}
            >
              {tree.length === 0 ? (
                <Link
                  href="/products"
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-blue-slate hover:bg-dust-grey hover:text-bondi-blue"
                >
                  مشاهده‌ی همه‌ی محصولات ←
                </Link>
              ) : (
                <ul className="max-h-96 overflow-y-auto">
                  {tree.map((node) => (
                    <li key={node.id}>
                      <Link
                        href={`/products?category=${encodeURIComponent(node.slug)}`}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-iron-grey hover:bg-dust-grey hover:text-bondi-blue"
                      >
                        {node.name_fa ?? node.name ?? node.slug}
                        {node.children?.length ? (
                          <span className="text-xs text-silver">
                            {node.children.length} زیردسته
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* میان‌برهای دسته‌های اصلی (دسکتاپ) */}
        <ul className="hidden items-center gap-1 lg:flex">
          {topLevel.map((node) => (
            <li key={node.id}>
              <Link
                href={`/products?category=${encodeURIComponent(node.slug)}`}
                className={cn(
                  "rounded-lg px-3 py-3 text-sm font-medium text-blue-slate hover:text-bondi-blue",
                )}
              >
                {node.name_fa ?? node.name ?? node.slug}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/products"
              className="rounded-lg px-3 py-3 text-sm font-bold text-discount hover:opacity-80"
            >
              تخفیف‌های ویژه
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
