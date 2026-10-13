"use client";

import Link from "next/link";

import { usePrivateBusiness } from "@/components/private/private-business-context";

export function PrivateDashboard() {
  const { state, reload } = usePrivateBusiness();

  if (state.kind === "loading") {
    return <div className="grid min-h-64 place-items-center p-6" aria-live="polite"><p className="text-sm text-[var(--muted)]">Chargement de votre espace…</p></div>;
  }
  if (state.kind === "error") {
    const title = state.status === 403 ? "Accès non autorisé" : "Espace temporairement indisponible";
    return <div className="grid min-h-64 place-items-center p-6"><section className="content-panel w-full max-w-md p-8" role="alert"><h1 className="text-xl font-semibold text-[var(--brand-secondary)]">{title}</h1><p className="mt-3 text-sm text-[var(--muted)]">{state.detail}</p>{state.status === 503 && <button className="button button-primary mt-6" onClick={() => void reload()} type="button">Réessayer</button>}</section></div>;
  }

  const { businesses, selectedBusinessId } = state.overview;
  const selectedBusiness = businesses.find((business) => business.public_id === selectedBusinessId) ?? null;
  return (
    <main>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">ESPACE PRIVÉ</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">Tableau de bord</h1>
        </div>
        <Link className="button button-outline" href="/espace/entreprises">Gérer les entreprises</Link>
      </div>
      {businesses.length === 0 ? <section className="content-panel mt-6 p-7"><h2 className="text-lg font-semibold">Aucune entreprise accessible</h2><p className="mt-2 text-sm text-[var(--muted)]">Vous n’avez pas encore accès à une entreprise E-commerce. Demandez une invitation à son administrateur.</p><Link className="button button-outline mt-5" href="/espace/entreprises">Voir les entreprises</Link></section> : selectedBusiness ? <><section className="content-panel mt-6 p-7"><p className="eyebrow">ENTREPRISE ACTIVE</p><h2 className="mt-2 text-xl font-semibold text-[var(--brand-secondary)]">{selectedBusiness.name}</h2><p className="mt-2 text-sm text-[var(--muted)]">{selectedBusiness.status} · Devise principale : {selectedBusiness.primary_currency}. Les droits de chaque action restent vérifiés côté serveur.</p><Link className="button button-outline mt-5" href={`/espace/entreprises/${selectedBusiness.public_id}`}>Voir l’entreprise</Link></section><section className="content-panel mt-6 p-6" role="status"><h2 className="text-xl font-semibold text-[var(--brand-secondary)]">Permissions des modules indisponibles</h2><p className="mt-2 text-sm text-[var(--muted)]">Le backend ne fournit pas encore les permissions effectives de votre compte pour cette entreprise. Aucun module n’est affiché tant que ces droits ne sont pas confirmés.</p></section></> : <section className="content-panel mt-6 p-7"><h2 className="text-lg font-semibold">Choisissez une entreprise</h2><p className="mt-2 text-sm text-[var(--muted)]">Le changement d’entreprise est disponible dans les paramètres avancés.</p><Link className="button button-primary mt-5" href="/espace/parametres">Ouvrir les paramètres</Link></section>}
    </main>
  );
}
