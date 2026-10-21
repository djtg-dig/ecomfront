import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/seo/site";
import { InformationalPage } from "@/components/public/public-page-content";

export const metadata: Metadata = createPublicMetadata("/contact");

export default function ContactPage() { return <InformationalPage page="contact" />; }
