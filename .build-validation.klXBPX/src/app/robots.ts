import type { MetadataRoute } from "next";
import { absoluteUrl, isPublicIndexingEnabled } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  if (!isPublicIndexingEnabled()) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap: absoluteUrl("/sitemap.xml"),
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/connexion/", "/api/", "/auth/callback/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
