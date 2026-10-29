import type { Metadata } from "next";
import { MarketplaceResults } from "@/components/public/marketplace";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");

export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  return <MarketplaceResults endpoint={`categories/${encodeURIComponent(slug)}/`} title="Produits de cette catégorie" />;
}
