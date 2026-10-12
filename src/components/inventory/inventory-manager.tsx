"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type InventoryItem = {
  public_id: string;
  product: string | null;
  variant: string | null;
  quantity: string;
  reserved_quantity: string;
  available_quantity: string;
  low_stock_threshold: string | null;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
};
type Movement = { public_id: string; movement_type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER" | "SALE" | "RETURN"; quantity: string; quantity_before: string; quantity_after: string; reason: string; performed_by: string; created_at: string };

async function message(response: Response) {
  try {
    const body = await response.json() as { detail?: string };
    return body.detail ?? "L’inventaire est indisponible.";
  } catch { return "L’inventaire est indisponible."; }
}

function StockTargetForm({ businessId, onCreated }: { businessId: string; onCreated: (item: InventoryItem) => void }) {
  const router = useRouter();
  const [target, setTarget] = useState<"product" | "variant">("product");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(form: HTMLFormElement) {
    setSaving(true); setError(null);
    const data = new FormData(form);
    const id = data.get("sellable")?.toString().trim();
    const threshold = data.get("low_stock_threshold")?.toString();
    const response = await fetch(`/api/private/businesses/${businessId}/inventory`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ [target]: id, low_stock_threshold: threshold || null }) });
    setSaving(false);
    if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
    if (!response.ok) return setError(await message(response));
    onCreated((await response.json() as { inventoryItem: InventoryItem }).inventoryItem);
  }
  return <form className="content-panel grid gap-3 p-5" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
    <h2 className="font-semibold">Initialiser un article en stock</h2>
    <p className="text-sm text-[var(--muted)]">L’article est créé à quantité zéro. Django vérifie sa disponibilité et son appartenance à l’entreprise.</p>
    {error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}
    <label>Type<select className="mt-1 w-full rounded border p-2" onChange={(event) => setTarget(event.target.value as "product" | "variant")} value={target}><option value="product">Produit simple</option><option value="variant">Variante</option></select></label>
    <label>Identifiant {target === "product" ? "produit" : "variante"}<input className="mt-1 w-full rounded border p-2" name="sellable" placeholder={target === "product" ? "PR…" : "PV…"} required /></label>
    <label>Seuil de stock faible (facultatif)<input className="mt-1 w-full rounded border p-2" min="0" name="low_stock_threshold" step="0.001" type="number" /></label>
    <button className="button button-primary w-fit" disabled={saving} type="submit">{saving ? "Initialisation…" : "Initialiser"}</button>
  </form>;
}

function MovementForm({ businessId, inventoryId, onCreated }: { businessId: string; inventoryId: string; onCreated: () => void }) {
  const router = useRouter();
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(form: HTMLFormElement) {
    setSaving(true); setError(null);
    const data = new FormData(form);
    const response = await fetch(`/api/private/businesses/${businessId}/inventory/${inventoryId}/movements`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify(type === "ADJUSTMENT" ? { type, target_quantity: data.get("quantity"), reason: data.get("reason") } : { type, quantity: data.get("quantity"), reason: data.get("reason") }) });
    setSaving(false);
    if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
    if (!response.ok) return setError(await message(response));
    form.reset(); setType("IN"); onCreated();
  }
  return <form className="content-panel grid gap-3 p-5" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
    <h2 className="font-semibold">Mouvement manuel</h2>
    <p className="text-sm text-[var(--muted)]">Les quantités et le solde sont validés puis calculés exclusivement par Django.</p>
    {error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}
    <label>Opération<select className="mt-1 w-full rounded border p-2" onChange={(event) => setType(event.target.value as "IN" | "OUT" | "ADJUSTMENT")} value={type}><option value="IN">Entrée</option><option value="OUT">Sortie</option><option value="ADJUSTMENT">Ajustement à une quantité cible</option></select></label>
    <label>{type === "ADJUSTMENT" ? "Quantité cible" : "Quantité"}<input className="mt-1 w-full rounded border p-2" min={type === "ADJUSTMENT" ? "0" : "0.001"} name="quantity" required step="0.001" type="number" /></label>
    <label>Motif (facultatif)<textarea className="mt-1 w-full rounded border p-2" maxLength={500} name="reason" /></label>
    <button className="button button-primary w-fit" disabled={saving} type="submit">{saving ? "Enregistrement…" : "Enregistrer le mouvement"}</button>
  </form>;
}

export function InventoryManager({ businessId, inventoryId }: { businessId: string; inventoryId?: string }) {
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [lowStock, setLowStock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadList() {
    setError(null);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/inventory${lowStock ? "?low_stock=true" : ""}`, { credentials: "same-origin" });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await message(response));
      setInventory((await response.json() as { inventory: InventoryItem[] }).inventory);
    } catch { setError("L’inventaire est temporairement indisponible."); }
  }
  async function loadDetail() {
    if (!inventoryId) return;
    setError(null);
    try {
      const [detail, history] = await Promise.all([fetch(`/api/private/businesses/${businessId}/inventory/${inventoryId}`, { credentials: "same-origin" }), fetch(`/api/private/businesses/${businessId}/inventory/${inventoryId}/movements`, { credentials: "same-origin" })]);
      if (detail.status === 401 || history.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!detail.ok) return setError(await message(detail));
      if (!history.ok) return setError(await message(history));
      setItem((await detail.json() as { inventoryItem: InventoryItem }).inventoryItem);
      setMovements((await history.json() as { movements: Movement[] }).movements);
    } catch { setError("L’inventaire est temporairement indisponible."); }
  }
  useEffect(() => { if (inventoryId) void loadDetail(); else void loadList(); }, [businessId, inventoryId, lowStock]);

  if (inventoryId) return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/stocks`}>← Stocks</Link><h1 className="mt-3 text-3xl font-semibold">Article d’inventaire</h1>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{item ? <><section className="content-panel mt-5 grid gap-2 p-5"><p>Article : <strong>{item.product ?? item.variant}</strong></p><p>Quantité disponible : <strong>{item.available_quantity}</strong> (physique {item.quantity}, réservée {item.reserved_quantity})</p>{item.is_low_stock ? <p className="text-[var(--error)]">Stock faible : seuil {item.low_stock_threshold}</p> : null}</section><div className="mt-6 grid gap-6 lg:grid-cols-2"><MovementForm businessId={businessId} inventoryId={inventoryId} onCreated={() => void loadDetail()} /><section className="content-panel p-5"><h2 className="font-semibold">Historique immuable</h2>{movements === null ? <p className="mt-3">Chargement…</p> : movements.length ? <ul className="mt-3 divide-y">{movements.map((movement) => <li className="py-3" key={movement.public_id}><p><strong>{movement.movement_type}</strong> · {movement.quantity} · {movement.quantity_before} → {movement.quantity_after}</p><p className="text-sm text-[var(--muted)]">{movement.reason || "Sans motif"} · {new Date(movement.created_at).toLocaleString()}</p></li>)}</ul> : <p className="mt-3 text-sm">Aucun mouvement.</p>}</section></div></> : !error ? <p className="mt-5">Chargement…</p> : null}</main>;

  return <main><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">INVENTAIRE</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">Stocks</h1></div><label className="flex items-center gap-2 text-sm"><input checked={lowStock} onChange={(event) => setLowStock(event.target.checked)} type="checkbox" /> Stock faible uniquement</label></div>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}<div className="mt-6 grid gap-6 lg:grid-cols-2"><StockTargetForm businessId={businessId} onCreated={(created) => router.push(`/espace/entreprises/${businessId}/stocks/${created.public_id}`)} /><section className="content-panel p-5"><h2 className="font-semibold">Stock de l’entreprise</h2>{inventory === null ? <p className="mt-3">Chargement…</p> : inventory.length ? <ul className="mt-3 divide-y">{inventory.map((entry) => <li className="py-3" key={entry.public_id}><Link className="font-medium underline" href={`/espace/entreprises/${businessId}/stocks/${entry.public_id}`}>{entry.product ?? entry.variant}</Link><p className="text-sm text-[var(--muted)]">Disponible : {entry.available_quantity} · Réservée : {entry.reserved_quantity}{entry.is_low_stock ? " · Stock faible" : ""}</p></li>)}</ul> : <p className="mt-3 text-sm">Aucun article d’inventaire.</p>}</section></div></main>;
}
