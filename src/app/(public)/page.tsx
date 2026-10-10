import Link from "next/link";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/public-header";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--ink)]">
      <PublicHeader />

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl content-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold text-[var(--brand)]">GESTION COMMERCIALE</p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Gestion commerciale E-commerce
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Le portail prépare l&apos;accès aux capacités documentées de gestion des entreprises, des équipes et des opérations commerciales.
          </p>
          <Link className="mt-8 inline-flex h-11 items-center justify-center border border-[var(--brand)] px-5 text-sm font-semibold text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white" href="/fonctionnalites">
            Découvrir les fonctionnalités
          </Link>
          <button
            className="ml-0 mt-3 inline-flex h-11 items-center justify-center bg-[var(--brand)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55 sm:ml-3"
            disabled
            type="button"
          >
            Se connecter avec Carri Account
          </button>
          <p className="mt-3 text-sm text-[var(--muted)]">
            La connexion sécurisée sera disponible à la prochaine étape.
          </p>
        </div>

        <aside className="border-l-4 border-[var(--accent)] bg-white p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Un accès pensé pour les équipes</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Les espaces Entreprises, invitations et administration seront connectés
            progressivement via le serveur applicatif.
          </p>
        </aside>
      </section>
    </main>
  );
}
