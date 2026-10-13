"use client";

import Link from "next/link";

import { usePrivateBusiness } from "@/components/private/private-business-context";

const modules = [
  { segment: "membres", title: "Membres", description: "Gérez les accès, rôles et invitations." },
  { segment: "produits", title: "Produits", description: "Consultez et organisez le catalogue." },
  { segment: "stocks", title: "Stocks", description: "Suivez les quantités et les mouvements." },
  { segment: "achats", title: "Achats", description: "Pilotez les fournisseurs et approvisionnements." },
  { segment: "ventes", title: "Ventes", description: "Créez et consultez les ventes." },
];

export function PrivateDashboard() {
  const { state, reload, selectBusiness } = usePrivateBusiness();

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
      {businesses.length === 0 ? <section className="content-panel mt-6 p-7"><h2 className="text-lg font-semibold">Aucune entreprise accessible</h2><p className="mt-2 text-sm text-[var(--muted)]">Vous n’avez pas encore accès à une entreprise E-commerce. Demandez une invitation à son administrateur.</p><Link className="button button-outline mt-5" href="/espace/entreprises">Voir les entreprises</Link></section> : selectedBusiness ? <><section className="content-panel mt-6 p-7"><p className="eyebrow">ENTREPRISE ACTIVE</p><h2 className="mt-2 text-xl font-semibold text-[var(--brand-secondary)]">{selectedBusiness.name}</h2><p className="mt-2 text-sm text-[var(--muted)]">{selectedBusiness.status} · Devise principale : {selectedBusiness.primary_currency}. Les droits de chaque action restent vérifiés côté serveur.</p><Link className="button button-outline mt-5" href={`/espace/entreprises/${selectedBusiness.public_id}`}>Voir l’entreprise</Link></section><section className="mt-6"><h2 className="text-xl font-semibold text-[var(--brand-secondary)]">Modules disponibles</h2><p className="mt-2 text-sm text-[var(--muted)]">Accès direct aux fonctionnalités de {selectedBusiness.name}.</p><ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{modules.map((module) => <li className="content-panel p-5" key={module.segment}><h3 className="font-semibold">{module.title}</h3><p className="mt-2 min-h-10 text-sm text-[var(--muted)]">{module.description}</p><Link className="nav-link mt-4 inline-block text-sm font-semibold" href={`/espace/entreprises/${selectedBusiness.public_id}/${module.segment}`}>Ouvrir {module.title.toLowerCase()} →</Link></li>)}</ul></section></> : <section className="content-panel mt-6 p-7"><h2 className="text-lg font-semibold">Choisissez une entreprise</h2><p className="mt-2 text-sm text-[var(--muted)]">Utilisez le sélecteur dans la navigation pour afficher les modules de l’entreprise concernée.</p><ul className="mt-5 grid gap-3 sm:grid-cols-2">{businesses.map((business) => <li key={business.public_id}><button className="w-full rounded-md border bg-white p-4 text-left hover:border-[var(--brand)]" onClick={() => void selectBusiness(business.public_id)} type="button"><span className="block font-semibold">{business.name}</span><span className="mt-1 block text-sm text-[var(--muted)]">{business.status} · {business.primary_currency}</span></button></li>)}</ul></section>}
    </main>
  );
}
