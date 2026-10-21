import Link from "next/link";
import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo/site";
import { NotFoundContent } from "@/components/i18n/feedback-pages";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: noIndexRobots,
};

export default function NotFound() { return <NotFoundContent />; }
