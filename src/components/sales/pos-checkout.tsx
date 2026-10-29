"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Minus, Package, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";

import { useLocale } from "@/components/i18n/locale-provider";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";
import { Modal } from "@/components/ui/modal";
import { formatMessage } from "@/lib/i18n/messages";
import { formatQuantity } from "@/lib/quantities/format";

type PosProduct = { type: "PRODUCT" | "VARIANT"; public_id: string; product_public_id: string; name: string; variant_label: string | null; internal_reference: string | null; barcode: string | null; effective_price: string; currency: string; available_quantity: string; unit_code: string; unit_symbol: string; allows_decimal_quantity: boolean };
type CartLine = PosProduct & { quantity: string };
type PaymentMethod = { public_id: string; name: string; category: string; is_active: boolean };
type Sale = { public_id: string; status: "DRAFT" | "COMPLETED" | "CANCELLED"; total: string; currency: string };
type SaleLine = { public_id: string };
type PosPhase = "editing" | "draft" | "preparing" | "prepared" | "completing" | "uncertain" | "complete" | (string & {});

const posPermissions = ["SALE_VIEW", "SALE_CREATE", "SALE_LINE_CREATE", "SALE_COMPLETE"];
const paymentMethodsInFlight = new Map<string, Promise<PaymentMethod[]>>();
const amount = (value: string) => Number(value) || 0;
const keyOf = (item: PosProduct) => `${item.type}:${item.public_id}`;
const quantityScale = 1000;
const quantityUnits = (value: string) => Math.round(amount(value) * quantityScale);
const quantityValue = (units: number) => String(units / quantityScale);
const displayQuantity = (value: string, allowsDecimals: boolean, locale = "fr") => formatQuantity(value, locale, allowsDecimals);
const maximumUnits = (item: PosProduct) => item.allows_decimal_quantity
  ? Math.max(0, quantityUnits(item.available_quantity))
  : Math.max(0, Math.floor(quantityUnits(item.available_quantity) / quantityScale) * quantityScale);
type PosResponseError = Error & { status?: number; code?: string; errors?: Record<string, string[]>; lineKey?: string };

async function responseError(response: Response, fallback: string): Promise<PosResponseError> {
  const value = await response.json().catch(() => null) as { code?: string; detail?: string; errors?: Record<string, string[]> } | null;
  const error = new Error(value?.detail ?? fallback) as PosResponseError;
  error.status = response.status;
  error.code = value?.code;
  error.errors = value?.errors;
  return error;
}

function loadPaymentMethods(businessId: string) {
  const existing = paymentMethodsInFlight.get(businessId);
  if (existing) return existing;
  const request = fetch(`/api/private/businesses/${businessId}/payment-methods`, { credentials: "same-origin" })
    .then(async (response) => {
      if (!response.ok) throw new Error("payment_methods_unavailable");
      return (await response.json() as { paymentMethods?: PaymentMethod[] }).paymentMethods ?? [];
    })
    .finally(() => { paymentMethodsInFlight.delete(businessId); });
  paymentMethodsInFlight.set(businessId, request);
  return request;
}

/** Le panier local prépare les appels Django sans écrire le stock ni un total autoritatif. */
export function PosCheckout({ businessId }: { businessId: string }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const permissions = useBusinessPermissions(businessId);
  const allowed = permissions !== null && posPermissions.every((permission) => permissions.includes(permission));
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error" | "conflict">("idle");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsState, setPaymentMethodsState] = useState<"loading" | "ready" | "error">("loading");
  const [paymentMethodsReload, setPaymentMethodsReload] = useState(0);
  const [method, setMethod] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);
  const [synced, setSynced] = useState<Record<string, { lineId: string; quantity: string }>>({});
  const [phase, setPhase] = useState<PosPhase>("editing");
  const [error, setError] = useState<string | null>(null);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const completionInFlight = useRef(false);

  const localTotal = useMemo(() => cart.reduce((total, line) => total + amount(line.effective_price) * amount(line.quantity), 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((total, line) => total + amount(line.quantity), 0), [cart]);
  const activeMethods = useMemo(() => {
    const categories = new Set<string>();
    return methods.filter((entry) => entry.is_active && Boolean(entry.category) && !categories.has(entry.category) && Boolean(categories.add(entry.category)));
  }, [methods]);
  const canEdit = phase === "editing" || phase === "draft";

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    // Strict Mode may replay this effect. Share only the in-flight request;
    // completed results are not cached and payment configuration can still change.
    void loadPaymentMethods(businessId)
      .then((loaded) => { if (active) { setMethods(loaded); setPaymentMethodsState("ready"); } })
      .catch(() => { if (active) setPaymentMethodsState("error"); });
    return () => { active = false; };
  }, [allowed, businessId, paymentMethodsReload]);

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

  function stockLabel(item: PosProduct) {
    const quantity = displayQuantity(item.available_quantity, item.allows_decimal_quantity, locale);
    const unit = item.unit_code === "PCS" ? t("pos", Number(quantity) === 1 ? "piece" : "pieces") : item.unit_symbol;
    return formatMessage(t("pos", "availableWithUnit"), { quantity, unit });
  }
  function setLineError(item: PosProduct, message: string | null) {
    const itemKey = keyOf(item);
    setLineErrors((current) => {
      if (!message) { const { [itemKey]: _, ...rest } = current; return rest; }
      return { ...current, [itemKey]: message };
    });
  }
  function requestFailureMessage(reason: unknown, fallback: string) {
    if (reason instanceof TypeError) return t("pos", "networkFailed");
    const failure = reason as PosResponseError;
    if (failure.status === 401) return t("pos", "sessionExpired");
    if (failure.status === 403) return t("pos", "permissionDenied");
    return fallback;
  }
  function lineFailureMessage(reason: unknown, line: CartLine) {
    const failure = reason as PosResponseError;
    if (failure.errors?.quantity) return line.allows_decimal_quantity ? t("pos", "invalidQuantity") : t("pos", "wholeQuantityRequired");
    if (failure.errors?.product || failure.errors?.variant || failure.status === 404) return t("pos", "unavailable");
    return requestFailureMessage(reason, t("pos", "lineFailed"));
  }
  function add(item: PosProduct) {
    if (!canEdit) return;
    const limit = maximumUnits(item);
    if (!limit) { setLineError(item, t("pos", "unavailable")); return; }
    setCart((current) => {
      const itemKey = keyOf(item);
      const existing = current.find((line) => keyOf(line) === itemKey);
      const step = item.allows_decimal_quantity ? 1 : quantityScale;
      if (existing && quantityUnits(existing.quantity) + step > limit) { setLineError(item, formatMessage(t("pos", "maximumReached"), { quantity: displayQuantity(item.available_quantity, item.allows_decimal_quantity, locale) })); return current; }
      setLineError(item, null);
      return existing ? current.map((line) => keyOf(line) === itemKey ? { ...line, quantity: quantityValue(quantityUnits(line.quantity) + step) } : line) : [...current, { ...item, quantity: quantityValue(Math.min(step, limit)) }];
    });
  }
  function setQuantity(line: CartLine, quantity: string) {
    if (!canEdit) return;
    const units = quantityUnits(quantity);
    const itemKey = keyOf(line);
    if (!units || (!line.allows_decimal_quantity && units % quantityScale !== 0)) { setLineError(line, t("pos", "wholeQuantityRequired")); return; }
    if (units > maximumUnits(line)) { setLineError(line, formatMessage(t("pos", "maximumReached"), { quantity: displayQuantity(line.available_quantity, line.allows_decimal_quantity, locale) })); return; }
    setLineError(line, null);
    setCart((current) => current.map((item) => keyOf(item) === itemKey ? { ...item, quantity: quantityValue(units) } : item));
  }
  async function getSale(saleId: string) {
    const response = await fetch(`/api/private/businesses/${businessId}/sales/${saleId}`, { credentials: "same-origin" });
    if (!response.ok) throw await responseError(response, t("pos", "saleUnavailable"));
    return (await response.json() as { sale: Sale }).sale;
  }
  async function prepare() {
    if (!cart.length || phase === "preparing" || phase === "uncertain") return;
    setPhase("preparing"); setError(null);
    let currentSale = sale;
    try {
      if (!currentSale) {
        const response = await fetch(`/api/private/businesses/${businessId}/sales`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ operation_type: "DIRECT_SALE" }) });
        if (!response.ok) throw await responseError(response, t("pos", "createFailed"));
        currentSale = (await response.json() as { sale: Sale }).sale;
        setSale(currentSale);
      }
      for (const line of cart) {
        const lineKey = keyOf(line);
        if (synced[lineKey]?.quantity === line.quantity) continue;
        const savedLine = synced[lineKey];
        const response = await fetch(`/api/private/businesses/${businessId}/sales/${currentSale.public_id}/lines${savedLine ? `/${savedLine.lineId}` : ""}`, { method: savedLine ? "PATCH" : "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ [line.type === "PRODUCT" ? "product" : "variant"]: line.public_id, quantity: line.quantity }) });
        if (!response.ok) {
          const failure = await responseError(response, t("pos", "lineFailed"));
          failure.lineKey = lineKey;
          throw failure;
        }
        const saved = await response.json() as { line: SaleLine };
        setSynced((current) => ({ ...current, [lineKey]: { lineId: saved.line.public_id, quantity: line.quantity } }));
      }
      setSale(await getSale(currentSale.public_id)); setPhase("prepared");
    } catch (reason) {
      const failure = reason as PosResponseError;
      const line = cart.find((entry) => keyOf(entry) === failure.lineKey);
      if (line) setLineError(line, lineFailureMessage(reason, line));
      else setError(requestFailureMessage(reason, t("pos", "prepareFailed")));
      setPhase(currentSale ? "draft" : "uncertain");
    }
  }
  async function reconcile() {
    if (!sale) return;
    setError(null);
    try { const current = await getSale(sale.public_id); setSale(current); if (current.status === "COMPLETED") finish(current); else setPhase("prepared"); }
    catch (reason) { setError(requestFailureMessage(reason, t("pos", "saleUnavailable"))); }
  }
  function finish(completed: Sale) { setSale(completed); setPhase("complete"); setCart([]); setSynced({}); setMethod(""); }
  function startNewSale() { setSale(null); setPhase("editing"); setCart([]); setSynced({}); setMethod(""); setError(null); setLineErrors({}); }
  async function complete() {
    if (!sale || !method || phase !== "prepared" || completionInFlight.current) return;
    completionInFlight.current = true;
    setPhase("completing"); setError(null);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/sales/${sale.public_id}/complete`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ amount_paid: sale.total, payment_method: method }) });
      if (!response.ok) throw await responseError(response, t("pos", "completeFailed"));
      finish((await response.json() as { sale: Sale }).sale);
    } catch (reason) {
      const failure = reason as PosResponseError;
      const targetId = failure.errors?.target_public_id?.[0];
      const available = failure.errors?.available_quantity?.[0];
      if (targetId && available) {
        const line = cart.find((entry) => entry.public_id === targetId);
        if (line) {
          setLineError(line, formatMessage(t("pos", "stockInsufficient"), { name: line.name, quantity: displayQuantity(available, line.allows_decimal_quantity, locale), unit: line.unit_code === "PCS" ? t("pos", Number(available) === 1 ? "piece" : "pieces") : line.unit_symbol }));
          setPhase("draft");
          return;
        }
      }
      setError(reason instanceof TypeError ? t("pos", "completionUncertain") : t("pos", "completeFailed"));
      setPhase("uncertain");
    } finally { completionInFlight.current = false; }
  }

  if (permissions === null) return <main><p>{t("pos", "checkingPermission")}</p></main>;
  if (!allowed) return <main><h1 className="text-3xl font-semibold">{t("pos", "title")}</h1><p className="mt-4 text-[var(--error)]" role="alert">{t("pos", "forbidden")}</p></main>;
  return <><main><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">POS</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">{t("pos", "title")}</h1></div>{sale && phase !== "complete" ? <Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/ventes/${sale.public_id}`}>{t("pos", "draftLink")}</Link> : null}</div>{error ? <p className="app-alert mt-5" role="alert">{error}</p> : null}<div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(20rem,1fr)]"><section aria-labelledby="pos-catalog-title" className="content-panel min-w-0 p-4 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--brand)]"><Package aria-hidden="true" size={20} /></span><h2 className="text-lg font-semibold" id="pos-catalog-title">{t("pos", "catalog")}</h2></div><label className="relative mt-5 block"><span className="sr-only">{t("pos", "search")}</span><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><input autoFocus className="w-full rounded-lg border bg-[var(--surface-raised)] py-3 pl-10 pr-3 text-sm" disabled={!canEdit} onChange={(event) => { const nextQuery = event.target.value; setQuery(nextQuery); if (!nextQuery.trim()) { setProducts([]); setSearchState("idle"); } }} placeholder={t("pos", "search")} value={query} /></label>{searchState === "loading" ? <p className="mt-3 text-sm text-[var(--muted)]">{t("pos", "searching")}</p> : null}{searchState === "error" ? <p className="mt-3 text-sm text-[var(--error)]">{t("pos", "searchFailed")}</p> : null}{searchState === "conflict" ? <p className="mt-3 text-sm text-[var(--error)]">{t("pos", "searchConflict")}</p> : null}<div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <article className="flex min-w-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-4" key={keyOf(product)}><div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--surface)] text-[var(--muted)]"><Package aria-hidden="true" size={19} /></span><div className="min-w-0"><h3 className="truncate font-semibold" title={product.name}>{product.name}</h3>{product.variant_label ? <p className="truncate text-sm text-[var(--muted)]">{product.variant_label}</p> : null}</div></div><p className="mt-4 font-semibold">{product.effective_price} {product.currency}</p>{product.internal_reference || product.barcode ? <p className="mt-1 truncate text-xs text-[var(--muted)]" title={product.internal_reference || product.barcode || undefined}>{product.internal_reference || product.barcode}</p> : null}<p className="mt-1 text-xs text-[var(--muted)]">{stockLabel(product)}</p><button aria-label={`${t("pos", "add")} ${product.name}`} className="button button-outline mt-4 w-full px-3 text-sm" disabled={!canEdit || !maximumUnits(product)} onClick={() => add(product)} type="button"><Plus aria-hidden="true" size={18} />{t("pos", "add")}</button></article>)}</div>{query.trim() && searchState === "idle" && !products.length ? <p className="empty-state mt-5 min-h-32">{t("pos", "noProducts")}</p> : null}</section><aside aria-labelledby="pos-cart-title" className="content-panel min-w-0 p-4 sm:p-6 lg:sticky lg:top-20"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--brand)]"><ShoppingCart aria-hidden="true" size={20} /></span><h2 className="text-lg font-semibold" id="pos-cart-title">{t("pos", "cart")}</h2></div><span aria-label={t("pos", "cart")} className="status-badge status-info">{cartCount}</span></div>{cart.length ? <ul className="mt-5 divide-y divide-[var(--line)]">{cart.map((line) => <li className="py-4 first:pt-0" key={keyOf(line)}><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold" title={line.name}>{line.name}{line.variant_label ? ` · ${line.variant_label}` : ""}</h3><p className="mt-1 text-sm text-[var(--muted)]">{line.effective_price} {line.currency}</p></div><button aria-label={`${t("pos", "remove")} ${line.name}`} className="grid size-11 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--brand)]" disabled={!canEdit || Boolean(sale)} onClick={() => setCart((current) => current.filter((item) => keyOf(item) !== keyOf(line)))} type="button"><Trash2 aria-hidden="true" size={18} /></button></div><div className="mt-3 flex items-center justify-between gap-3"><div className="flex items-center rounded-lg border border-[var(--line)]"><button aria-label={`${t("pos", "quantity")} -`} className="grid size-10 place-items-center text-[var(--muted)] hover:bg-[var(--surface)]" disabled={!canEdit || quantityUnits(line.quantity) <= (line.allows_decimal_quantity ? 1 : quantityScale)} onClick={() => setQuantity(line, quantityValue(quantityUnits(line.quantity) - (line.allows_decimal_quantity ? 1 : quantityScale)))} type="button"><Minus aria-hidden="true" size={16} /></button><input aria-label={t("pos", "quantity")} className="w-16 border-x border-y-0 bg-[var(--surface-raised)] p-1 text-center text-sm" disabled={!canEdit} max={displayQuantity(line.available_quantity, line.allows_decimal_quantity)} min={line.allows_decimal_quantity ? "0.001" : "1"} onChange={(event) => setQuantity(line, event.target.value)} step={line.allows_decimal_quantity ? "0.001" : "1"} type="number" value={line.quantity} /><button aria-label={`${t("pos", "quantity")} +`} className="grid size-10 place-items-center text-[var(--muted)] hover:bg-[var(--surface)]" disabled={!canEdit || quantityUnits(line.quantity) + (line.allows_decimal_quantity ? 1 : quantityScale) > maximumUnits(line)} onClick={() => setQuantity(line, quantityValue(quantityUnits(line.quantity) + (line.allows_decimal_quantity ? 1 : quantityScale)))} type="button"><Plus aria-hidden="true" size={16} /></button></div><strong className="text-sm">{(amount(line.effective_price) * amount(line.quantity)).toFixed(2)} {line.currency}</strong></div>{lineErrors[keyOf(line)] ? <p className="mt-2 text-sm text-[var(--error)]" role="alert">{lineErrors[keyOf(line)]}</p> : null}</li>)}</ul> : <div className="empty-state mt-5 min-h-40"><Package aria-hidden="true" className="text-[var(--muted)]" size={24} /><p className="mt-3 text-sm">{t("pos", "emptyCart")}</p></div>}<div className="mt-5 border-t border-[var(--line)] pt-5"><div className="flex items-center justify-between gap-3"><p className="text-sm text-[var(--muted)]">{t("pos", "indicativeTotal")}</p><strong>{localTotal.toFixed(2)} {cart[0]?.currency ?? ""}</strong></div>{phase === "prepared" && sale ? <><div className="mt-4 rounded-lg bg-[var(--surface-muted)] p-3"><p className="text-xs text-[var(--muted)]">{t("pos", "serverTotal")}</p><p className="mt-1 text-lg font-semibold">{sale.total} {sale.currency}</p></div><label className="mt-4 block text-sm font-medium">{t("pos", "paymentMethod")}<span className="relative mt-2 block"><CreditCard aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><select className="w-full rounded-lg border bg-[var(--surface-raised)] py-3 pl-10 pr-3" disabled={paymentMethodsState !== "ready"} onChange={(event) => setMethod(event.target.value)} value={method}><option value="">{t("pos", "choose")}</option>{activeMethods.map((entry) => <option key={entry.category} value={entry.category}>{entry.name}</option>)}</select></span></label>{paymentMethodsState === "loading" ? <p className="mt-2 text-sm text-[var(--muted)]">{t("pos", "loadingPaymentMethods")}</p> : null}{paymentMethodsState === "error" ? <div className="mt-2 flex flex-wrap items-center gap-2"><p className="text-sm text-[var(--error)]" role="alert">{t("pos", "paymentMethodsFailed")}</p><button className="button button-outline px-3 py-2 text-sm" onClick={() => { setPaymentMethodsState("loading"); setPaymentMethodsReload((value) => value + 1); }} type="button">{t("feedback", "retry")}</button></div> : null}{paymentMethodsState === "ready" && !activeMethods.length ? <p className="mt-2 text-sm text-[var(--error)]">{t("pos", "noPaymentMethod")}</p> : null}<button className="button button-primary mt-5 w-full" disabled={!method || !activeMethods.length || paymentMethodsState !== "ready" || phase === "completing"} onClick={() => void complete()} type="button"><CheckCircle2 aria-hidden="true" size={18} />{phase === "completing" ? t("pos", "completing") : t("pos", "confirmPayment")}</button></> : phase === "uncertain" && sale ? <button className="button button-primary mt-5 w-full" onClick={() => void reconcile()} type="button"><CheckCircle2 aria-hidden="true" size={18} />{t("pos", "checkSale")}</button> : <button className="button button-primary mt-5 w-full" disabled={!cart.length || phase === "preparing" || phase === "uncertain"} onClick={() => void prepare()} type="button"><CreditCard aria-hidden="true" size={18} />{phase === "preparing" ? t("pos", "preparing") : sale ? t("pos", "resumePreparation") : t("pos", "preparePayment")}</button>}{canEdit && !sale && cart.length ? <button className="button button-outline mt-3 w-full" onClick={() => { if (window.confirm(t("pos", "clearConfirm"))) setCart([]); }} type="button">{t("pos", "clearCart")}</button> : null}</div></aside></div></main>{phase === "complete" && sale ? <Modal confirmOnClose={false} footer={null} onClose={startNewSale} size="small" title={t("pos", "successModalTitle")}><div className="grid gap-5 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-green-100 text-green-700"><CheckCircle2 aria-hidden="true" size={32} /></span><p className="text-sm text-[var(--muted)]" role="status">{t("pos", "successModalDescription")}</p><dl className="rounded-xl bg-[var(--surface-muted)] p-4 text-left"><div><dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{t("pos", "saleReference")}</dt><dd className="mt-1 font-semibold">{sale.public_id}</dd></div><div className="mt-4 border-t border-[var(--line)] pt-4"><dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{t("pos", "amountCollected")}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{sale.total} {sale.currency}</dd></div></dl><div className="grid gap-3 sm:grid-cols-2"><button className="button button-primary justify-center" onClick={startNewSale} type="button">{t("pos", "newSale")}</button><Link className="button button-outline justify-center" href={`/espace/entreprises/${businessId}/ventes/${sale.public_id}`}>{t("pos", "viewSale")}</Link></div></div></Modal> : null}</>;
}
