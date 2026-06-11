import type { MetadataRoute } from "next";

import { toAbsoluteUrl } from "@/lib/seo";
import { getProducts } from "@/services/catalogService";
import type { ProductListItem } from "@/types/catalog";

const MAX_PRODUCT_PAGES = 50;

async function getPublishedProducts(): Promise<ProductListItem[]> {
  const products = new Map<string, ProductListItem>();

  for (let page = 1; page <= MAX_PRODUCT_PAGES; page += 1) {
    const response = await getProducts({ page });

    for (const product of response.results) {
      if (product.status === "PUBLISHED") {
        products.set(product.slug, product);
      }
    }

    if (!response.next) break;
  }

  return Array.from(products.values());
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: toAbsoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: toAbsoluteUrl("/products"),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  try {
    const products = await getPublishedProducts();
    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
      url: toAbsoluteUrl(`/product/${encodeURIComponent(product.slug)}`),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...productRoutes];
  } catch (error) {
    console.error("Failed to load products for sitemap:", error);
    return staticRoutes;
  }
}
