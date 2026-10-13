import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/tarifs");

export default function TarifsPage() {
  return (
    <section className="site-container py-16 sm:py-20">
        <p className="eyebrow">TARIFS</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-[var(--brand-secondary)] sm:text-5xl">Tarifs</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Aucune grille tarifaire validée n&apos;est disponible à ce jour. Cette page sera complétée lorsque les informations métier auront été confirmées.
        </p>
    </section>
  );
}
