"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useBusinessPermissions } from "@/components/private/use-business-permissions";
import { useBusinessNameState } from "@/components/private/business-name-provider";

type Business = { public_id: string; name: string; primary_currency: string; status: string };

async function detail(response: Response) {
  try { return (await response.json() as { detail?: string }).detail ?? "Le service E-commerce est indisponible."; }
  catch { return "Le service E-commerce est indisponible."; }
}

export function BusinessList({ invitationOutcome }: { invitationOutcome?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Business[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    const response = await fetch("/api/private/businesses", { cache: "no-store" });
    if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
    if (!response.ok) return setError(await detail(response));
    setItems((await response.json() as { businesses: Business[] }).businesses);
  };

  useEffect(() => { void load(); }, []);

  if (error) return <section className="content-panel p-6" role="alert"><p>{error}</p><button className="button button-primary mt-4" onClick={() => void load()} type="button">Réessayer</button></section>;
  if (!items) return <p className="p-6 text-sm text-[var(--muted)]">Chargement des entreprises…</p>;

  const invitationNotice = invitationOutcome === "accepted"
    ? "Invitation acceptée. L’entreprise apparaît ci-dessous selon vos accès attribués."
    : invitationOutcome === "declined"
      ? "Invitation refusée."
      : null;

  return <main><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow">ENTREPRISES</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">Mes entreprises</h1></div><Link className="button button-primary" href="/espace/entreprises/nouvelle">Créer une entreprise</Link></div>{invitationNotice ? <p className="mt-4 rounded-md border p-3 text-sm" role="status">{invitationNotice}</p> : null}<section className="content-panel mt-6 p-6"><h2 className="font-semibold">Entreprises accessibles</h2>{items.length === 0 ? <div className="mt-3"><p className="text-sm text-[var(--muted)]">Vous n’avez accès à aucune entreprise pour le moment.</p><Link className="button button-outline mt-5" href="/espace/entreprises/nouvelle">Créer une entreprise</Link></div> : <ul className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((business) => <li className="rounded-md border p-4" key={business.public_id}><strong>{business.name}</strong><span className="mt-1 block text-sm text-[var(--muted)]">{business.status} · {business.primary_currency}</span><Link className="button button-outline mt-4" href={`/espace/entreprises/${business.public_id}`}>Entrer dans l’entreprise</Link></li>)}</ul>}</section></main>;
}

export function BusinessCreate() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = async (formData: FormData) => {
    if (saving) return;
    setSaving(true);
    const response = await fetch("/api/private/businesses", { method: "POST", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ name: formData.get("name"), primary_currency: formData.get("currency") }) });
    setSaving(false);
    if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
    if (!response.ok) return setError(await detail(response));
    router.push(`/espace/entreprises/${(await response.json() as { business: Business }).business.public_id}`);
  };

  return <main><Link className="nav-link text-sm" href="/espace/entreprises">← Mes entreprises</Link><h1 className="mt-3 text-3xl font-semibold text-[var(--brand-secondary)]">Créer une entreprise</h1><form action={create} className="content-panel mt-6 grid max-w-xl gap-4 p-6"><label>Nom<input className="mt-1 w-full rounded-md border px-3 py-2" name="name" required /></label><label>Devise principale<select className="mt-1 w-full rounded-md border px-3 py-2" defaultValue="CDF" name="currency"><option value="CDF">CDF</option><option value="USD">USD</option></select></label>{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<button className="button button-primary w-fit" disabled={saving} type="submit">{saving ? "Création…" : "Créer l’entreprise"}</button></form></main>;
}

const moduleLinks = [
  { label: "Produits", path: "produits", permissions: ["PRODUCT_VIEW", "PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE", "PRODUCT_DEACTIVATE", "PRODUCT_VARIANT_VIEW", "PRODUCT_VARIANT_CREATE", "PRODUCT_VARIANT_UPDATE"] },
  { label: "Stocks", path: "stocks", permissions: ["INVENTORY_VIEW", "INVENTORY_INITIALIZE", "INVENTORY_IN", "INVENTORY_OUT", "INVENTORY_ADJUST", "INVENTORY_MOVEMENT_VIEW"] },
  { label: "Achats", path: "achats", permissions: ["PURCHASE_VIEW", "PURCHASE_CREATE", "PURCHASE_UPDATE", "PURCHASE_CONFIRM", "PURCHASE_RECEIVE", "PURCHASE_CANCEL", "PURCHASE_LINE_VIEW", "PURCHASE_LINE_CREATE"] },
  { label: "Ventes", path: "ventes", permissions: ["SALE_VIEW", "SALE_CREATE", "SALE_UPDATE", "SALE_COMPLETE", "SALE_CANCEL", "SALE_LINE_VIEW", "SALE_LINE_CREATE", "SALE_RETURN", "SALE_RETURN_VIEW"] },
  { label: "Finance", path: "finance", permissions: ["FINANCIAL_SUMMARY_VIEW", "FINANCIAL_MOVEMENT_VIEW", "RECEIVABLE_VIEW", "RECEIVABLE_PAYMENT_CREATE", "SUPPLIER_PAYMENT_CREATE"] },
  { label: "Membres et accès", path: "membres", permissions: ["MEMBER_VIEW", "MEMBER_PERMISSION_VIEW", "INVITATION_VIEW", "INVITATION_CREATE", "MEMBER_UPDATE"] },
];

export function BusinessEditor({ businessId }: { businessId: string }) {
  const permissions = useBusinessPermissions(businessId);
  const businessState = useBusinessNameState();
  const business = businessState?.business ?? null;
  const error = businessState?.error ?? null;

  const links = permissions ? moduleLinks.filter((link) => link.permissions.some((permission) => permissions.includes(permission))) : [];
  return <main><Link className="nav-link text-sm" href="/espace">← Retour à mon espace</Link><p className="eyebrow mt-4">ESPACE ENTREPRISE</p><h1 className="mt-2 text-2xl font-semibold text-[var(--brand-secondary)] sm:text-3xl">{business ? business.name : "Tableau de bord entreprise"}</h1>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}<section className="content-panel mt-6 p-4 sm:p-6"><h2 className="font-semibold">Modules</h2>{permissions === null ? <p className="mt-4 text-sm text-[var(--muted)]">Chargement de vos accès…</p> : links.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{links.map((link) => <Link className="button button-outline w-full" href={`/espace/entreprises/${businessId}/${link.path}`} key={link.path}>{link.label}</Link>)}</div> : <p className="mt-4 text-sm text-[var(--muted)]">Aucun module n’est accessible avec vos permissions actuelles.</p>}</section></main>;
}
