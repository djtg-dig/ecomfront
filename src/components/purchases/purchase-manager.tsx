"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Factory, PackageCheck, Plus, Search, Truck, UserRound } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";
import { formatQuantityWithUnit } from "@/lib/quantities/format";
type Supplier = {
  public_id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  is_active: boolean;
};
type Purchase = {
  public_id: string;
  supplier: string | null;
  status: "DRAFT" | "CONFIRMED" | "RECEIVED" | "CANCELLED";
  currency: "CDF" | "USD";
  reference: string;
  notes: string;
  subtotal: string;
  total: string;
  paid_amount: string;
  balance: string;
  payment_status: string;
  created_at: string;
  confirmed_at: string | null;
  received_at: string | null;
};
type PurchaseLine = {
  public_id: string;
  product: string | null;
  variant: string | null;
  unit_symbol: string;
  allows_decimal_quantity: boolean;
  quantity: string;
  unit_cost: string;
  line_total: string;
};
const statusLabel: Record<Purchase["status"], string> = {
  DRAFT: "Brouillon",
  CONFIRMED: "Confirmé",
  RECEIVED: "Réceptionné",
  CANCELLED: "Annulé"
};
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium"
}).format(new Date(value)) : "—";
function StatusBadge({
  status
}: {
  status: Purchase["status"];
}) {
  return <span className="status-badge status-info">{statusLabel[status]}</span>;
}
async function detail(response: Response) {
  try {
    return ((await response.json()) as {
      detail?: string;
    }).detail ?? "Les achats sont indisponibles.";
  } catch {
    return "Les achats sont indisponibles.";
  }
}
function SupplierForm({
  businessId,
  onCreated,
  allowed
}: {
  businessId: string;
  onCreated: (supplier: Supplier) => void;
  allowed: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  async function submit(form: HTMLFormElement) {
    setSaving(true);
    setError(null);
    const fields = new FormData(form);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/suppliers`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-protection": "1"
        },
        body: JSON.stringify({
          name: fields.get("name"),
          phone: fields.get("phone"),
          email: fields.get("email"),
          address: fields.get("address"),
          notes: fields.get("notes")
        })
      });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await detail(response));
      onCreated(((await response.json()) as {
        supplier: Supplier;
      }).supplier);
      setOpen(false);
    } catch {
      setError("Les achats sont temporairement indisponibles.");
    } finally {
      setSaving(false);
    }
  }
  return <>{allowed ? <button className="button button-outline" onClick={() => setOpen(true)} type="button">Nouveau fournisseur</button> : null}{open ? <Modal onClose={() => setOpen(false)} title="Nouveau fournisseur"><form aria-busy={saving} className="grid gap-3 p-1" onSubmit={event => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}>{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<label>Nom<input className="mt-1 w-full rounded border p-2" name="name" required /></label><label>Téléphone<input className="mt-1 w-full rounded border p-2" name="phone" /></label><label>E-mail<input className="mt-1 w-full rounded border p-2" name="email" type="email" /></label><label>Adresse<textarea className="mt-1 w-full rounded border p-2" name="address" /></label><label>Notes<textarea className="mt-1 w-full rounded border p-2" name="notes" /></label><button className="button button-outline sticky bottom-0 w-fit bg-white" disabled={saving} type="submit">{saving ? "Création…" : "Créer le fournisseur"}</button></form></Modal> : null}</>;
}
function SupplierEditor({
  businessId,
  supplier,
  onSaved,
  onClose,
  allowed
}: {
  businessId: string;
  supplier: Supplier;
  onSaved: (supplier: Supplier) => void;
  onClose: () => void;
  allowed: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(allowed);
  async function submit(form: HTMLFormElement) {
    setSaving(true);
    setError(null);
    const fields = new FormData(form);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/suppliers/${supplier.public_id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-protection": "1"
        },
        body: JSON.stringify({
          name: fields.get("name"),
          phone: fields.get("phone"),
          email: fields.get("email"),
          is_active: fields.get("is_active") === "on"
        })
      });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await detail(response));
      onSaved(((await response.json()) as {
        supplier: Supplier;
      }).supplier);
      setOpen(false);
    } catch {
      setError("Les achats sont temporairement indisponibles.");
    } finally {
      setSaving(false);
    }
  }
  return open && allowed ? <Modal onClose={() => {
    setOpen(false);
    onClose();
  }} title={`Modifier ${supplier.name}`}><form aria-busy={saving} className="grid gap-3 p-1" onSubmit={event => {
      event.preventDefault();
      void submit(event.currentTarget);
    }}>{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<label>Nom<input className="mt-1 w-full rounded border p-2" defaultValue={supplier.name} name="name" required /></label><label>Téléphone<input className="mt-1 w-full rounded border p-2" defaultValue={supplier.phone} name="phone" /></label><label>E-mail<input className="mt-1 w-full rounded border p-2" defaultValue={supplier.email} name="email" type="email" /></label><label className="flex gap-2"><input defaultChecked={supplier.is_active} name="is_active" type="checkbox" /> Actif</label><button className="button button-outline sticky bottom-0 w-fit bg-white" disabled={saving} type="submit">{saving ? "Enregistrement…" : "Enregistrer"}</button></form></Modal> : null;
}
function PurchaseForm({
  businessId,
  suppliers,
  onCreated,
  allowed
}: {
  businessId: string;
  suppliers: Supplier[];
  onCreated: (purchase: Purchase) => void;
  allowed: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  async function submit(form: HTMLFormElement) {
    setSaving(true);
    setError(null);
    const fields = new FormData(form);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/purchases`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-protection": "1"
        },
        body: JSON.stringify({
          supplier: fields.get("supplier") || null,
          reference: fields.get("reference"),
          notes: fields.get("notes")
        })
      });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await detail(response));
      onCreated(((await response.json()) as {
        purchase: Purchase;
      }).purchase);
      setOpen(false);
    } catch {
      setError("Les achats sont temporairement indisponibles.");
    } finally {
      setSaving(false);
    }
  }
  return <>{allowed ? <button className="button button-primary" onClick={() => setOpen(true)} type="button">Nouvel achat</button> : null}{open ? <Modal onClose={() => setOpen(false)} size="large" title="Nouvel achat"><form aria-busy={saving} className="grid gap-3 p-1" onSubmit={event => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}><p className="text-sm text-[var(--muted)]">La devise est imposée par la devise principale de l’entreprise.</p>{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<label>Rechercher un fournisseur<input className="mt-1 w-full rounded border p-2" onChange={event => setSupplierSearch(event.target.value)} placeholder="Nom, téléphone ou e-mail" value={supplierSearch} /></label><label>Fournisseur<select className="mt-1 w-full rounded border p-2" name="supplier"><option value="">Sans fournisseur</option>{suppliers.filter(supplier => supplier.is_active && `${supplier.name} ${supplier.phone} ${supplier.email}`.toLowerCase().includes(supplierSearch.toLowerCase())).map(supplier => <option key={supplier.public_id} value={supplier.public_id}>{supplier.name}</option>)}</select></label><label>Référence<input className="mt-1 w-full rounded border p-2" maxLength={120} name="reference" /></label><label>Notes<textarea className="mt-1 w-full rounded border p-2" name="notes" /></label><button className="button button-primary sticky bottom-0 w-fit bg-white" disabled={saving} type="submit">{saving ? "Création…" : "Créer le brouillon"}</button></form></Modal> : null}</>;
}
function LineForm({
  businessId,
  purchaseId,
  onCreated,
  allowed
}: {
  businessId: string;
  purchaseId: string;
  onCreated: () => void;
  allowed: boolean;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<"product" | "variant">("product");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  async function submit(form: HTMLFormElement) {
    setSaving(true);
    setError(null);
    const fields = new FormData(form);
    const targetId = fields.get("target")?.toString().trim();
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/purchases/${purchaseId}/lines`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-protection": "1"
        },
        body: JSON.stringify({
          [target]: targetId,
          quantity: fields.get("quantity"),
          unit_cost: fields.get("unit_cost")
        })
      });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await detail(response));
      form.reset();
      setTarget("product");
      setOpen(false);
      onCreated();
    } catch {
      setError("Les achats sont temporairement indisponibles.");
    } finally {
      setSaving(false);
    }
  }
  return <>{allowed ? <button className="button button-primary" onClick={() => setOpen(true)} type="button">Ajouter une ligne</button> : null}{open ? <Modal onClose={() => setOpen(false)} size="large" title="Ajouter une ligne"><form aria-busy={saving} className="grid gap-3 p-1" onSubmit={event => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}><p className="text-sm text-[var(--muted)]">Sélectionnez l’identifiant public du produit ou de la variante appartenant à cette entreprise.</p><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/produits`}>Consulter le catalogue</Link>{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<label>Article<select className="mt-1 w-full rounded border p-2" onChange={event => setTarget(event.target.value as "product" | "variant")} value={target}><option value="product">Produit (PR…)</option><option value="variant">Variante (PV…)</option></select></label><label>Identifiant<input className="mt-1 w-full rounded border p-2" name="target" placeholder={target === "product" ? "PR…" : "PV…"} required /></label><label>Quantité<input className="mt-1 w-full rounded border p-2" min="0.001" name="quantity" required step="0.001" type="number" /></label><label>Coût unitaire<input className="mt-1 w-full rounded border p-2" min="0" name="unit_cost" required step="0.01" type="number" /></label><button className="button button-primary sticky bottom-0 w-fit bg-white" disabled={saving} type="submit">{saving ? "Ajout…" : "Ajouter la ligne"}</button></form></Modal> : null}</>;
}
function PurchaseListView({
  businessId,
  purchases,
  suppliers,
  canViewPurchases,
  canViewSuppliers,
  canCreatePurchase,
  canCreateSupplier,
  canUpdateSupplier,
  editingSupplier,
  setEditingSupplier,
  onSupplierCreated,
  onSupplierSaved,
  onPurchaseCreated,
  error,
  success,
  query,
  setQuery,
  status,
  setStatus
}: {
  businessId: string;
  purchases: Purchase[] | null;
  suppliers: Supplier[];
  canViewPurchases: boolean;
  canViewSuppliers: boolean;
  canCreatePurchase: boolean;
  canCreateSupplier: boolean;
  canUpdateSupplier: boolean;
  editingSupplier: Supplier | null;
  setEditingSupplier: (supplier: Supplier | null) => void;
  onSupplierCreated: (supplier: Supplier) => void;
  onSupplierSaved: (supplier: Supplier) => void;
  onPurchaseCreated: (purchase: Purchase) => void;
  error: string | null;
  success: string | null;
  query: string;
  setQuery: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
}) {
  const supplierName = (id: string | null) => suppliers.find(supplier => supplier.public_id === id)?.name ?? (id ? "Fournisseur enregistré" : "Sans fournisseur");
  const visible = (purchases ?? []).filter(entry => (status === "ALL" || entry.status === status) && `${entry.public_id} ${entry.reference} ${supplierName(entry.supplier)}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="min-w-0"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">APPROVISIONNEMENTS</p><div className="mt-1 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--brand)]"><Truck aria-hidden="true" size={20} /></span><h1 className="text-3xl font-semibold text-[var(--ink)]">Achats</h1></div><p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">Préparez, confirmez et réceptionnez les approvisionnements de l’entreprise.</p></div>{canCreatePurchase ? <PurchaseForm allowed={canCreatePurchase} businessId={businessId} onCreated={onPurchaseCreated} suppliers={suppliers} /> : null}</div>{error ? <p className="app-alert mt-5" role="alert">{error}</p> : null}{success ? <p className="mt-5 text-sm text-[var(--brand)]" role="status">{success}</p> : null}<section className="content-panel mt-6 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><ClipboardList aria-hidden="true" className="text-[var(--brand)]" size={20} /><h2 className="text-lg font-semibold">Achats de l’entreprise</h2></div><span className="text-sm text-[var(--muted)]">{purchases ? `${purchases.length} achat${purchases.length > 1 ? "s" : ""}` : ""}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]"><label className="relative"><span className="sr-only">Rechercher un achat</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><input className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-white py-2 pl-10 pr-3" onChange={event => setQuery(event.target.value)} placeholder="Référence ou fournisseur" value={query} /></label><select aria-label="Filtrer les achats par statut" className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" onChange={event => setStatus(event.target.value)} value={status}><option value="ALL">Tous les statuts</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>{purchases === null ? <p className="mt-5 text-sm text-[var(--muted)]">Chargement…</p> : <><div className="mt-5 hidden overflow-x-auto md:block"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="p-3">Référence</th><th className="p-3">Fournisseur</th><th className="p-3">Date</th><th className="p-3 text-right">Montant</th><th className="p-3">Statut</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>{visible.map(entry => <tr className="border-b border-[var(--line)] last:border-0" key={entry.public_id}><td className="p-3"><Link className="font-medium text-[var(--ink)] hover:text-[var(--brand)] hover:underline" href={`/espace/entreprises/${businessId}/achats/${entry.public_id}`}>{entry.reference || entry.public_id}</Link></td><td className="p-3">{supplierName(entry.supplier)}</td><td className="p-3 whitespace-nowrap text-[var(--muted)]">{formatDate(entry.created_at)}</td><td className="p-3 text-right font-medium tabular-nums">{entry.total} {entry.currency}</td><td className="p-3"><StatusBadge status={entry.status} /></td><td className="p-3 text-right"><Link className="button button-outline min-h-10" href={`/espace/entreprises/${businessId}/achats/${entry.public_id}`}>Consulter</Link></td></tr>)}</tbody></table></div><div className="mt-5 grid gap-3 md:hidden">{visible.map(entry => <article className="rounded-xl border border-[var(--line)] bg-white p-4" key={entry.public_id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link className="font-semibold text-[var(--ink)]" href={`/espace/entreprises/${businessId}/achats/${entry.public_id}`}>{entry.reference || entry.public_id}</Link><p className="mt-1 flex items-center gap-1 text-sm text-[var(--muted)]"><UserRound aria-hidden="true" size={14} />{supplierName(entry.supplier)}</p></div><StatusBadge status={entry.status} /></div><div className="mt-4 flex items-end justify-between gap-3 text-sm"><div><p className="text-[var(--muted)]">Date</p><p className="mt-1">{formatDate(entry.created_at)}</p></div><p className="font-semibold tabular-nums">{entry.total} {entry.currency}</p></div><Link className="button button-outline mt-4 min-h-11 w-full" href={`/espace/entreprises/${businessId}/achats/${entry.public_id}`}>Consulter</Link></article>)}</div>{!visible.length ? <p className="empty-state mt-5 min-h-32">Aucun achat ne correspond aux filtres.</p> : null}</>}</section>{canViewSuppliers || canCreateSupplier ? <section className="content-panel mt-6 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Factory aria-hidden="true" className="text-[var(--brand)]" size={20} /><h2 className="text-lg font-semibold">Fournisseurs</h2></div><SupplierForm allowed={canCreateSupplier} businessId={businessId} onCreated={onSupplierCreated} /></div>{canViewSuppliers && suppliers.length ? <ul className="mt-4 divide-y divide-[var(--line)]">{suppliers.map(supplier => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={supplier.public_id}><div><p className="font-medium">{supplier.name}</p><p className="mt-1 text-sm text-[var(--muted)]">{supplier.phone || supplier.email || "—"}{supplier.is_active ? "" : " · Inactif"}</p></div>{canUpdateSupplier ? <button className="button button-outline min-h-10" onClick={() => setEditingSupplier(supplier)} type="button">Modifier</button> : null}</li>)}</ul> : canViewSuppliers ? <p className="mt-4 text-sm text-[var(--muted)]">Aucun fournisseur.</p> : null}{editingSupplier ? <SupplierEditor allowed={canUpdateSupplier} businessId={businessId} onClose={() => setEditingSupplier(null)} onSaved={onSupplierSaved} supplier={editingSupplier} /> : null}</section> : null}</main>;
}
function PurchaseDetailView({
  businessId,
  purchaseId,
  purchase,
  lines,
  canCreateLine,
  canConfirm,
  canReceive,
  canCancel,
  actionSaving,
  error,
  success,
  onAction,
  onLineCreated
}: {
  businessId: string;
  purchaseId: string;
  purchase: Purchase | null;
  lines: PurchaseLine[] | null;
  canCreateLine: boolean;
  canConfirm: boolean;
  canReceive: boolean;
  canCancel: boolean;
  actionSaving: boolean;
  error: string | null;
  success: string | null;
  onAction: (action: "confirm" | "receive" | "cancel") => void;
  onLineCreated: () => void;
}) {
  if (!purchase) return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/achats`}>← Achats</Link>{error ? <p className="app-alert mt-5" role="alert">{error}</p> : <p className="mt-5 text-sm text-[var(--muted)]">Chargement…</p>}</main>;
  return <main className="min-w-0"><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/achats`}>← Achats</Link><div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">ACHAT</p><h1 className="mt-1 text-3xl font-semibold">{purchase.reference || purchase.public_id}</h1><p className="mt-2 text-sm text-[var(--muted)]">Créé le {formatDate(purchase.created_at)}</p></div><StatusBadge status={purchase.status} /></div>{error ? <p className="app-alert mt-5" role="alert">{error}</p> : null}{success ? <p className="mt-5 text-sm text-[var(--brand)]" role="status">{success}</p> : null}<div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)]"><section className="content-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">Produits achetés</h2>{purchase.status === "DRAFT" ? <div className="mt-4"><LineForm allowed={canCreateLine} businessId={businessId} onCreated={onLineCreated} purchaseId={purchaseId} /></div> : <p className="mt-3 text-sm text-[var(--muted)]">Les lignes sont verrouillées après confirmation.</p>}{lines === null ? <p className="mt-4 text-sm text-[var(--muted)]">Chargement…</p> : lines.length ? <ul className="mt-4 divide-y divide-[var(--line)]">{lines.map(line => <li className="flex flex-wrap items-center justify-between gap-3 py-4" key={line.public_id}><p className="font-medium">{line.product ?? line.variant}</p><p className="text-right text-sm tabular-nums">{formatQuantityWithUnit(line.quantity, "fr", line.allows_decimal_quantity, line.unit_symbol)} × {line.unit_cost}<br /><strong>{line.line_total} {purchase.currency}</strong></p></li>)}</ul> : <p className="mt-4 text-sm text-[var(--muted)]">Ajoutez au moins une ligne avant confirmation.</p>}</section><aside className="grid gap-6"><section className="content-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">Informations générales</h2><dl className="mt-4 grid gap-4 text-sm"><div><dt className="text-[var(--muted)]">Fournisseur</dt><dd className="mt-1 font-medium">{purchase.supplier || "Sans fournisseur"}</dd></div><div><dt className="text-[var(--muted)]">Statut</dt><dd className="mt-1"><StatusBadge status={purchase.status} /></dd></div>{purchase.confirmed_at ? <div><dt className="text-[var(--muted)]">Confirmation</dt><dd className="mt-1">{formatDate(purchase.confirmed_at)}</dd></div> : null}{purchase.received_at ? <div><dt className="text-[var(--muted)]">Réception</dt><dd className="mt-1">{formatDate(purchase.received_at)}</dd></div> : null}</dl></section><section className="content-panel p-5 sm:p-6"><h2 className="text-lg font-semibold">Récapitulatif financier</h2><dl className="mt-4 grid gap-3"><div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Sous-total</dt><dd>{purchase.subtotal} {purchase.currency}</dd></div><div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Réglé</dt><dd>{purchase.paid_amount} {purchase.currency}</dd></div><div className="flex justify-between gap-3 border-t border-[var(--line)] pt-3"><dt className="font-medium">Solde</dt><dd className="font-semibold">{purchase.balance} {purchase.currency}</dd></div></dl></section></aside></div><div className="mt-6 flex flex-wrap gap-3">{purchase.status === "DRAFT" && canConfirm ? <button className="button button-primary min-h-11" disabled={actionSaving} onClick={() => onAction("confirm")} type="button">Confirmer</button> : null}{purchase.status === "CONFIRMED" && canReceive ? <button className="button button-primary inline-flex min-h-11 items-center gap-2" disabled={actionSaving} onClick={() => onAction("receive")} type="button"><PackageCheck aria-hidden="true" size={18} />{actionSaving ? "Réception…" : "Réceptionner"}</button> : null}{(purchase.status === "DRAFT" || purchase.status === "CONFIRMED") && canCancel ? <button className="button button-outline min-h-11" disabled={actionSaving} onClick={() => onAction("cancel")} type="button">Annuler</button> : null}</div></main>;
}
export function PurchaseManager({
  businessId,
  purchaseId
}: {
  businessId: string;
  purchaseId?: string;
}) {
  const router = useRouter();
  const permissions = useBusinessPermissions(businessId);
  const canViewPurchases = permissions?.includes("PURCHASE_VIEW") ?? false;
  const canViewSuppliers = permissions?.includes("SUPPLIER_VIEW") ?? false;
  const canCreateSupplier = permissions?.includes("SUPPLIER_CREATE") ?? false;
  const canUpdateSupplier = permissions?.includes("SUPPLIER_UPDATE") ?? false;
  const canCreatePurchase = permissions?.includes("PURCHASE_CREATE") ?? false;
  const canCreateLine = permissions?.includes("PURCHASE_LINE_CREATE") ?? false;
  const canConfirm = permissions?.includes("PURCHASE_CONFIRM") ?? false;
  const canReceive = permissions?.includes("PURCHASE_RECEIVE") ?? false;
  const canCancel = permissions?.includes("PURCHASE_CANCEL") ?? false;
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [lines, setLines] = useState<PurchaseLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionSaving, setActionSaving] = useState(false);
  const requestVersion = useRef(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const loadList = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (isCurrent()) setError(null);
    try {
      const [purchaseResponse, supplierResponse] = await Promise.all([canViewPurchases ? fetch(`/api/private/businesses/${businessId}/purchases`, {
        credentials: "same-origin"
      }) : Promise.resolve(null), canViewSuppliers ? fetch(`/api/private/businesses/${businessId}/suppliers?page_size=100`, {
        credentials: "same-origin"
      }) : Promise.resolve(null)]);
      if (!isCurrent()) return;
      if (purchaseResponse?.status === 401 || supplierResponse?.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (purchaseResponse && !purchaseResponse.ok) return setError(await detail(purchaseResponse));
      if (supplierResponse && !supplierResponse.ok) return setError(await detail(supplierResponse));
      const nextPurchases = purchaseResponse ? ((await purchaseResponse.json()) as {
        purchases: Purchase[];
      }).purchases : [];
      if (!isCurrent()) return;
      setPurchases(nextPurchases);
      if (supplierResponse) {
        const nextSuppliers = ((await supplierResponse.json()) as {
          suppliers: Supplier[];
        }).suppliers;
        if (!isCurrent()) return;
        setSuppliers(nextSuppliers);
      }
    } catch {
      if (isCurrent()) setError("Les achats sont temporairement indisponibles.");
    }
  }, [businessId, canViewPurchases, canViewSuppliers, router]);
  const loadDetail = useCallback(async (isCurrent: () => boolean = () => true) => {
    if (!purchaseId) return;
    if (isCurrent()) setError(null);
    try {
      const [purchaseResponse, lineResponse] = await Promise.all([fetch(`/api/private/businesses/${businessId}/purchases/${purchaseId}`, {
        credentials: "same-origin"
      }), fetch(`/api/private/businesses/${businessId}/purchases/${purchaseId}/lines`, {
        credentials: "same-origin"
      })]);
      if (!isCurrent()) return;
      if (purchaseResponse.status === 401 || lineResponse.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!purchaseResponse.ok) return setError(await detail(purchaseResponse));
      if (!lineResponse.ok) return setError(await detail(lineResponse));
      const nextPurchase = ((await purchaseResponse.json()) as {
        purchase: Purchase;
      }).purchase;
      const nextLines = ((await lineResponse.json()) as {
        lines: PurchaseLine[];
      }).lines;
      if (!isCurrent()) return;
      setPurchase(nextPurchase);
      setLines(nextLines);
    } catch {
      if (isCurrent()) setError("Les achats sont temporairement indisponibles.");
    }
  }, [businessId, purchaseId, router]);
  async function action(actionName: "confirm" | "receive" | "cancel") {
    if (!purchaseId) return;
    if ((actionName === "receive" || actionName === "cancel") && !window.confirm(actionName === "receive" ? "Réceptionner cet achat et créer les mouvements de stock Django ?" : "Annuler cet achat ?")) return;
    setActionSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/purchases/${purchaseId}/${actionName}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-csrf-protection": "1"
        },
        body: "{}"
      });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await detail(response));
      await loadDetail();
    } catch {
      setError("Les achats sont temporairement indisponibles.");
    } finally {
      setActionSaving(false);
    }
  }
  useEffect(() => {
    const version = ++requestVersion.current;
    const isCurrent = () => requestVersion.current === version;
    startTransition(() => {
      void Promise.resolve().then(() => {
        if (!isCurrent()) return;
        return purchaseId && canViewPurchases ? loadDetail(isCurrent) : !purchaseId ? loadList(isCurrent) : undefined;
      });
    });
    return () => {
      requestVersion.current += 1;
    };
  }, [canViewPurchases, loadDetail, loadList, purchaseId]);
  if (purchaseId) return <PurchaseDetailView actionSaving={actionSaving} businessId={businessId} canCancel={canCancel} canConfirm={canConfirm} canCreateLine={canCreateLine} canReceive={canReceive} error={error} lines={lines} onAction={actionName => void action(actionName)} onLineCreated={() => {
    setSuccess("Ligne d’achat ajoutée.");
    void loadDetail();
  }} purchase={purchase} purchaseId={purchaseId} success={success} />;
  return <PurchaseListView businessId={businessId} canCreatePurchase={canCreatePurchase} canCreateSupplier={canCreateSupplier} canUpdateSupplier={canUpdateSupplier} canViewPurchases={canViewPurchases} canViewSuppliers={canViewSuppliers} editingSupplier={editingSupplier} error={error} onPurchaseCreated={created => {
    setPurchases(current => current ? [created, ...current] : [created]);
    setSuccess("Brouillon d’achat créé.");
    void loadList();
  }} onSupplierCreated={supplier => {
    setSuppliers(current => [...current, supplier]);
    setSuccess("Fournisseur créé.");
  }} onSupplierSaved={saved => {
    setSuppliers(current => current.map(supplier => supplier.public_id === saved.public_id ? saved : supplier));
    setEditingSupplier(null);
    setSuccess("Fournisseur modifié.");
  }} purchases={purchases} query={query} setEditingSupplier={setEditingSupplier} setQuery={setQuery} setStatus={setStatus} status={status} success={success} suppliers={suppliers} />;

  /* legacy presentation retained in history
  if (purchaseId) return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/achats`}>← Achats</Link><h1 className="mt-3 text-3xl font-semibold">Achat</h1>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{success ? <p className="mt-4 text-sm text-green-800" role="status">{success}</p> : null}</main>;
  return <main><p className="eyebrow">APPROVISIONNEMENTS</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">Achats</h1>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{success ? <p className="mt-4 text-sm text-green-800" role="status">{success}</p> : null}<div className="mt-6 grid gap-6 xl:grid-cols-2">{canViewSuppliers || canCreateSupplier ? <div className="content-panel grid gap-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Fournisseurs</h2><SupplierForm allowed={canCreateSupplier} businessId={businessId} onCreated={(supplier) => { setSuppliers((current) => [...current, supplier]); setSuccess("Fournisseur créé."); }} /></div>{canViewSuppliers && suppliers.length ? <ul className="divide-y">{suppliers.map((supplier) => <li className="flex items-center justify-between gap-2 py-2" key={supplier.public_id}><span>{supplier.name}{supplier.is_active ? "" : " · Inactif"}</span>{canUpdateSupplier ? <button className="button button-outline" onClick={() => setEditingSupplier(supplier)} type="button">Modifier</button> : null}</li>)}</ul> : canViewSuppliers ? <p className="text-sm">Aucun fournisseur.</p> : null}{editingSupplier ? <SupplierEditor allowed={canUpdateSupplier} businessId={businessId} onClose={() => setEditingSupplier(null)} onSaved={(saved) => { setSuppliers((current) => current.map((supplier) => supplier.public_id === saved.public_id ? saved : supplier)); setEditingSupplier(null); setSuccess("Fournisseur modifié."); }} supplier={editingSupplier} /> : null}</div> : null}{canViewPurchases || canCreatePurchase ? <div className="content-panel grid content-start gap-4 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Achats de l’entreprise</h2><PurchaseForm allowed={canCreatePurchase} businessId={businessId} onCreated={(created) => { setPurchases((current) => current ? [created, ...current] : [created]); setSuccess("Brouillon d’achat créé."); void loadList(); }} suppliers={suppliers} /></div>{canViewPurchases ? purchases === null ? <p>Chargement…</p> : purchases.length ? <ul className="divide-y">{purchases.map((entry) => <li className="py-3" key={entry.public_id}><Link className="font-medium underline" href={`/espace/entreprises/${businessId}/achats/${entry.public_id}`}>{entry.public_id}</Link><p className="text-sm text-[var(--muted)]">{entry.status} · {entry.total} {entry.currency}{entry.supplier ? ` · ${entry.supplier}` : ""}</p></li>)}</ul> : <p className="text-sm">Aucun achat.</p> : null}</div> : null}</div></main>;
  */
}
