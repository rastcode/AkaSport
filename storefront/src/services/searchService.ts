/**
 * لایه‌ی سرویس جست‌وجو — متصل به endpoint عمومیِ پیشنهادها.
 */

import api from "@/lib/api";
import type { SearchSuggestions } from "@/types/search";

/** دریافت پیشنهادهای زنده برای autocomplete (محصول/دسته/برند). */
export async function getSearchSuggestions(
  q: string,
): Promise<SearchSuggestions> {
  const { data } = await api.get<SearchSuggestions>(
    "/catalog/search/suggestions/",
    { params: { q } },
  );
  return data;
}
