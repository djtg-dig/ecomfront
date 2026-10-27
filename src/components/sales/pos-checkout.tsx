"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Minus, Package, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";

import { useLocale } from "@/components/i18n/locale-provider";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";

type PosProduct = { type: "PRODUCT" | "VARIANT"; public_id: string; product_public_id: string; name: string; variant_label: string | null; internal_reference: string | null; barcode: string | null; effective_price: string; currency: string; available_quantity: string };
type CartLine = PosProduct & { quantity: string };
type PaymentMethod = { public_id: string; name: string; category: string; is_active: boolean };
type Sale = { public_id: string; status: "DRAFT" | "COMPLETED" | "CANCELLED"; total: string; currency: string };
type PosPhase = "editing" | "draft" | "preparing" | "prepared" | "completing" | "uncertain" | "complete" | (string & {});

const posPermissions = ["SALE_VIEW", "SALE_CREATE", "SALE_LINE_CREATE", "SALE_COMPLETE"];
const amount = (value: string) => Number(value) || 0;
const keyOf = (item: PosProduct) => `${item.type}:${item.public_id}`;
const detail = async (response: Response, fallback: string) => {
  const value = await response.json().catch(() => null) as { detail?: string; errors?: Record<string, string[]> } | null;
  return value?.detail ?? (Object.values(value?.errors ?? {}).flat().join(" ") || fallback);
};

/** Le panier local prépare les appels Django sans écrire le stock ni un total autoritatif. */
export function PosCheckout({ businessId }: { businessId: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const permissions = useBusinessPermissions(businessId);
  const allowed = permissions !== null && posPermissions.every((permission) => permissions.includes(permission));
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error" | "conflict">("idle");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [method, setMethod] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);
  const [synced, setSynced] = useState<string[]>([]);
  const [phase, setPhase] = useState<PosPhase>("editing");
  const [error, setError] = useState<string | null>(null);

  const localTotal = useMemo(() => cart.reduce((total, line) => total + amount(line.effective_price) * amount(line.quantity), 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((total, line) => total + amount(line.quantity), 0), [cart]);
  const activeMethods = useMemo(() => {
    const categories = new Set<string>();
    return methods.filter((entry) => entry.is_active && Boolean(entry.category) && !categories.has(entry.category) && Boolean(categories.add(entry.category)));
  }, [methods]);
  const canEdit = phase === "editing" && !sale;

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    void fetch(`/api/private/businesses/${businessId}/payment-methods`, { credentials: "same-origin", signal: controller.signal })
      .then(async (response) => response.ok ? (await response.json() as { paymentMethods?: PaymentMethod[] }).paymentMethods ?? [] : [])
      .then(setMethods).catch(() => undefined);
    return () => controller.abort();
  }, [allowed, businessId]);

  useEffect(() => {
    const value = query.trim();
    if (!allowed || !value) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchState("loading");
      void fetch(`/api/private/businesses/${businessId}/products/pos/search?q=${encodeURIComponent(value)}`, { credentials: "same-origin", signal: controller.signal })
        .then(async (response) => {
          if (response.status === 401) return router.replace("/connexion?erreur=session_expired");
          if (response.status === 409) { setSearchState("conflict"); setProducts([]); return; }
          if (!response.ok) throw new Error();
          setProducts((await response.json() as { products: PosProduct[] }).products);
          setSearchState("idle");
        })
        .catch((reason: unknown) => { if ((reason as { name?: string }).name !== "AbortError") setSearchState("error"); });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [allowed, businessId, query, router]);

  function add(item: PosProduct) {
    if (!canEdit) return;
    setCart((current) => {
      const itemKey = keyOf(item);
      const existing = current.find((line) => keyOf(line) === itemKey);
      return existing ? current.map((line) => keyOf(line) === itemKey ? { ...line, quantity: String(amount(line.quantity) + 1) } : line) : [...current, { ...item, quantity: "1" }];
    });
  }
  function setQuantity(itemKey: string, quantity: string) {
    if (!canEdit) return;
    if (amount(quantity) <= 0) { setCart((current) => current.filter((line) => keyOf(line) !== itemKey)); return; }
    setCart((current) => current.map((line) => keyOf(line) === itemKey ? { ...line, quantity } : line));
  }
  async function getSale(saleId: string) {
    const response = await fetch(`/api/private/businesses/${businessId}/sales/${saleId}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error(await detail(response, t("pos", "saleUnavailable")));
    return (await response.json() as { sale: Sale }).sale;
  }
  async function prepare() {
    if (!cart.length || phase === "preparing" || phase === "uncertain") return;
    setPhase("preparing"); setError(null);
    let currentSale = sale;
    try {
      if (!currentSale) {
        const response = await fetch(`/api/private/businesses/${businessId}/sales`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ operation_type: "DIRECT_SALE" }) });
        if (!response.ok) throw new Error(await detail(response, t("pos", "createFailed")));
        currentSale = (await response.json() as { sale: Sale }).sale;
        setSale(currentSale);
      }
      for (const line of cart) {
        const lineKey = keyOf(line);
        if (synced.includes(lineKey)) continue;
        const response = await fetch(`/api/private/businesses/${businessId}/sales/${currentSale.public_id}/lines`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ [line.type === "PRODUCT" ? "product" : "variant"]: line.public_id, quantity: line.quantity }) });
        if (!response.ok) throw new Error(await detail(response, t("pos", "lineFailed")));
        setSynced((current) => current.includes(lineKey) ? current : [...current, lineKey]);
      }
      setSale(await getSale(currentSale.public_id)); setPhase("prepared");
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("pos", "prepareFailed")); setPhase(currentSale ? "draft" : "uncertain"); }
  }
  async function reconcile() {
    if (!sale) return;
    setError(null);
    try { const current = await getSale(sale.public_id); setSale(current); if (current.status === "COMPLETED") finish(current); else setPhase("prepared"); }
    catch (reason) { setError(reason instanceof Error ? reason.message : t("pos", "saleUnavailable")); }
  }
  function finish(completed: Sale) { setSale(completed); setPhase("complete"); setCart([]); setSynced([]); setMethod(""); }
  async function complete() {
    if (!sale || !method || phase !== "prepared") return;
    setPhase("completing"); setError(null);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/sales/${sale.public_id}/complete`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ amount_paid: sale.total, payment_method: method }) });
      if (!response.ok) throw new Error(await detail(response, t("pos", "completeFailed")));
      finish((await response.json() as { sale: Sale }).sale);
    } catch (reason) { setError(reason instanceof TypeError ? t("pos", "completionUncertain") : reason instanceof Error ? reason.message : t("pos", "completeFailed")); setPhase("uncertain"); }
  }

  if (permissions === null) return <main><p>{t("pos", "checkingPermission")}</p></main>;
  if (!allowed) return <main><h1 className="text-3xl font-semibold">{t("pos", "title")}</h1><p className="mt-4 text-[var(--error)]" role="alert">{t("pos", "forbidden")}</p></main>;
  if (phase === "complete" && sale) return <main><div className="content-panel max-w-xl p-6"><CheckCircle2 aria-hidden="true" className="text-[var(--brand)]" size={32} /><h1 className="mt-4 text-3xl font-semibold">{t("pos", "success")}</h1><p className="mt-4" role="status">{t("pos", "saleCompleted")} <strong>{sale.total} {sale.currency}</strong></p><div className="mt-5 flex flex-wrap gap-3"><button className="button button-primary" onClick={() => { setSale(null); setPhase("editing"); }} type="button">{t("pos", "newSale")}</button><Link className="button button-outline" href={`/espace/entreprises/${businessId}/ventes/${sale.public_id}`}>{t("pos", "viewSale")}</Link></div></div></main>;

  return <main><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">POS</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">{t("pos", "title")}</h1></div>{sale ? <Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/ventes/${sale.public_id}`}>{t("pos", "draftLink")}</Link> : null}</div>{error ? <p className="app-alert mt-5" role="alert">{error}</p> : null}<div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(20rem,1fr)]"><section aria-labelledby="pos-catalog-title" className="content-panel min-w-0 p-4 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--brand)]"><Package aria-hidden="true" size={20} /></span><h2 className="text-lg font-semibold" id="pos-catalog-title">{t("pos", "catalog")}</h2></div><label className="relative mt-5 block"><span className="sr-only">{t("pos", "search")}</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><input autoFocus className="w-full rounded-lg border bg-[var(--surface-raised)] py-3 pl-10 pr-3 text-sm" disabled={!canEdit} onChange={(event) => { const nextQuery = event.target.value; setQuery(nextQuery); if (!nextQuery.trim()) { setProducts([]); setSearchState("idle"); } }} placeholder={t("pos", "search")} value={query} /></label>{searchState === "loading" ? <p className="mt-3 text-sm text-[var(--muted)]">{t("pos", "searching")}</p> : null}{searchState === "error" ? <p className="mt-3 text-sm text-[var(--error)]">{t("pos", "searchFailed")}</p> : null}{searchState === "conflict" ? <p className="mt-3 text-sm text-[var(--error)]">{t("pos", "searchConflict")}</p> : null}<div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <article className="flex min-w-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-4" key={keyOf(product)}><div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-[var(--muted)]"><Package aria-hidden="true" size={19} /></span><div className="min-w-0"><h3 className="truncate font-semibold" title={product.name}>{product.name}</h3>{product.variant_label ? <p className="truncate text-sm text-[var(--muted)]">{product.variant_label}</p> : null}</div></div><p className="mt-4 font-semibold">{product.effective_price} {product.currency}</p>{product.internal_reference || product.barcode ? <p className="mt-1 truncate text-xs text-[var(--muted)]" title={product.internal_reference || product.barcode || undefined}>{product.internal_reference || product.barcode}</p> : null}<p className="mt-1 text-xs text-[var(--muted)]">{t("pos", "available")}: {product.available_quantity}</p><button aria-label={`${t("pos", "add")} ${product.name}`} className="button button-outline mt-4 w-full px-3 text-sm" disabled={!canEdit} onClick={() => add(product)} type="button"><Plus aria-hidden="true" size={18} />{t("pos", "add")}</button></article>)}</div>{query.trim() && searchState === "idle" && !products.length ? <p className="empty-state mt-5 min-h-32">{t("pos", "noProducts")}</p> : null}</section><aside aria-labelledby="pos-cart-title" className="content-panel min-w-0 p-4 sm:p-6 lg:sticky lg:top-20"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--brand)]"><ShoppingCart aria-hidden="true" size={20} /></span><h2 className="text-lg font-semibold" id="pos-cart-title">{t("pos", "cart")}</h2></div><span aria-label={t("pos", "cart")} className="status-badge status-info">{cartCount}</span></div>{cart.length ? <ul className="mt-5 divide-y divide-[var(--line)]">{cart.map((line) => <li className="py-4 first:pt-0" key={keyOf(line)}><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold" title={line.name}>{line.name}{line.variant_label ? ` · ${line.variant_label}` : ""}</h3><p className="mt-1 text-sm text-[var(--muted)]">{line.effective_price} {line.currency}</p></div><button aria-label={`${t("pos", "remove")} ${line.name}`} className="grid size-11 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--brand)]" disabled={!canEdit} onClick={() => setCart((current) => current.filter((item) => keyOf(item) !== keyOf(line)))} type="button"><Trash2 aria-hidden="true" size={18} /></button></div><div className="mt-3 flex items-center justify-between gap-3"><div className="flex items-center rounded-lg border border-[var(--line)]"><button aria-label={`${t("pos", "quantity")} -`} className="grid size-10 place-items-center text-[var(--muted)] hover:bg-[var(--surface)]" disabled={!canEdit} onClick={() => setQuantity(keyOf(line), String(amount(line.quantity) - 1))} type="button"><Minus aria-hidden="true" size={16} /></button><input aria-label={t("pos", "quantity")} className="w-14 border-x border-y-0 bg-[var(--surface-raised)] p-1 text-center text-sm" disabled={!canEdit} min="0.001" onChange={(event) => setQuantity(keyOf(line), event.target.value)} step="0.001" type="number" value={line.quantity} /><button aria-label={`${t("pos", "quantity")} +`} className="grid size-10 place-items-center text-[var(--muted)] hover:bg-[var(--surface)]" disabled={!canEdit} onClick={() => setQuantity(keyOf(line), String(amount(line.quantity) + 1))} type="button"><Plus aria-hidden="true" size={16} /></button></div><strong className="text-sm">{(amount(line.effective_price) * amount(line.quantity)).toFixed(2)} {line.currency}</strong></div></li>)}</ul> : <div className="empty-state mt-5 min-h-40"><Package aria-hidden="true" className="text-[var(--muted)]" size={24} /><p className="mt-3 text-sm">{t("pos", "emptyCart")}</p></div>}<div className="mt-5 border-t border-[var(--line)] pt-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-[var(--muted)]">{t("pos", "indicativeTotal")}</p><strong>{localTotal.toFixed(2)} {cart[0]?.currency ?? ""}</strong></div>{phase === "prepared" && sale ? <><div className="mt-4 rounded-lg bg-[var(--surface-muted)] p-3"><p className="text-xs text-[var(--muted)]">{t("pos", "serverTotal")}</p><p className="mt-1 text-lg font-semibold">{sale.total} {sale.currency}</p></div><label className="mt-4 block text-sm font-medium">{t("pos", "paymentMethod")}<span className="relative mt-2 block"><CreditCard aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><select className="w-full rounded-lg border bg-[var(--surface-raised)] py-3 pl-10 pr-3" onChange={(event) => setMethod(event.target.value)} value={method}><option value="">{t("pos", "choose")}</option>{activeMethods.map((entry) => <option key={entry.category} value={entry.category}>{entry.name}</option>)}</select></span></label>{!activeMethods.length ? <p className="mt-2 text-sm text-[var(--error)]">{t("pos", "noPaymentMethod")}</p> : null}<button className="button button-primary mt-5 w-full" disabled={!method || !activeMethods.length || phase === "completing"} onClick={() => void complete()} type="button"><CheckCircle2 aria-hidden="true" size={18} />{phase === "completing" ? t("pos", "completing") : t("pos", "confirmPayment")}</button></> : phase === "uncertain" && sale ? <button className="button button-primary mt-5 w-full" onClick={() => void reconcile()} type="button"><CheckCircle2 aria-hidden="true" size={18} />{t("pos", "checkSale")}</button> : <button className="button button-primary mt-5 w-full" disabled={!cart.length || phase === "preparing" || phase === "uncertain"} onClick={() => void prepare()} type="button"><CreditCard aria-hidden="true" size={18} />{phase === "preparing" ? t("pos", "preparing") : sale ? t("pos", "resumePreparation") : t("pos", "preparePayment")}</button>}{canEdit && cart.length ? <button className="button button-outline mt-3 w-full" onClick={() => { if (window.confirm(t("pos", "clearConfirm"))) setCart([]); }} type="button">{t("pos", "clearCart")}</button> : null}</div></aside></div></main>;
}
