import Link from "next/link";
import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/public-header";
import { createPublicMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPublicMetadata("/");

export default function Home() {
  return (
    <main className="page-shell">
      <PublicHeader />

      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl content-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">GESTION COMMERCIALE</p>
          <h1 className="text-4xl font-semibold leading-tight text-[var(--brand-secondary)] sm:text-5xl">
            Gestion commerciale E-commerce
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
            Le portail prépare l&apos;accès aux capacités documentées de gestion des entreprises, des équipes et des opérations commerciales.
          </p>
          <Link className="button button-outline mt-8" href="/fonctionnalites">
            Découvrir les fonctionnalités
          </Link>
          <a className="button button-primary ml-0 mt-3 sm:ml-3" href="/api/auth/carri/login">
            Se connecter avec Carri Account
          </a>
        </div>

        <aside className="content-panel accent-rule border-l-4 p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-[var(--brand-secondary)]">Un accès pensé pour les équipes</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Les espaces Entreprises, invitations et administration seront connectés
            progressivement via le serveur applicatif.
          </p>
        </aside>
      </section>
    </main>
  );
}
