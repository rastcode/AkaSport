import type { AttributeMap } from "@/types/catalog";

/**
 * جدول مشخصات فنی محصول (RTL / فارسی).
 * مقادیر JSON را به‌صورت جدول کلید/مقدار نشان می‌دهد. در نبود مشخصات، پیام فارسی.
 */
export function ProductSpecifications({
  specifications,
}: {
  specifications: AttributeMap;
}) {
  const entries = Object.entries(specifications ?? {});

  return (
    <section dir="rtl" aria-labelledby="specs-heading" className="mt-10">
      <h2 id="specs-heading" className="mb-3 text-lg font-bold text-iron-grey">
        مشخصات فنی
      </h2>

      {entries.length === 0 ? (
        <p className="rounded-xl border border-silver/60 bg-brand-light/60 p-5 text-sm text-blue-slate">
          مشخصاتی برای این محصول ثبت نشده است.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-silver/60">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {entries.map(([key, value], index) => (
                <tr
                  key={key}
                  className={index % 2 === 0 ? "bg-brand-light/50" : "bg-white"}
                >
                  <th
                    scope="row"
                    className="w-2/5 px-4 py-3.5 text-right font-semibold text-blue-slate sm:w-1/3"
                  >
                    {key}
                  </th>
                  <td className="px-4 py-3.5 leading-6 text-iron-grey">
                    {formatValue(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "دارد" : "ندارد";
  return String(value);
}
