import type { Metadata } from "next";
import { MarketplaceResults } from "@/components/public/marketplace";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");

export default async function SearchPage({ searchParams }: PageProps<"/recherche">) {
  const { q = "" } = await searchParams;
  const query = typeof q === "string" ? q : "";
  return <MarketplaceResults endpoint={`products/search/?q=${encodeURIComponent(query)}`} title={query ? `Résultats pour « ${query} »` : "Rechercher dans le catalogue"} />;
}
