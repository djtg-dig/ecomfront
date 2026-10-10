import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/public-header";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/fonctionnalites");

const capabilities = [
  {
    title: "Entreprises et équipes",
    description: "Création d'entreprises, gestion des membres et invitations documentées par l'API.",
  },
  {
    title: "Catalogue et stock",
    description: "Gestion des catégories, produits et mouvements de stock prévue par les ressources métier.",
  },
  {
    title: "Achats et ventes",
    description: "Suivi des opérations d'achat et de vente exposé par les capacités commerciales du backend.",
  },
  {
    title: "Finance et rapports",
    description: "Données financières et rapports préparés par les modules dédiés de l'application.",
  },
];

export default function FonctionnalitesPage() {
  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-semibold text-[var(--brand)]">FONCTIONNALITÉS</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          Capacités documentées de la plateforme
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Le portail présentera progressivement les capacités déjà documentées dans l&apos;API E-commerce.
        </p>
      </section>
      <section aria-labelledby="capabilities-title" className="border-y border-[var(--line)] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <h2 id="capabilities-title" className="text-2xl font-semibold">
            Périmètre fonctionnel
          </h2>
          <ul className="mt-8 grid gap-7 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <li key={capability.title} className="border-l-4 border-[var(--accent)] pl-5">
                <h3 className="text-lg font-semibold">{capability.title}</h3>
                <p className="mt-2 leading-7 text-[var(--muted)]">{capability.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
