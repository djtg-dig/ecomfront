"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, ClipboardList, Package, PencilRuler, Plus, RefreshCw, Search, SlidersHorizontal } from "lucide-react";

import { useBusinessPermissions } from "@/components/private/use-business-permissions";
import { Modal } from "@/components/ui/modal";
import { PaginationControls, paginationSearchParams } from "@/components/ui/pagination-controls";

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
type Pagination = { count: number; next: string | null; previous: string | null };

const statusLabels: Record<StockStatus, string> = { AVAILABLE: "Disponible", LOW_STOCK: "Stock faible", OUT_OF_STOCK: "Rupture" };
const movementLabels: Record<Movement["movement_type"], string> = { IN: "Entrée", OUT: "Sortie", ADJUSTMENT: "Ajustement", TRANSFER: "Transfert", SALE: "Vente", RETURN: "Retour" };

function positivePage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

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

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

function MovementIcon({ type }: { type: Movement["movement_type"] }) {
  const common = { "aria-hidden": true, size: 16 };
  if (type === "IN" || type === "RETURN") return <ArrowDownToLine {...common} />;
  if (type === "ADJUSTMENT") return <PencilRuler {...common} />;
  return <ArrowUpFromLine {...common} />;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [inventoryPagination, setInventoryPagination] = useState<Pagination | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<History | null>(null);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [itemMovements, setItemMovements] = useState<Movement[] | null>(null);
  const [modal, setModal] = useState<"initialize" | "movement" | null>(null);
  const [movementTarget, setMovementTarget] = useState<string | undefined>(inventoryId);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inventoryPage = positivePage(searchParams.get("inventory_page"));
  const movementsPage = positivePage(searchParams.get("movements_page"));
  const query = searchParams.get("q") ?? "";
  const stockStatus = searchParams.get("status") ?? "";
  const ordering = searchParams.get("ordering") ?? "";
  const movementType = searchParams.get("type") ?? "";
  const origin = searchParams.get("origin") ?? "";
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";

  function updateUrl(updates: Record<string, string | null>, replace = false) {
    const params = paginationSearchParams(searchParams.toString(), updates);
    const queryString = params.toString();
    const url = `${pathname}${queryString ? `?${queryString}` : ""}`;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }

  function changePage(parameter: "inventory_page" | "movements_page", page: number) {
    updateUrl({ [parameter]: page > 1 ? String(page) : null });
  }

  async function loadList() {
    setInventoryLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (stockStatus) params.set("status", stockStatus);
    if (ordering) params.set("ordering", ordering);
    params.set("page", String(inventoryPage));
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/inventory${params.size ? `?${params}` : ""}`, { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) throw new Error(await message(response));
      const payload = await response.json() as { inventory: InventoryItem[]; pagination: Pagination };
      setInventory(payload.inventory); setInventoryPagination(payload.pagination);
    } finally { setInventoryLoading(false); }
  }

  async function loadSummary() {
    const response = await fetch(`/api/private/businesses/${businessId}/inventory/summary`, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(await message(response));
    setSummary((await response.json() as { summary: Summary }).summary);
  }

  async function loadHistory() {
    setMovementsLoading(true);
    const params = new URLSearchParams();
    if (movementType) params.set("type", movementType);
    if (origin) params.set("origin", origin);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("page", String(movementsPage));
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/inventory/movements${params.size ? `?${params}` : ""}`, { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
      if (!response.ok) throw new Error(await message(response));
      setHistory((await response.json() as { movements: History }).movements);
    } finally { setMovementsLoading(false); }
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

  // Les fonctions de chargement sont volontairement relancées quand les valeurs listées changent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!canViewInventory) return; void Promise.resolve().then(async () => { setError(null); if (inventoryId) await loadDetail(); else await Promise.all([loadList(), loadSummary()]); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "L’inventaire est indisponible.")); }, [businessId, inventoryId, query, stockStatus, ordering, inventoryPage, canViewInventory]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!inventoryId && canViewMovements) void Promise.resolve().then(loadHistory).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "L’historique est indisponible.")); }, [businessId, inventoryId, movementType, origin, dateFrom, dateTo, movementsPage, canViewMovements]);

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

  return <main className="min-w-0">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">INVENTAIRE</p><h1 className="text-3xl font-semibold text-[var(--ink)]">Stocks</h1><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Suivez les disponibilités et consultez l’historique traçable de chaque mouvement.</p></div>{canInitialize || canMove ? <div className="flex flex-wrap gap-2">{canInitialize ? <button className="button button-outline inline-flex min-h-11 items-center gap-2" onClick={() => setModal("initialize")} type="button"><Plus aria-hidden="true" size={18} />Initialiser un stock</button> : null}{canMove ? <button className="button button-primary inline-flex min-h-11 items-center gap-2" onClick={() => openMovement()} type="button"><Plus aria-hidden="true" size={18} />Nouveau mouvement</button> : null}</div> : null}</div>
    {error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{notice ? <p className="mt-4" role="status">{notice}</p> : null}
    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{summary ? <><Metric label="Produits suivis" value={summary.tracked_products} /><Metric label="En stock" value={summary.in_stock} /><Metric label="Ruptures" value={summary.out_of_stock} alert={summary.out_of_stock > 0} /><Metric label="Stock faible" value={summary.low_stock} alert={summary.low_stock > 0} /><Metric label="Quantité disponible" value={summary.total_available_quantity} /></> : <p className="text-sm text-[var(--muted)]">Chargement des indicateurs…</p>}</section>
    <section className="content-panel mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><Package aria-hidden="true" size={20} />Articles en stock</h2><p className="mt-1 text-sm text-[var(--muted)]">Recherchez un article ou affinez la liste existante.</p></div><button aria-label="Actualiser les stocks" className="button button-outline inline-flex min-h-11 items-center gap-2" disabled={inventoryLoading} onClick={() => void Promise.all([loadList(), loadSummary()]).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "L’actualisation a échoué."))} type="button"><RefreshCw aria-hidden="true" size={18} />Actualiser</button></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <label className="relative block"><Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><span className="sr-only">Rechercher un produit</span><input aria-label="Rechercher un produit" className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-white py-2 pl-10 pr-3" onChange={(event) => updateUrl({ q: event.target.value || null, inventory_page: null }, true)} placeholder="Produit ou référence" value={query} /></label>
        <select aria-label="Filtrer par état" className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" onChange={(event) => updateUrl({ status: event.target.value || null, inventory_page: null }, true)} value={stockStatus}><option value="">Tous les états</option><option value="AVAILABLE">Disponible</option><option value="LOW_STOCK">Stock faible</option><option value="OUT_OF_STOCK">Rupture</option></select>
        <select aria-label="Trier les stocks" className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" onChange={(event) => updateUrl({ ordering: event.target.value || null, inventory_page: null }, true)} value={ordering}><option value="">Tri par défaut</option><option value="quantity">Quantité croissante</option><option value="-quantity">Quantité décroissante</option></select>
        <button className="button button-outline inline-flex min-h-11 items-center justify-center gap-2" onClick={() => updateUrl({ q: null, status: null, ordering: null, inventory_page: null }, true)} type="button"><SlidersHorizontal aria-hidden="true" size={18} />Réinitialiser</button>
      </div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="p-3">Produit</th><th className="p-3">Référence</th><th className="p-3 text-right">Disponible</th><th className="p-3 text-right">Seuil</th><th className="p-3">État</th><th className="p-3">Dernier mouvement</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>{inventory?.map((entry) => <tr className="border-b border-[var(--line)] last:border-0" key={entry.public_id}><td className="p-3 font-medium"><Link className="text-[var(--ink)] hover:text-[var(--brand)] hover:underline" href={`/espace/entreprises/${businessId}/stocks/${entry.public_id}`}>{entry.item_name}</Link></td><td className="p-3 text-[var(--muted)]">{entry.internal_reference || "—"}</td><td className="p-3 text-right font-medium tabular-nums">{entry.available_quantity}</td><td className="p-3 text-right tabular-nums">{entry.low_stock_threshold ?? "—"}</td><td className="p-3"><span className="status-badge status-info">{statusLabels[entry.stock_status]}</span></td><td className="p-3 whitespace-nowrap text-[var(--muted)]">{formatDate(entry.last_movement_at)}</td><td className="p-3 text-right">{canManage ? <button className="button button-outline min-h-10" onClick={() => openMovement(entry.public_id)} type="button">Mouvement</button> : <Link className="nav-link" href={`/espace/entreprises/${businessId}/stocks/${entry.public_id}`}>Consulter</Link>}</td></tr>)}</tbody></table>{inventory === null ? <p className="p-4">Chargement des stocks…</p> : inventory.length === 0 ? <p className="p-4 text-[var(--muted)]">Aucun stock ne correspond aux filtres.</p> : null}</div>
      {inventoryPagination ? <PaginationControls ariaLabel="Pagination de l’inventaire" currentItemCount={inventory?.length ?? 0} currentPage={inventoryPage} itemLabel="produits" loading={inventoryLoading} onPageChange={(page) => changePage("inventory_page", page)} pageSize={10} totalItems={inventoryPagination.count} /> : null}
    </section>
    <section className="content-panel mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><ClipboardList aria-hidden="true" size={20} />Historique des mouvements</h2><p className="mt-1 text-sm text-[var(--muted)]">Chaque variation est issue du registre immuable de l’entreprise.</p></div><button aria-label="Actualiser l’historique" className="button button-outline inline-flex min-h-11 items-center gap-2" disabled={movementsLoading} onClick={() => void loadHistory().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "L’actualisation a échoué."))} type="button"><RefreshCw aria-hidden="true" size={18} />Actualiser</button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <select aria-label="Type de mouvement" className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" onChange={(event) => updateUrl({ type: event.target.value || null, movements_page: null }, true)} value={movementType}><option value="">Tous les types</option>{Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Origine du mouvement" className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" onChange={(event) => updateUrl({ origin: event.target.value || null, movements_page: null }, true)} value={origin}><option value="">Toutes les origines</option><option value="PURCHASE">Achat</option><option value="SALE">Vente</option><option value="SALE_RETURN_LINE">Retour de vente</option></select>
        <label className="grid gap-1 text-sm text-[var(--muted)]">Du <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-[var(--ink)]" onChange={(event) => updateUrl({ date_from: event.target.value || null, movements_page: null }, true)} type="date" value={dateFrom} /></label>
        <label className="grid gap-1 text-sm text-[var(--muted)]">Au <input className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-[var(--ink)]" onChange={(event) => updateUrl({ date_to: event.target.value || null, movements_page: null }, true)} type="date" value={dateTo} /></label>
        <button className="button button-outline mt-auto min-h-11" onClick={() => updateUrl({ type: null, origin: null, date_from: null, date_to: null, movements_page: null }, true)} type="button">Réinitialiser</button>
      </div>
      <div className="mt-4 overflow-x-auto"><MovementTable movements={history?.results ?? null} /></div>
      {history ? <PaginationControls ariaLabel="Pagination de l’historique" currentItemCount={history.results.length} currentPage={movementsPage} itemLabel="mouvements" loading={movementsLoading} onPageChange={(page) => changePage("movements_page", page)} pageSize={10} totalItems={history.count} /> : null}
    </section>
    {modal === "initialize" ? <Modal onClose={() => setModal(null)} title="Initialiser un stock"><InitializeStockForm businessId={businessId} onSuccess={() => void mutationSucceeded("Stock initialisé.")} /></Modal> : null}
    {modal === "movement" ? <Modal onClose={() => setModal(null)} title="Nouveau mouvement"><MovementForm allowedTypes={allowedMovementTypes} businessId={businessId} fixedInventoryId={movementTarget} idempotencyKey={idempotencyKey} inventory={inventory ?? []} onSuccess={() => void mutationSucceeded("Mouvement enregistré.")} /></Modal> : null}
  </main>;
}

function Metric({ label, value, alert = false }: { label: string; value: string | number; alert?: boolean }) { return <article className={`content-panel p-4 ${alert ? "border-[var(--error)]" : ""}`}><p className="text-sm text-[var(--muted)]">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></article>; }

function MovementTable({ movements }: { movements: Movement[] | null }) {
  if (movements === null) return <p className="p-4">Chargement des mouvements…</p>;
  if (!movements.length) return <p className="p-4 text-sm text-[var(--muted)]">Aucun mouvement.</p>;
  return <>
    <div className="hidden min-w-[860px] md:block"><table className="w-full text-left text-sm"><thead className="bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]"><tr><th className="p-3">Date</th><th className="p-3">Produit</th><th className="p-3">Type</th><th className="p-3 text-right">Quantité</th><th className="p-3 text-right">Avant</th><th className="p-3 text-right">Après</th><th className="p-3">Origine</th><th className="p-3">Référence</th></tr></thead><tbody>{movements.map((movement) => <tr className="border-b border-[var(--line)] last:border-0" key={movement.public_id}><td className="whitespace-nowrap p-3 text-[var(--muted)]">{formatDate(movement.created_at)}</td><td className="p-3 font-medium">{movement.item_name}</td><td className="p-3"><span className="inline-flex items-center gap-2"><MovementIcon type={movement.movement_type} /><span className="status-badge status-info">{movementLabels[movement.movement_type]}</span></span></td><td className="p-3 text-right font-medium tabular-nums">{movement.quantity}</td><td className="p-3 text-right tabular-nums">{movement.quantity_before}</td><td className="p-3 text-right tabular-nums">{movement.quantity_after}</td><td className="p-3">{movementOrigin(movement)}</td><td className="p-3 font-mono text-xs text-[var(--muted)]">{movement.reference_id || "—"}</td></tr>)}</tbody></table></div>
    <div className="grid gap-3 md:hidden">{movements.map((movement) => <article className="rounded-lg border border-[var(--line)] bg-white p-4" key={movement.public_id}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{movement.item_name}</p><p className="mt-1 text-xs text-[var(--muted)]">{formatDate(movement.created_at)}</p></div><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--brand)]"><MovementIcon type={movement.movement_type} />{movementLabels[movement.movement_type]}</span></div><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><div><dt className="text-[var(--muted)]">Quantité</dt><dd className="mt-1 font-medium tabular-nums">{movement.quantity}</dd></div><div><dt className="text-[var(--muted)]">Origine</dt><dd className="mt-1">{movementOrigin(movement)}</dd></div><div><dt className="text-[var(--muted)]">Avant</dt><dd className="mt-1 tabular-nums">{movement.quantity_before}</dd></div><div><dt className="text-[var(--muted)]">Après</dt><dd className="mt-1 tabular-nums">{movement.quantity_after}</dd></div><div className="col-span-2"><dt className="text-[var(--muted)]">Référence</dt><dd className="mt-1 break-all font-mono text-xs">{movement.reference_id || "—"}</dd></div></dl></article>)}</div>
  </>;
}
