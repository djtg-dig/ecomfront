import type { Metadata } from "next";
import { MarketplaceResults } from "@/components/public/marketplace";
import { loadPublicCatalogPage } from "@/lib/api/public-catalog";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");

export default async function SearchPage({ searchParams }: PageProps<"/recherche">) {
  const { q = "", page = "1" } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const requestedPage = typeof page === "string" && /^[1-9]\d*$/.test(page) ? page : "1";
  const result = await loadPublicCatalogPage("products/search", { q: query, page: requestedPage });
  return <MarketplaceResults initialListing={result.data} initialError={result.error !== null} title={query ? `Résultats pour « ${query} »` : "Rechercher dans le catalogue"} />;
}
