"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useBusinessPermissions } from "@/components/private/use-business-permissions";
import { Modal } from "@/components/ui/modal";

type StockStatus = "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK";
type InventoryItem = {
  public_id: string;
  product: string | null;
  variant: string | null;
  item_name: string;
  internal_reference: string | null;
  quantity: string;
  reserved_quantity: string;
  available_quantity: string;
  low_stock_threshold: string | null;
  is_low_stock: boolean;
  stock_status: StockStatus;
  last_movement_at: string | null;
};
type Movement = {
  public_id: string;
  inventory_item: string;
  item_name: string;
  product: string;
  variant: string | null;
  movement_type: "IN" | "OUT" | "ADJUSTMENT" | "TRANSFER" | "SALE" | "RETURN";
  quantity: string;
  quantity_before: string;
  quantity_after: string;
  reason: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
};
type Summary = {
  tracked_products: number;
  in_stock: number;
  out_of_stock: number;
  low_stock: number;
  total_available_quantity: string;
  recent_movements: Movement[];
};
type History = { count: number; next: string | null; previous: string | null; results: Movement[] };

const statusLabels: Record<StockStatus, string> = { AVAILABLE: "Disponible", LOW_STOCK: "Stock faible", OUT_OF_STOCK: "Rupture" };
const movementLabels: Record<Movement["movement_type"], string> = { IN: "Entrée", OUT: "Sortie", ADJUSTMENT: "Ajustement", TRANSFER: "Transfert", SALE: "Vente", RETURN: "Retour" };

async function message(response: Response) {
  try { return (await response.json() as { detail?: string }).detail ?? "Le service E-commerce est indisponible."; }
  catch { return "Le service E-commerce est indisponible."; }
}

function movementOrigin(movement: Movement) {
  if (movement.reference_type === "PURCHASE") return "Achat";
  if (movement.reference_type === "SALE") return "Vente";
  if (movement.reference_type === "SALE_RETURN_LINE") return "Retour de vente";
  return movement.reference_type || "Manuel";
}

function InitializeStockForm({ businessId, onSuccess }: { businessId: string; onSuccess: () => void }) {
  const router = useRouter();
  const [target, setTarget] = useState<"product" | "variant">("product");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(form: HTMLFormElement) {
    if (saving) return;
    setSaving(true); setError(null);
    const data = new FormData(form);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/inventory`, {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json", "x-csrf-protection": "1" },
        body: JSON.stringify({ [target]: data.get("sellable"), low_stock_threshold: data.get("low_stock_threshold") || null }),
      });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await message(response));
      onSuccess();
    } catch { setError("L’initialisation du stock a échoué."); }
    finally { setSaving(false); }
  }
  return <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
    <p className="text-sm text-[var(--muted)]">Le solde initial est zéro. Enregistrez ensuite une entrée ou un ajustement traçable.</p>
    {error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}
    <label className="grid gap-1 text-sm">Type<select className="rounded border p-2" onChange={(event) => setTarget(event.target.value as "product" | "variant")} value={target}><option value="product">Produit simple</option><option value="variant">Variante</option></select></label>
    <label className="grid gap-1 text-sm">Identifiant {target === "product" ? "produit" : "variante"}<input className="rounded border p-2" name="sellable" placeholder={target === "product" ? "PR…" : "PV…"} required /></label>
    <label className="grid gap-1 text-sm">Seuil de stock faible<input className="rounded border p-2" min="0" name="low_stock_threshold" step="0.001" type="number" /></label>
    <button aria-busy={saving} className="button button-primary w-fit" disabled={saving} type="submit">{saving ? "Initialisation…" : "Initialiser le stock"}</button>
  </form>;
}

function MovementForm({ businessId, inventory, fixedInventoryId, idempotencyKey, onSuccess, allowedTypes }: { businessId: string; inventory: InventoryItem[]; fixedInventoryId?: string; idempotencyKey: string; onSuccess: () => void; allowedTypes: Array<"IN" | "OUT" | "ADJUSTMENT"> }) {
  const router = useRouter();
  const [type, setType] = useState<"IN" | "OUT" | "ADJUSTMENT">(allowedTypes[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = inventory.find((item) => item.public_id === fixedInventoryId) ?? inventory[0];
  async function submit(form: HTMLFormElement) {
    if (saving) return;
    const data = new FormData(form);
    const inventoryId = fixedInventoryId || String(data.get("inventory"));
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/inventory/${inventoryId}/movements`, {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json", "x-csrf-protection": "1", "idempotency-key": idempotencyKey },
        body: JSON.stringify(type === "ADJUSTMENT" ? { type, target_quantity: data.get("quantity"), reason: data.get("reason") } : { type, quantity: data.get("quantity"), reason: data.get("reason") }),
      });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) return setError(await message(response));
      onSuccess();
    } catch { setError("Le mouvement n’a pas pu être enregistré."); }
    finally { setSaving(false); }
  }
  return <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
    <p className="text-sm text-[var(--muted)]">Le solde est verrouillé et recalculé exclusivement par Django.</p>
    {error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}
    {!fixedInventoryId ? inventory.length ? <label className="grid gap-1 text-sm">Produit<select className="rounded border p-2" defaultValue={selected?.public_id} name="inventory" required>{inventory.map((item) => <option key={item.public_id} value={item.public_id}>{item.item_name}{item.internal_reference ? ` · ${item.internal_reference}` : ""} — disponible {item.available_quantity}</option>)}</select></label> : <label className="grid gap-1 text-sm">Identifiant inventaire<input className="rounded border p-2" name="inventory" placeholder="IN…" required /></label> : <p className="rounded border p-3 text-sm">Quantité actuelle : <strong>{selected?.available_quantity ?? "non consultable"}</strong></p>}
    <label className="grid gap-1 text-sm">Opération<select className="rounded border p-2" onChange={(event) => setType(event.target.value as "IN" | "OUT" | "ADJUSTMENT")} value={type}>{allowedTypes.includes("IN") ? <option value="IN">Entrée</option> : null}{allowedTypes.includes("OUT") ? <option value="OUT">Sortie</option> : null}{allowedTypes.includes("ADJUSTMENT") ? <option value="ADJUSTMENT">Ajustement à une quantité cible</option> : null}</select></label>
    <label className="grid gap-1 text-sm">{type === "ADJUSTMENT" ? "Quantité cible" : "Quantité"}<input className="rounded border p-2" min={type === "ADJUSTMENT" ? "0" : "0.001"} name="quantity" required step="0.001" type="number" /></label>
    <label className="grid gap-1 text-sm">Motif<textarea className="rounded border p-2" maxLength={500} name="reason" /></label>
    <button aria-busy={saving} className="button button-primary w-fit" disabled={saving} type="submit">{saving ? "Enregistrement…" : "Confirmer le mouvement"}</button>
  </form>;
}

export function InventoryManager({ businessId, inventoryId }: { businessId: string; inventoryId?: string }) {
  const router = useRouter();
  const permissions = useBusinessPermissions(businessId);
  const canViewInventory = permissions?.includes("INVENTORY_VIEW") ?? false;
  const canViewMovements = permissions?.includes("INVENTORY_MOVEMENT_VIEW") ?? false;
  const canInitialize = permissions?.includes("INVENTORY_INITIALIZE") ?? false;
  const allowedMovementTypes = ([
    permissions?.includes("INVENTORY_IN") ? "IN" : null,
    permissions?.includes("INVENTORY_OUT") ? "OUT" : null,
    permissions?.includes("INVENTORY_ADJUST") ? "ADJUSTMENT" : null,
  ].filter(Boolean) as Array<"IN" | "OUT" | "ADJUSTMENT">);
  const canMove = allowedMovementTypes.length > 0;
  const canManage = canMove;
  const [inventory, setInventory] = useState<InventoryItem[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [itemMovements, setItemMovements] = useState<Movement[] | null>(null);
  const [modal, setModal] = useState<"initialize" | "movement" | null>(null);
  const [movementTarget, setMovementTarget] = useState<string | undefined>(inventoryId);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [query, setQuery] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [ordering, setOrdering] = useState("");
  const [movementType, setMovementType] = useState("");
  const [origin, setOrigin] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadList() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (stockStatus) params.set("status", stockStatus);
    if (ordering) params.set("ordering", ordering);
    const response = await fetch(`/api/private/businesses/${businessId}/inventory${params.size ? `?${params}` : ""}`, { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
    if (!response.ok) throw new Error(await message(response));
    setInventory((await response.json() as { inventory: InventoryItem[] }).inventory);
  }

  async function loadSummary() {
    const response = await fetch(`/api/private/businesses/${businessId}/inventory/summary`, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(await message(response));
    setSummary((await response.json() as { summary: Summary }).summary);
  }

  async function loadHistory() {
    const params = new URLSearchParams();
    if (movementType) params.set("type", movementType);
    if (origin) params.set("origin", origin);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const response = await fetch(`/api/private/businesses/${businessId}/inventory/movements${params.size ? `?${params}` : ""}`, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(await message(response));
    setHistory((await response.json() as { movements: History }).movements);
  }

  async function loadDetail() {
    if (!inventoryId) return;
    const [detail, movements] = await Promise.all([
      fetch(`/api/private/businesses/${businessId}/inventory/${inventoryId}`, { credentials: "same-origin", cache: "no-store" }),
      fetch(`/api/private/businesses/${businessId}/inventory/${inventoryId}/movements`, { credentials: "same-origin", cache: "no-store" }),
    ]);
    if (detail.status === 401 || movements.status === 401) return router.replace("/connexion?erreur=session_expired");
    if (!detail.ok) throw new Error(await message(detail));
    if (!movements.ok) throw new Error(await message(movements));
    const loadedItem = (await detail.json() as { inventoryItem: InventoryItem }).inventoryItem;
    setItem(loadedItem); setInventory([loadedItem]);
    setItemMovements((await movements.json() as { movements: Movement[] }).movements);
  }

  useEffect(() => { if (!canViewInventory) return; setError(null); void (inventoryId ? loadDetail() : Promise.all([loadList(), loadSummary()])).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "L’inventaire est indisponible.")); }, [businessId, inventoryId, query, stockStatus, ordering, canViewInventory]);
  useEffect(() => { if (!inventoryId && canViewMovements) void loadHistory().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "L’historique est indisponible.")); }, [businessId, inventoryId, movementType, origin, dateFrom, dateTo, canViewMovements]);

  function openMovement(target?: string) {
    setMovementTarget(target);
    setIdempotencyKey(crypto.randomUUID());
    setModal("movement"); setError(null); setNotice(null);
  }
  async function mutationSucceeded(label: string) {
    setModal(null); setNotice(label); setIdempotencyKey("");
    try { if (inventoryId) await loadDetail(); else await Promise.all([loadList(), loadSummary(), loadHistory()]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "L’actualisation a échoué."); }
  }

  if (inventoryId) return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/stocks`}>← Stocks</Link><div className="mt-3 flex flex-wrap items-start justify-between gap-3"><h1 className="text-3xl font-semibold">Article d’inventaire</h1>{canMove ? <button className="button button-primary" onClick={() => openMovement(inventoryId)} type="button">Nouveau mouvement</button> : null}</div>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{notice ? <p className="mt-4" role="status">{notice}</p> : null}{item ? <><section className="content-panel mt-5 grid gap-2 p-5"><p>Article : <strong>{item.item_name}</strong></p><p>Référence : {item.internal_reference || "—"}</p><p>Quantité disponible : <strong>{item.available_quantity}</strong> (physique {item.quantity}, réservée {item.reserved_quantity})</p><p>État : {statusLabels[item.stock_status]}</p></section>{canViewMovements ? <section className="content-panel mt-6 overflow-x-auto p-5"><h2 className="font-semibold">Historique immuable</h2><MovementTable movements={itemMovements} /></section> : null}</> : canViewInventory && !error ? <p className="mt-5">Chargement…</p> : null}{modal === "movement" ? <Modal onClose={() => setModal(null)} title="Nouveau mouvement"><MovementForm allowedTypes={allowedMovementTypes} businessId={businessId} fixedInventoryId={movementTarget} idempotencyKey={idempotencyKey} inventory={inventory ?? []} onSuccess={() => void mutationSucceeded("Mouvement enregistré.")} /></Modal> : null}</main>;

  return <main>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">INVENTAIRE</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">Stocks</h1></div>{canInitialize || canMove ? <div className="flex flex-wrap gap-2">{canInitialize ? <button className="button button-outline" onClick={() => setModal("initialize")} type="button">Initialiser un stock</button> : null}{canMove ? <button className="button button-primary" onClick={() => openMovement()} type="button">Nouveau mouvement</button> : null}</div> : null}</div>
    {error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{notice ? <p className="mt-4" role="status">{notice}</p> : null}
    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{summary ? <><Metric label="Produits suivis" value={summary.tracked_products} /><Metric label="En stock" value={summary.in_stock} /><Metric label="Ruptures" value={summary.out_of_stock} alert={summary.out_of_stock > 0} /><Metric label="Stock faible" value={summary.low_stock} alert={summary.low_stock > 0} /><Metric label="Quantité disponible" value={summary.total_available_quantity} /></> : <p className="text-sm text-[var(--muted)]">Chargement des indicateurs…</p>}</section>
    <section className="content-panel mt-6 p-5"><div className="flex flex-wrap gap-3"><input aria-label="Rechercher un produit" className="min-w-0 flex-1 rounded border p-2" onChange={(event) => setQuery(event.target.value)} placeholder="Produit ou référence" value={query} /><select aria-label="Filtrer par état" className="rounded border p-2" onChange={(event) => setStockStatus(event.target.value)} value={stockStatus}><option value="">Tous les états</option><option value="AVAILABLE">Disponible</option><option value="LOW_STOCK">Stock faible</option><option value="OUT_OF_STOCK">Rupture</option></select><select aria-label="Trier les stocks" className="rounded border p-2" onChange={(event) => setOrdering(event.target.value)} value={ordering}><option value="">Tri par défaut</option><option value="quantity">Quantité croissante</option><option value="-quantity">Quantité décroissante</option></select></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b"><th className="p-2">Produit</th><th className="p-2">Référence</th><th className="p-2">Disponible</th><th className="p-2">Seuil</th><th className="p-2">État</th><th className="p-2">Dernier mouvement</th><th className="p-2">Actions</th></tr></thead><tbody>{inventory?.map((entry) => <tr className="border-b" key={entry.public_id}><td className="p-2"><Link className="underline" href={`/espace/entreprises/${businessId}/stocks/${entry.public_id}`}>{entry.item_name}</Link></td><td className="p-2">{entry.internal_reference || "—"}</td><td className="p-2">{entry.available_quantity}</td><td className="p-2">{entry.low_stock_threshold ?? "—"}</td><td className="p-2">{statusLabels[entry.stock_status]}</td><td className="p-2">{entry.last_movement_at ? new Date(entry.last_movement_at).toLocaleString() : "—"}</td><td className="p-2">{canManage ? <button className="button button-outline" onClick={() => openMovement(entry.public_id)} type="button">Mouvement</button> : <Link className="nav-link" href={`/espace/entreprises/${businessId}/stocks/${entry.public_id}`}>Consulter</Link>}</td></tr>)}</tbody></table>{inventory === null ? <p className="p-4">Chargement des stocks…</p> : inventory.length === 0 ? <p className="p-4 text-[var(--muted)]">Aucun stock ne correspond aux filtres.</p> : null}</div></section>
    <section className="content-panel mt-6 p-5"><h2 className="font-semibold">Historique des mouvements</h2><div className="mt-3 flex flex-wrap gap-3"><select aria-label="Type de mouvement" className="rounded border p-2" onChange={(event) => setMovementType(event.target.value)} value={movementType}><option value="">Tous les types</option>{Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label="Origine du mouvement" className="rounded border p-2" onChange={(event) => setOrigin(event.target.value)} value={origin}><option value="">Toutes les origines</option><option value="PURCHASE">Achat</option><option value="SALE">Vente</option><option value="SALE_RETURN_LINE">Retour de vente</option></select><label className="text-sm">Du <input className="rounded border p-2" onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} /></label><label className="text-sm">Au <input className="rounded border p-2" onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} /></label></div><div className="mt-4 overflow-x-auto"><MovementTable movements={history?.results ?? null} /></div></section>
    {modal === "initialize" ? <Modal onClose={() => setModal(null)} title="Initialiser un stock"><InitializeStockForm businessId={businessId} onSuccess={() => void mutationSucceeded("Stock initialisé.")} /></Modal> : null}
    {modal === "movement" ? <Modal onClose={() => setModal(null)} title="Nouveau mouvement"><MovementForm allowedTypes={allowedMovementTypes} businessId={businessId} fixedInventoryId={movementTarget} idempotencyKey={idempotencyKey} inventory={inventory ?? []} onSuccess={() => void mutationSucceeded("Mouvement enregistré.")} /></Modal> : null}
  </main>;
}

function Metric({ label, value, alert = false }: { label: string; value: string | number; alert?: boolean }) { return <article className={`content-panel p-4 ${alert ? "border-[var(--error)]" : ""}`}><p className="text-sm text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></article>; }

function MovementTable({ movements }: { movements: Movement[] | null }) {
  if (movements === null) return <p className="p-4">Chargement des mouvements…</p>;
  if (!movements.length) return <p className="p-4 text-sm text-[var(--muted)]">Aucun mouvement.</p>;
  return <table className="w-full min-w-[860px] text-left text-sm"><thead><tr className="border-b"><th className="p-2">Date</th><th className="p-2">Produit</th><th className="p-2">Type</th><th className="p-2">Quantité</th><th className="p-2">Avant</th><th className="p-2">Après</th><th className="p-2">Origine</th><th className="p-2">Référence</th></tr></thead><tbody>{movements.map((movement) => <tr className="border-b" key={movement.public_id}><td className="p-2">{new Date(movement.created_at).toLocaleString()}</td><td className="p-2">{movement.item_name}</td><td className="p-2">{movementLabels[movement.movement_type]}</td><td className="p-2">{movement.quantity}</td><td className="p-2">{movement.quantity_before}</td><td className="p-2">{movement.quantity_after}</td><td className="p-2">{movementOrigin(movement)}</td><td className="p-2">{movement.reference_id || "—"}</td></tr>)}</tbody></table>;
}
