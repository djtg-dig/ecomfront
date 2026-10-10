import type { MetadataRoute } from "next";
import { absoluteUrl, isPublicIndexingEnabled, publicPages } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isPublicIndexingEnabled()) {
    return [];
  }

  return publicPages.map((page) => ({ url: absoluteUrl(page.path) }));
}
