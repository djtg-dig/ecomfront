"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { usePrivateBusiness } from "@/components/private/private-business-context";

export function PrivateSettings() {
  const router = useRouter();
  const { state, selecting, selectionError, selectBusiness } = usePrivateBusiness();
  const [changingBusiness, setChangingBusiness] = useState(false);

  if (state.kind === "loading") return <main aria-live="polite"><p className="text-sm text-[var(--muted)]">Chargement des paramètres…</p></main>;
  if (state.kind === "error") return <main><section className="content-panel p-6" role="alert"><h1 className="text-xl font-semibold">Paramètres indisponibles</h1><p className="mt-3 text-sm text-[var(--muted)]">{state.detail}</p></section></main>;

  const { businesses, selectedBusinessId } = state.overview;
  const selectedBusiness = businesses.find((business) => business.public_id === selectedBusinessId) ?? null;

  async function chooseBusiness(businessId: string) {
    if (await selectBusiness(businessId)) router.replace("/espace");
  }

  return <main><p className="eyebrow">PARAMÈTRES</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">Paramètres de l’espace</h1><section className="content-panel mt-6 p-6"><p className="eyebrow">ENTREPRISE</p><h2 className="mt-2 text-xl font-semibold">Membres et permissions</h2><p className="mt-3 text-sm text-[var(--muted)]">La gestion des membres sera disponible ici dès que le backend exposera les permissions effectives du compte courant. Aucun accès n’est affiché sans cette confirmation.</p></section><section className="content-panel mt-6 p-6"><p className="eyebrow">ENTREPRISE</p><h2 className="mt-2 text-xl font-semibold">Paramètres avancés</h2><p className="mt-3 text-sm text-[var(--muted)]">Entreprise active : <strong className="text-[var(--ink)]">{selectedBusiness?.name ?? "Aucune entreprise sélectionnée"}</strong></p>{!changingBusiness ? <button className="button button-outline mt-5" disabled={businesses.length === 0} onClick={() => setChangingBusiness(true)} type="button">{selectedBusiness ? "Changer d’entreprise" : "Choisir une entreprise"}</button> : <div className="mt-6 border-t pt-5"><h3 className="font-semibold">Changer d’entreprise</h3><p className="mt-2 text-sm text-[var(--muted)]">Choisissez uniquement parmi les entreprises auxquelles vous avez accès. Vous serez redirigé vers le tableau de bord.</p>{selectionError ? <p className="mt-3 text-sm text-[var(--error)]" role="alert">{selectionError}</p> : null}{businesses.length ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">{businesses.map((business) => <li key={business.public_id}><button className={`w-full rounded-md border p-4 text-left ${business.public_id === selectedBusinessId ? "border-[var(--brand)] bg-blue-50" : "bg-white hover:border-[var(--brand)]"}`} disabled={selecting || business.public_id === selectedBusinessId} onClick={() => void chooseBusiness(business.public_id)} type="button"><span className="block font-semibold">{business.name}</span><span className="mt-1 block text-sm text-[var(--muted)]">{business.status} · {business.primary_currency}</span></button></li>)}</ul> : <p className="mt-4 text-sm text-[var(--muted)]">Aucune entreprise accessible.</p>}</div>}</section></main>;
}
