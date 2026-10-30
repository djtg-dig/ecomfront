import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { MarketplaceResults } from "@/components/public/marketplace";
import { PublicCatalogFallback } from "@/components/public/public-catalog-fallback";
import { loadPublicCatalogPage } from "@/lib/api/public-catalog";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");
type SearchPageProps = Pick<PageProps<"/recherche">, "searchParams">;

export default function SearchPage({ searchParams }: SearchPageProps) {
  return <Suspense fallback={<PublicCatalogFallback />}><SearchCatalog searchParams={searchParams} /></Suspense>;
}

async function SearchCatalog({ searchParams }: SearchPageProps) {
  await connection();
  const { q = "", page = "1" } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const requestedPage = typeof page === "string" && /^[1-9]\d*$/.test(page) ? page : "1";
  const result = await loadPublicCatalogPage("products/search", { q: query, page: requestedPage });
  return <MarketplaceResults initialListing={result.data} initialError={result.error !== null} title={query ? `Résultats pour « ${query} »` : "Rechercher dans le catalogue"} />;
}
