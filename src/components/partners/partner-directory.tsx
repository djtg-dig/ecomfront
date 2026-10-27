"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { useBusinessPermissions } from "@/components/private/use-business-permissions";
import { Modal } from "@/components/ui/modal";

type Kind = "customer" | "supplier";
type Partner = { public_id: string; name: string; phone: string; email: string; address: string; notes: string; is_active: boolean; created_at: string; updated_at: string };
type Pagination = { count: number; next: string | null; previous: string | null };
type Operation = { public_id: string; reference: string; status: string; currency: string; total: string; payment_status: string; created_at: string; completed_at?: string | null; confirmed_at?: string | null; received_at?: string | null; paid_amount?: string; balance?: string };
type OperationPage = Pagination & { results: Operation[] };
type Profile = { customer?: Partner; supplier?: Partner; sales?: OperationPage | null; purchases?: OperationPage | null; financial_summary: Record<string, string | number> | null; capabilities: Record<string, boolean> };

const config = {
  customer: { singular: "client", plural: "Clients", endpoint: "customers", permission: "CUSTOMER_UPDATE", createPermission: "CUSTOMER_CREATE", history: "sales" as const },
  supplier: { singular: "fournisseur", plural: "Fournisseurs", endpoint: "suppliers", permission: "SUPPLIER_UPDATE", createPermission: "SUPPLIER_CREATE", history: "purchases" as const },
};

async function responseMessage(response: Response) {
  const data = await response.json().catch(() => null) as { detail?: string } | null;
  return data?.detail || "L’opération n’a pas pu être effectuée.";
}

function PartnerForm({ businessId, kind, partner, onSaved }: { businessId: string; kind: Kind; partner?: Partner; onSaved: (value: Partner) => void }) {
  const router = useRouter();
  const [values, setValues] = useState({ name: partner?.name ?? "", phone: partner?.phone ?? "", email: partner?.email ?? "", address: partner?.address ?? "", notes: partner?.notes ?? "", is_active: partner?.is_active ?? true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (saving) return;
    setSaving(true); setError(null);
    const base = `/api/private/businesses/${businessId}/${config[kind].endpoint}`;
    try {
      const response = await fetch(partner ? `${base}/${partner.public_id}` : base, { method: partner ? "PATCH" : "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify(values) });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await responseMessage(response));
      const data = await response.json() as { customer?: Partner; supplier?: Partner };
      onSaved((data.customer ?? data.supplier) as Partner);
    } catch { setError("Le répertoire commercial est temporairement indisponible."); }
    finally { setSaving(false); }
  }
  const update = (field: keyof typeof values, value: string | boolean) => setValues((current) => ({ ...current, [field]: value }));
  return <form aria-busy={saving} className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    {error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}
    <label>Nom<input className="mt-1 w-full rounded border p-2" maxLength={200} onChange={(event) => update("name", event.target.value)} required value={values.name} /></label>
    <label>Téléphone<input className="mt-1 w-full rounded border p-2" maxLength={40} onChange={(event) => update("phone", event.target.value)} value={values.phone} /></label>
    <label>E-mail<input className="mt-1 w-full rounded border p-2" onChange={(event) => update("email", event.target.value)} type="email" value={values.email} /></label>
    <label>Adresse<textarea className="mt-1 w-full rounded border p-2" onChange={(event) => update("address", event.target.value)} value={values.address} /></label>
    <label>Notes<textarea className="mt-1 w-full rounded border p-2" onChange={(event) => update("notes", event.target.value)} value={values.notes} /></label>
    {partner ? <label className="flex items-center gap-2"><input checked={values.is_active} onChange={(event) => update("is_active", event.target.checked)} type="checkbox" />Partenaire actif</label> : null}
    <button className="button button-primary w-fit" disabled={saving} type="submit">{saving ? "Enregistrement…" : partner ? "Enregistrer" : `Ajouter le ${config[kind].singular}`}</button>
  </form>;
}

function Pager({ page, setPage, hasNext, hasPrevious }: { page: number; setPage: (page: number) => void; hasNext: boolean; hasPrevious: boolean }) {
  return <div className="mt-4 flex items-center justify-between gap-3"><button className="button button-outline" disabled={!hasPrevious} onClick={() => setPage(page - 1)} type="button">Précédent</button><span className="text-sm">Page {page}</span><button className="button button-outline" disabled={!hasNext} onClick={() => setPage(page + 1)} type="button">Suivant</button></div>;
}

function PartnerSection({ businessId, kind, canManage, canCreate }: { businessId: string; kind: Kind; canManage: boolean; canCreate: boolean }) {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[] | null>(null); const [pagination, setPagination] = useState<Pagination | null>(null);
  const [query, setQuery] = useState(""); const [ordering, setOrdering] = useState("name"); const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false); const [editing, setEditing] = useState<Partner | null>(null); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  async function load() {
    setError(null); const params = new URLSearchParams({ page: String(page), ordering }); if (query.trim()) params.set("q", query.trim());
    try { const response = await fetch(`/api/private/businesses/${businessId}/${config[kind].endpoint}?${params}`, { credentials: "same-origin", cache: "no-store" }); if (response.status === 401) return router.replace("/connexion?erreur=session_expired"); if (!response.ok) return setError(await responseMessage(response)); const data = await response.json() as { customers?: Partner[]; suppliers?: Partner[]; pagination: Pagination }; setPartners((data.customers ?? data.suppliers) as Partner[]); setPagination(data.pagination); } catch { setError("Le répertoire commercial est temporairement indisponible."); }
  }
  useEffect(() => { startTransition(() => { void load(); }); }, [businessId, kind, page, ordering]);
  const saved = (label: string) => { setCreateOpen(false); setEditing(null); setNotice(label); void load(); };
  return <section className="content-panel p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{config[kind].plural}</h2>{canCreate ? <button className="button button-primary" onClick={() => setCreateOpen(true)} type="button">Ajouter un {config[kind].singular}</button> : null}</div>
    <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }}><input className="min-w-0 flex-1 rounded border p-2" onChange={(event) => setQuery(event.target.value)} placeholder="Nom, téléphone, e-mail ou référence" value={query} /><select className="rounded border p-2" onChange={(event) => { setOrdering(event.target.value); setPage(1); }} value={ordering}><option value="name">Nom A–Z</option><option value="-name">Nom Z–A</option><option value="-created_at">Plus récents</option><option value="created_at">Plus anciens</option></select><button className="button button-outline" type="submit">Rechercher</button></form>
    {error ? <p className="mt-3 text-sm text-[var(--error)]" role="alert">{error}</p> : null}{notice ? <p className="mt-3 text-sm text-green-800" role="status">{notice}</p> : null}
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr><th className="p-2">Nom</th><th className="p-2">Téléphone</th><th className="p-2">E-mail</th><th className="p-2">Statut</th><th className="p-2">Création</th><th className="p-2">Actions</th></tr></thead><tbody>{partners?.map((partner) => <tr className="border-t" key={partner.public_id}><td className="p-2"><Link className="font-medium underline" href={`/espace/entreprises/${businessId}/partenaires/${kind === "customer" ? "clients" : "fournisseurs"}/${partner.public_id}`}>{partner.name}</Link><div className="text-xs text-[var(--muted)]">{partner.public_id}</div></td><td className="p-2">{partner.phone || "—"}</td><td className="p-2">{partner.email || "—"}</td><td className="p-2">{partner.is_active ? "Actif" : "Inactif"}</td><td className="p-2">{new Date(partner.created_at).toLocaleDateString("fr-CD")}</td><td className="p-2">{canManage ? <button className="button button-outline" onClick={() => setEditing(partner)} type="button">Modifier</button> : "—"}</td></tr>)}</tbody></table>{partners === null && !error ? <p className="py-5">Chargement…</p> : partners?.length === 0 ? <p className="py-5 text-sm">Aucun {config[kind].singular} ne correspond à la recherche.</p> : null}</div>
    {pagination && pagination.count > 20 ? <Pager hasNext={Boolean(pagination.next)} hasPrevious={Boolean(pagination.previous)} page={page} setPage={setPage} /> : null}
    {createOpen ? <Modal onClose={() => setCreateOpen(false)} title={`Ajouter un ${config[kind].singular}`}><PartnerForm businessId={businessId} kind={kind} onSaved={() => saved(`${config[kind].singular} ajouté.`)} /></Modal> : null}
    {editing ? <Modal onClose={() => setEditing(null)} title={`Modifier ${editing.name}`}><PartnerForm businessId={businessId} kind={kind} onSaved={() => saved(`${config[kind].singular} modifié.`)} partner={editing} /></Modal> : null}
  </section>;
}

function PartnerDetail({ businessId, kind, partnerId }: { businessId: string; kind: Kind; partnerId: string }) {
  const router = useRouter(); const permissions = useBusinessPermissions(businessId); const canManage = permissions?.includes(config[kind].permission) ?? false;
  const [profile, setProfile] = useState<Profile | null>(null); const [page, setPage] = useState(1); const [editing, setEditing] = useState(false); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  async function load() { setError(null); try { const response = await fetch(`/api/private/businesses/${businessId}/${config[kind].endpoint}/${partnerId}/profile?page=${page}`, { credentials: "same-origin", cache: "no-store" }); if (response.status === 401) return router.replace("/connexion?erreur=session_expired"); if (!response.ok) return setError(await responseMessage(response)); setProfile((await response.json() as { profile: Profile }).profile); } catch { setError("La fiche commerciale est temporairement indisponible."); } }
  useEffect(() => { startTransition(() => { void load(); }); }, [businessId, kind, partnerId, page]);
  const partner = profile?.customer ?? profile?.supplier; const operations = kind === "customer" ? profile?.sales : profile?.purchases;
  return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/partenaires`}>← Partenaires commerciaux</Link>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{notice ? <p className="mt-4 text-green-800" role="status">{notice}</p> : null}{partner ? <><div className="mt-4 flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{kind === "customer" ? "CLIENT" : "FOURNISSEUR"}</p><h1 className="text-3xl font-semibold">{partner.name}</h1></div>{canManage ? <button className="button button-outline" onClick={() => setEditing(true)} type="button">Modifier</button> : null}</div><section className="content-panel mt-5 grid gap-2 p-5 md:grid-cols-2"><p>Téléphone : {partner.phone || "—"}</p><p>E-mail : {partner.email || "—"}</p><p>Adresse : {partner.address || "—"}</p><p>Statut : {partner.is_active ? "Actif" : "Inactif"}</p><p>Créé le : {new Date(partner.created_at).toLocaleDateString("fr-CD")}</p>{partner.notes ? <p className="md:col-span-2">Notes : {partner.notes}</p> : null}</section>{profile?.financial_summary ? <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(profile.financial_summary).filter(([key]) => key !== "currency").map(([key, value]) => <article className="content-panel p-4" key={key}><p className="text-xs uppercase text-[var(--muted)]">{key.replaceAll("_", " ")}</p><p className="mt-1 text-xl font-semibold">{value} {typeof value === "string" ? profile.financial_summary?.currency : ""}</p></article>)}</section> : null}<section className="content-panel mt-5 p-5"><h2 className="text-xl font-semibold">Historique des {kind === "customer" ? "ventes" : "achats"}</h2>{operations === null ? <p className="mt-3 text-sm">Vous ne disposez pas de la permission nécessaire pour consulter cet historique.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr><th className="p-2">Référence</th><th className="p-2">Date</th><th className="p-2">Statut</th><th className="p-2">Montant</th><th className="p-2">Paiement</th></tr></thead><tbody>{operations?.results.map((entry) => <tr className="border-t" key={entry.public_id}><td className="p-2"><Link className="underline" href={`/espace/entreprises/${businessId}/${kind === "customer" ? "ventes" : "achats"}/${entry.public_id}`}>{entry.reference || entry.public_id}</Link></td><td className="p-2">{new Date(entry.created_at).toLocaleDateString("fr-CD")}</td><td className="p-2">{entry.status}</td><td className="p-2">{entry.total} {entry.currency}</td><td className="p-2">{entry.payment_status}</td></tr>)}</tbody></table>{operations?.results.length === 0 ? <p className="py-5 text-sm">Aucune opération associée.</p> : null}{operations && operations.count > 20 ? <Pager hasNext={Boolean(operations.next)} hasPrevious={Boolean(operations.previous)} page={page} setPage={setPage} /> : null}</div>}</section>{editing ? <Modal onClose={() => setEditing(false)} title={`Modifier ${partner.name}`}><PartnerForm businessId={businessId} kind={kind} onSaved={() => { setEditing(false); setNotice("Informations mises à jour."); void load(); }} partner={partner} /></Modal> : null}</> : !error ? <p className="mt-5">Chargement de la fiche…</p> : null}</main>;
}

export function PartnerDirectory({ businessId, kind, partnerId }: { businessId: string; kind?: Kind; partnerId?: string }) {
  const permissions = useBusinessPermissions(businessId);
  if (kind && partnerId) return <PartnerDetail businessId={businessId} kind={kind} partnerId={partnerId} />;
  const viewCustomers = permissions?.includes("CUSTOMER_VIEW") ?? false; const viewSuppliers = permissions?.includes("SUPPLIER_VIEW") ?? false;
  return <main><div><p className="eyebrow">RÉPERTOIRE</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">Partenaires commerciaux</h1><p className="mt-2 text-sm text-[var(--muted)]">Clients et fournisseurs de l’entreprise active.</p></div>{permissions === null ? <p className="mt-6">Chargement des accès…</p> : <div className="mt-6 grid gap-6">{viewCustomers ? <PartnerSection businessId={businessId} canCreate={permissions.includes("CUSTOMER_CREATE")} canManage={permissions.includes("CUSTOMER_UPDATE")} kind="customer" /> : null}{viewSuppliers ? <PartnerSection businessId={businessId} canCreate={permissions.includes("SUPPLIER_CREATE")} canManage={permissions.includes("SUPPLIER_UPDATE")} kind="supplier" /> : null}{!viewCustomers && !viewSuppliers ? <p className="content-panel p-5">Vous ne disposez d’aucun accès au répertoire commercial.</p> : null}</div>}</main>;
}
