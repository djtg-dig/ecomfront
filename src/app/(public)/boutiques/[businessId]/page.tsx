import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { MarketplaceResults } from "@/components/public/marketplace";
import { PublicCatalogFallback } from "@/components/public/public-catalog-fallback";
import { loadPublicCatalogPage } from "@/lib/api/public-catalog";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");

export default function BusinessPage({ params, searchParams }: PageProps<"/boutiques/[businessId]">) {
  return <Suspense fallback={<PublicCatalogFallback />}><BusinessCatalog params={params} searchParams={searchParams} /></Suspense>;
}

async function BusinessCatalog({ params, searchParams }: PageProps<"/boutiques/[businessId]">) {
  await connection();
  const { businessId } = await params;
  const { page = "1" } = await searchParams;
  const requestedPage = typeof page === "string" && /^[1-9]\d*$/.test(page) ? page : "1";
  const result = await loadPublicCatalogPage(`businesses/${encodeURIComponent(businessId)}`, { page: requestedPage });
  return <MarketplaceResults initialListing={result.data} initialError={result.error !== null} title="Boutique" />;
}
