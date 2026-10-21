import type { Metadata } from "next";
import { HomeContent } from "@/components/public/public-page-content";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");

export default function Home() { return <HomeContent />; }
