import type { AttributeMap, AttributeSchemaEntry } from "@/types/product";
import { formatAttributeValue, humanizeKey } from "@/lib/format";

/**
 * Renders a product's dynamic `specifications` JSON as a clean spec table.
 * Uses the category `effective_schema` (when present) for human-friendly
 * labels and ordering. Palette: iron-grey text on silver-bordered rows.
 */
export function SpecificationsTable({
  specifications,
  schema,
}: {
  specifications: AttributeMap;
  schema?: Record<string, AttributeSchemaEntry>;
}) {
  const keys = Object.keys(specifications ?? {});
  if (keys.length === 0) return null;

  // Order by the schema definition first, then any extra keys.
  const orderedKeys = schema
    ? [
        ...Object.keys(schema).filter((k) => k in specifications),
        ...keys.filter((k) => !schema[k]),
      ]
    : keys;

  return (
    <section aria-labelledby="specs-heading" className="mt-10">
      <h2 id="specs-heading" className="mb-3 text-lg font-bold text-iron-grey">
        Specifications
      </h2>
      <div className="overflow-hidden rounded-xl border border-silver">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {orderedKeys.map((key, index) => {
              const label = schema?.[key]?.label || humanizeKey(key);
              return (
                <tr
                  key={key}
                  className={index % 2 === 0 ? "bg-dust-grey/50" : "bg-white"}
                >
                  <th
                    scope="row"
                    className="w-1/3 border-b border-silver px-4 py-3 text-left
                               font-semibold text-blue-slate"
                  >
                    {label}
                  </th>
                  <td className="border-b border-silver px-4 py-3 text-iron-grey">
                    {formatAttributeValue(specifications[key])}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
