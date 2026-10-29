import type { Metadata } from "next";
import { MarketplaceResults } from "@/components/public/marketplace";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");

export default async function BusinessPage({ params }: PageProps<"/boutiques/[businessId]">) {
  const { businessId } = await params;
  return <MarketplaceResults endpoint={`businesses/${encodeURIComponent(businessId)}/`} title="Boutique" />;
}
