import type { Metadata } from "next";
import { MarketplaceResults } from "@/components/public/marketplace";
import { loadPublicCatalogPage } from "@/lib/api/public-catalog";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");

export default async function BusinessPage({ params, searchParams }: PageProps<"/boutiques/[businessId]">) {
  const { businessId } = await params;
  const { page = "1" } = await searchParams;
  const requestedPage = typeof page === "string" && /^[1-9]\d*$/.test(page) ? page : "1";
  const result = await loadPublicCatalogPage(`businesses/${encodeURIComponent(businessId)}`, { page: requestedPage });
  return <MarketplaceResults initialListing={result.data} initialError={result.error !== null} title="Boutique" />;
}
