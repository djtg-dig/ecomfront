import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/seo/site";
import { FeaturesContent } from "@/components/public/public-page-content";

export const metadata: Metadata = createPublicMetadata("/fonctionnalites");

export default function FonctionnalitesPage() { return <FeaturesContent />; }
