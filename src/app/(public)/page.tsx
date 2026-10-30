import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { HomeContent } from "@/components/public/public-page-content";
import { PublicCatalogFallback } from "@/components/public/public-catalog-fallback";
import { loadPublicCatalogPage } from "@/lib/api/public-catalog";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");
type HomeProps = Pick<PageProps<"/">, "searchParams">;

export default function Home({ searchParams }: HomeProps) {
  return <Suspense fallback={<PublicCatalogFallback />}><HomeCatalog searchParams={searchParams} /></Suspense>;
}

async function HomeCatalog({ searchParams }: HomeProps) {
  // The HMAC nonce and timestamp must be created for an actual HTTP request.
  await connection();
  const { page = "1" } = await searchParams;
  const requestedPage = typeof page === "string" && /^[1-9]\d*$/.test(page) ? page : "1";
  const result = await loadPublicCatalogPage("products/home", { page: requestedPage });
  return <HomeContent listing={result.data} error={result.error !== null} />;
}
