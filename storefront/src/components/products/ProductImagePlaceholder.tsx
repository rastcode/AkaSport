/**
 * جانمای تصویر محصول (placeholder) — مشترک بین کارت محصول و گالری جزئیات.
 *
 * در نبود تصویرِ واقعی، یک باکس برندشده‌ی ظریف با وردمارک «آکا» و متن «بدون تصویر»
 * نشان می‌دهد. هیچ داده‌ی ساختگی نیست؛ فقط ظاهر. (RTL / فارسی)
 */
export function ProductImagePlaceholder({
  size = "card",
}: {
  size?: "card" | "detail" | "thumbnail";
}) {
  // اندازه‌ی thumbnail (مثل سبد خرید) فقط وردمارک کوچک را نشان می‌دهد.
  if (size === "thumbnail") {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-brand-light"
        aria-hidden
      >
        <span className="text-sm font-black tracking-tight text-brand-accent/30">آکا</span>
      </div>
    );
  }

  const isDetail = size === "detail";
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-brand-light"
      aria-hidden
    >
      <span
        className={
          "font-black tracking-tight text-brand-accent/25 " +
          (isDetail ? "text-5xl" : "text-2xl")
        }
      >
        آکا
      </span>
      <span
        className={
          "font-medium text-brand-muted " + (isDetail ? "text-sm" : "text-[11px]")
        }
      >
        بدون تصویر
      </span>
    </div>
  );
}
