"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Business = { public_id: string; name: string; status: string; primary_currency: string };
type Overview = {
  identity: { id: string; carri_subject: string };
  businesses: Business[];
  selectedBusinessId: string | null;
};
type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; overview: Overview }
  | { kind: "error"; status: 403 | 503; detail: string };

async function apiError(response: Response): Promise<{ code?: string; detail?: string }> {
  try {
    return await response.json() as { code?: string; detail?: string };
  } catch {
    return {};
  }
}

export function PrivateDashboard() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [selecting, setSelecting] = useState(false);

  async function load() {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/private/overview", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) {
        router.replace("/connexion?erreur=session_expired");
        return;
      }
      if (!response.ok) {
        const error = await apiError(response);
        setState({
          kind: "error",
          status: response.status === 403 ? 403 : 503,
          detail: error.detail ?? "Le service E-commerce est temporairement indisponible.",
        });
        return;
      }
      setState({ kind: "ready", overview: await response.json() as Overview });
    } catch {
      setState({ kind: "error", status: 503, detail: "Le service E-commerce est temporairement indisponible." });
    }
  }

  useEffect(() => { void load(); }, []);

  async function selectBusiness(businessId: string) {
    if (state.kind !== "ready" || !businessId || businessId === state.overview.selectedBusinessId) return;
    setSelecting(true);
    try {
      const response = await fetch("/api/private/business-selection", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "x-csrf-protection": "1" },
        body: JSON.stringify({ businessId }),
      });
      if (response.status === 401) {
        router.replace("/connexion?erreur=session_expired");
        return;
      }
      if (!response.ok) {
        const error = await apiError(response);
        setState({ kind: "error", status: response.status === 403 ? 403 : 503, detail: error.detail ?? "La sélection n’a pas pu être enregistrée." });
        return;
      }
      setState({ kind: "ready", overview: { ...state.overview, selectedBusinessId: businessId } });
    } catch {
      setState({ kind: "error", status: 503, detail: "La sélection n’a pas pu être enregistrée." });
    } finally {
      setSelecting(false);
    }
  }

  if (state.kind === "loading") {
    return <div className="grid min-h-64 place-items-center p-6" aria-live="polite"><p className="text-sm text-[var(--muted)]">Chargement de votre espace…</p></div>;
  }
  if (state.kind === "error") {
    const title = state.status === 403 ? "Accès non autorisé" : "Espace temporairement indisponible";
    return <div className="grid min-h-64 place-items-center p-6"><section className="content-panel w-full max-w-md p-8" role="alert"><h1 className="text-xl font-semibold text-[var(--brand-secondary)]">{title}</h1><p className="mt-3 text-sm text-[var(--muted)]">{state.detail}</p>{state.status === 503 && <button className="button button-primary mt-6" onClick={() => void load()} type="button">Réessayer</button>}</section></div>;
  }

  const { businesses, selectedBusinessId } = state.overview;
  const selectedBusiness = businesses.find((business) => business.public_id === selectedBusinessId) ?? null;
  return (
    <main>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">ESPACE PRIVÉ</p>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">Bienvenue</h1>
        </div>
        <div>
          <label className="sr-only" htmlFor="business-selector">Entreprise active</label>
          <select id="business-selector" className="rounded-md border bg-white px-3 py-2 text-sm" disabled={selecting || businesses.length === 0} onChange={(event) => void selectBusiness(event.target.value)} value={selectedBusinessId ?? ""}>
            <option value="">{businesses.length ? "Choisir une entreprise" : "Aucune entreprise"}</option>
            {businesses.map((business) => <option key={business.public_id} value={business.public_id}>{business.name}</option>)}
          </select>
        </div>
      </div>
      {businesses.length === 0 ? <section className="content-panel mt-6 p-7"><h2 className="text-lg font-semibold">Aucune entreprise accessible</h2><p className="mt-2 text-sm text-[var(--muted)]">Vous n’avez pas encore accès à une entreprise E-commerce. Demandez une invitation à son administrateur.</p></section> : <section className="content-panel mt-6 p-7"><h2 className="text-lg font-semibold">Entreprises accessibles</h2><p className="mt-2 text-sm text-[var(--muted)]">Sélectionnez une entreprise pour poursuivre. Vos droits sont toujours vérifiés par le backend.</p><ul className="mt-5 grid gap-3 sm:grid-cols-2">{businesses.map((business) => <li key={business.public_id}><button className={`w-full rounded-md border p-4 text-left ${selectedBusiness?.public_id === business.public_id ? "border-[var(--brand)] bg-blue-50" : "bg-white"}`} onClick={() => void selectBusiness(business.public_id)} type="button"><span className="block font-semibold">{business.name}</span><span className="mt-1 block text-sm text-[var(--muted)]">{business.status} · {business.primary_currency}</span></button></li>)}</ul></section>}
    </main>
  );
}
