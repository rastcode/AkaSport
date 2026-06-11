/**
 * تایپ‌های پیشنهادهای جست‌وجو (autocomplete) — متناظر با SearchSuggestionsView.
 * محصولات به‌صورت کارت محصول، دسته‌ها و برندها به‌صورت کامل برمی‌گردند.
 */

import type { Brand, Category, ProductListItem } from "@/types/catalog";

export interface SearchSuggestions {
  products: ProductListItem[];
  categories: Category[];
  brands: Brand[];
}
