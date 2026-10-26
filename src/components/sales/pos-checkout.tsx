"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/i18n/locale-provider";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";

type PosProduct = {
  type: "PRODUCT" | "VARIANT";
  public_id: string;
  product_public_id: string;
  name: string;
  variant_label: string | null;
  internal_reference: string | null;
  barcode: string | null;
  effective_price: string;
  currency: string;
  available_quantity: string;
};
type CartLine = PosProduct & { quantity: string };
type PaymentMethod = { public_id: string; name: string; category: string; is_active: boolean };
type Sale = { public_id: string; status: "DRAFT" | "COMPLETED" | "CANCELLED"; total: string; currency: string };

const posPermissions = ["SALE_VIEW", "SALE_CREATE", "SALE_LINE_CREATE", "SALE_COMPLETE"];
const detail = async (response: Response, fallback: string) => {
  const value = await response.json().catch(() => null) as { detail?: string; errors?: Record<string, string[]> } | null;
  return value?.detail ?? (Object.values(value?.errors ?? {}).flat().join(" ") || fallback);
};
const amount = (value: string) => Number(value) || 0;
const keyOf = (item: PosProduct) => `${item.type}:${item.public_id}`;

/** A local basket only prepares calls to Django; it never posts stock or authoritative totals. */
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
  const [method, setMethod] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);
  const [synced, setSynced] = useState<string[]>([]);
  const [phase, setPhase] = useState<"editing" | "draft" | "preparing" | "prepared" | "completing" | "uncertain" | "complete">("editing");
  const [error, setError] = useState<string | null>(null);

  const localTotal = useMemo(() => cart.reduce((total, line) => total + amount(line.effective_price) * amount(line.quantity), 0), [cart]);
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
      .then(setMethods)
      .catch(() => undefined);
    return () => controller.abort();
  }, [allowed, businessId]);

  useEffect(() => {
    const value = query.trim();
    if (!allowed || !value) { setProducts([]); setSearchState("idle"); return; }
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
      setSale(await getSale(currentSale.public_id));
      setPhase("prepared");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("pos", "prepareFailed"));
      setPhase(currentSale ? "draft" : "uncertain");
    }
  }
  async function reconcile() {
    if (!sale) return;
    setError(null);
    try {
      const current = await getSale(sale.public_id);
      setSale(current);
      if (current.status === "COMPLETED") finish(current);
      else setPhase("prepared");
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("pos", "saleUnavailable")); }
  }
  function finish(completed: Sale) {
    setSale(completed); setPhase("complete"); setCart([]); setSynced([]); setMethod("");
  }
  async function complete() {
    if (!sale || !method || phase !== "prepared") return;
    setPhase("completing"); setError(null);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}/sales/${sale.public_id}/complete`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ amount_paid: sale.total, payment_method: method }) });
      if (!response.ok) throw new Error(await detail(response, t("pos", "completeFailed")));
      finish((await response.json() as { sale: Sale }).sale);
    } catch (reason) {
      setError(reason instanceof TypeError ? t("pos", "completionUncertain") : reason instanceof Error ? reason.message : t("pos", "completeFailed"));
      setPhase("uncertain");
    }
  }

  if (permissions === null) return <main><p>{t("pos", "checkingPermission")}</p></main>;
  if (!allowed) return <main><h1 className="text-3xl font-semibold">{t("pos", "title")}</h1><p className="mt-4 text-[var(--error)]" role="alert">{t("pos", "forbidden")}</p></main>;
  if (phase === "complete" && sale) return <main><h1 className="text-3xl font-semibold">{t("pos", "success")}</h1><p className="mt-4" role="status">{t("pos", "saleCompleted")} <strong>{sale.total} {sale.currency}</strong></p><div className="mt-5 flex gap-3"><button className="button button-primary" onClick={() => { setSale(null); setPhase("editing"); }} type="button">{t("pos", "newSale")}</button><Link className="button button-outline" href={`/espace/entreprises/${businessId}/ventes/${sale.public_id}`}>{t("pos", "viewSale")}</Link></div></main>;

  return <main><div><p className="eyebrow">POS</p><h1 className="text-3xl font-semibold text-[var(--brand-secondary)]">{t("pos", "title")}</h1></div>{error ? <p className="mt-4 text-[var(--error)]" role="alert">{error}</p> : null}{sale ? <p className="mt-3 text-sm"><Link className="underline" href={`/espace/entreprises/${businessId}/ventes/${sale.public_id}`}>{t("pos", "draftLink")}</Link></p> : null}<div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]"><section className="content-panel p-5"><h2 className="font-semibold">{t("pos", "catalog")}</h2><label className="mt-3 block"><span className="sr-only">{t("pos", "search")}</span><input autoFocus className="w-full rounded border p-2" disabled={!canEdit} onChange={(event) => setQuery(event.target.value)} placeholder={t("pos", "search")} value={query} /></label>{searchState === "loading" ? <p className="mt-3 text-sm">{t("pos", "searching")}</p> : null}{searchState === "error" ? <p className="mt-3 text-sm text-[var(--error)]">{t("pos", "searchFailed")}</p> : null}{searchState === "conflict" ? <p className="mt-3 text-sm text-[var(--error)]">{t("pos", "searchConflict")}</p> : null}<div className="mt-4 grid gap-3 sm:grid-cols-2">{products.map((product) => <article className="rounded border p-3" key={keyOf(product)}><strong>{product.name}</strong>{product.variant_label ? <p className="text-sm text-[var(--muted)]">{product.variant_label}</p> : null}<p className="mt-2 text-sm">{product.effective_price} {product.currency}</p>{product.internal_reference || product.barcode ? <p className="text-xs text-[var(--muted)]">{product.internal_reference || product.barcode}</p> : null}<p className="text-xs text-[var(--muted)]">{t("pos", "available")}: {product.available_quantity}</p><button className="button button-outline mt-3 text-sm" disabled={!canEdit} onClick={() => add(product)} type="button">{t("pos", "add")}</button></article>)}</div>{query.trim() && searchState === "idle" && !products.length ? <p className="mt-4 text-sm text-[var(--muted)]">{t("pos", "noProducts")}</p> : null}</section><aside className="content-panel p-5"><h2 className="font-semibold">{t("pos", "cart")}</h2>{cart.length ? <ul className="mt-3 divide-y">{cart.map((line) => <li className="py-3" key={keyOf(line)}><div className="flex justify-between gap-2"><strong>{line.name}{line.variant_label ? ` · ${line.variant_label}` : ""}</strong><button className="text-sm underline" disabled={!canEdit} onClick={() => setCart((current) => current.filter((item) => keyOf(item) !== keyOf(line)))} type="button">{t("pos", "remove")}</button></div><p className="text-sm">{line.effective_price} {line.currency} × <input aria-label={t("pos", "quantity")} className="ml-1 w-20 rounded border p-1" disabled={!canEdit} min="0.001" onChange={(event) => setQuantity(keyOf(line), event.target.value)} step="0.001" type="number" value={line.quantity} /> = <strong>{(amount(line.effective_price) * amount(line.quantity)).toFixed(2)} {line.currency}</strong></p></li>)}</ul> : <p className="mt-3 text-sm text-[var(--muted)]">{t("pos", "emptyCart")}</p>}<div className="mt-4 border-t pt-4"><p>{t("pos", "indicativeTotal")}: <strong>{localTotal.toFixed(2)} {cart[0]?.currency ?? ""}</strong></p>{phase === "prepared" && sale ? <><p className="mt-2 text-lg">{t("pos", "serverTotal")}: <strong>{sale.total} {sale.currency}</strong></p><label className="mt-3 block">{t("pos", "paymentMethod")}<select className="mt-1 w-full rounded border p-2" onChange={(event) => setMethod(event.target.value)} value={method}><option value="">{t("pos", "choose")}</option>{activeMethods.map((entry) => <option key={entry.category} value={entry.category}>{entry.name}</option>)}</select></label>{!activeMethods.length ? <p className="mt-2 text-sm text-[var(--error)]">{t("pos", "noPaymentMethod")}</p> : null}<button className="button button-primary mt-4 w-full" disabled={!method || !activeMethods.length} onClick={() => void complete()} type="button">{t("pos", "confirmPayment")}</button></> : phase === "uncertain" && sale ? <button className="button button-primary mt-4 w-full" onClick={() => void reconcile()} type="button">{t("pos", "checkSale")}</button> : <button className="button button-primary mt-4 w-full" disabled={!cart.length || phase === "preparing" || phase === "uncertain"} onClick={() => void prepare()} type="button">{phase === "preparing" ? t("pos", "preparing") : sale ? t("pos", "resumePreparation") : t("pos", "preparePayment")}</button>}{canEdit && cart.length ? <button className="button button-outline mt-3 w-full" onClick={() => { if (window.confirm(t("pos", "clearConfirm"))) setCart([]); }} type="button">{t("pos", "clearCart")}</button> : null}</div></aside></div></main>;
}
