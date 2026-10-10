import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/public-header";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/tarifs");

export default function TarifsPage() {
  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-semibold text-[var(--brand)]">TARIFS</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Tarifs</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Aucune grille tarifaire validée n&apos;est disponible à ce jour. Cette page sera complétée lorsque les informations métier auront été confirmées.
        </p>
      </section>
    </main>
  );
}
