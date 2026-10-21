import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/seo/site";
import { InformationalPage } from "@/components/public/public-page-content";

export const metadata: Metadata = createPublicMetadata("/tarifs");

export default function TarifsPage() { return <InformationalPage page="pricing" />; }
