import type { Metadata } from "next";
import { HomeContent } from "@/components/public/public-page-content";
import { loadPublicCatalogPage } from "@/lib/api/public-catalog";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");

export default async function Home({ searchParams }: PageProps<"/">) {
  const { page = "1" } = await searchParams;
  const requestedPage = typeof page === "string" && /^[1-9]\d*$/.test(page) ? page : "1";
  const result = await loadPublicCatalogPage("products/home", { page: requestedPage });
  return <HomeContent listing={result.data} error={result.error !== null} />;
}
