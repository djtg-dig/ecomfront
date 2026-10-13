"use client";

import Link from "next/link";

export function PrivateDashboard() {
  return (
    <main>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">MON COMPTE</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">Bienvenue dans votre espace</h1>
        </div>
        <Link className="button button-primary" href="/espace/entreprises">Mes entreprises</Link>
      </div>
      <section className="content-panel mt-6 p-7"><h2 className="text-lg font-semibold">Gérez vos activités</h2><p className="mt-2 text-sm text-[var(--muted)]">Votre compte fonctionne indépendamment de vos entreprises. Créez une entreprise ou rejoignez-en une sur invitation.</p><Link className="button button-outline mt-5" href="/espace/entreprises">Voir mes entreprises</Link></section>
    </main>
  );
}
