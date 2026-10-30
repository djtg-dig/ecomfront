"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/components/i18n/locale-provider";
import { quantityInputAttributes, validateCartQuantity, type QuantityRules } from "@/lib/carts/quantity";
import { fetchBusinesses } from "@/lib/businesses/list-client";

type Cart = { reference: string; business: string; name: string; status: "DRAFT" | "LOCKED" };
type Payload = { unauthenticated?: boolean; results?: Cart[]; reference?: string; detail?: string; code?: string };

class CartApiError extends Error {
  constructor(readonly code?: string, message?: string) { super(message); this.name = "CartApiError"; }
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/private/carts/${path}`, { credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, ...init });
  if (response.status === 401) return { unauthenticated: true } as Payload;
  const payload = await response.json().catch(() => ({})) as Payload;
  if (!response.ok) throw new CartApiError(payload.code, payload.detail);
  return payload;
}

function quantityError(input: string, rules: QuantityRules, t: ReturnType<typeof useLocale>["t"]) {
  const validation = validateCartQuantity(input, rules);
  if (validation.valid) return null;
  if (validation.error === "integer") return t("carts", "wholeQuantityRequired");
  if (validation.error === "precision") return t("carts", "quantityPrecision");
  return t("carts", "invalidQuantity");
}

export function MarketplaceAddToCart({ allowsDecimalQuantity, business, product, unit }: { allowsDecimalQuantity: boolean; business: string; product: string; unit: string }) {
  const { t } = useLocale();
  const rules = { allowsDecimalQuantity };
  const [open, setOpen] = useState(false); const [carts, setCarts] = useState<Cart[]>([]); const [selected, setSelected] = useState(""); const [quantity, setQuantity] = useState("1"); const [loading, setLoading] = useState(false); const [message, setMessage] = useState(""); const [modalError, setModalError] = useState(""); const [cartReference, setCartReference] = useState(""); const [membershipForbidden, setMembershipForbidden] = useState(false);
  useEffect(() => {
    let mounted = true;
    void fetchBusinesses().then((businesses) => {
      if (mounted) setMembershipForbidden(businesses.some((candidate) => candidate.public_id === business));
    }).catch(() => {
      // Membership data may be unavailable for a visitor; Django remains final.
      if (mounted) setMembershipForbidden(false);
    });
    return () => { mounted = false; };
  }, [business]);
  const login = () => { window.location.assign(`/connexion?retour=${encodeURIComponent(`/produits/${product}?ajouter_panier=1`)}`); };
  const readableError = (error: unknown) => error instanceof CartApiError && error.code === "CART_LOCKED" ? t("carts", "cartLocked") : error instanceof Error && error.message ? error.message : t("carts", "actionFailed");
  const validQuantity = () => {
    const validation = validateCartQuantity(quantity, rules);
    if (!validation.valid) { setModalError(quantityError(quantity, rules, t) ?? t("carts", "invalidQuantity")); return null; }
    return validation.value;
  };

  async function start() {
    setLoading(true); setMessage(""); setModalError(""); setCartReference("");
    try {
      const data = await api("");
      if (data.unauthenticated) return login();
      const drafts = (data.results ?? []).filter((cart) => cart.business === business && cart.status === "DRAFT");
      if (!drafts.length) {
        const normalizedQuantity = validQuantity();
        if (!normalizedQuantity) return;
        const added = await api("items", { method: "POST", body: JSON.stringify({ product, quantity: normalizedQuantity }) });
        if (added.unauthenticated) return login();
        setCartReference(added.reference ?? ""); setMessage(t("carts", "addSuccess")); return;
      }
      setCarts(drafts); setSelected(drafts.length === 1 ? drafts[0]!.reference : ""); setOpen(true);
    } catch (error) { if (error instanceof CartApiError && error.code === "BUSINESS_MEMBER_CANNOT_PURCHASE") setMembershipForbidden(true); setMessage(readableError(error)); } finally { setLoading(false); }
  }

  async function confirm() {
    if (!selected || loading) return;
    const normalizedQuantity = validQuantity();
    if (!normalizedQuantity) return;
    setLoading(true); setModalError("");
    try {
      const result = await api(`${encodeURIComponent(selected)}/items`, { method: "POST", body: JSON.stringify({ product, quantity: normalizedQuantity }) });
      if (result.unauthenticated) return login();
      setCartReference(result.reference ?? selected); setOpen(false); setMessage(t("carts", "addSuccess"));
    } catch (error) {
      if (error instanceof CartApiError && error.code === "BUSINESS_MEMBER_CANNOT_PURCHASE") {
        setMembershipForbidden(true); setOpen(false); setMessage(readableError(error));
      } else setModalError(readableError(error));
    } finally { setLoading(false); }
  }

  const inputAttributes = quantityInputAttributes(rules);
  return <>{membershipForbidden ? <p className="mt-7 text-sm text-[var(--error)]" role="status">{t("carts", "memberCannotPurchase")}</p> : <button aria-busy={loading} className="button button-primary mt-7" disabled={loading} onClick={() => void start()} type="button">{loading ? t("carts", "adding") : t("carts", "addToCart")}</button>}{message ? <p className="mt-3 text-sm" role="status">{message}{cartReference ? <> <Link className="underline" href={`/compte/paniers/${encodeURIComponent(cartReference)}`}>{t("carts", "viewMyCart")}</Link></> : null}</p> : null}{open ? <Modal confirmOnClose={false} footer={null} onClose={() => setOpen(false)} title={t("carts", "chooseCartTitle")}><form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void confirm(); }}><label className="grid gap-1 text-sm"><span>{t("carts", "quantity")} ({unit})</span><input {...inputAttributes} className="rounded border p-2" onChange={(event) => { setQuantity(event.target.value); setModalError(""); }} required type="number" value={quantity} /></label><label className="grid gap-1 text-sm"><span>{t("carts", "title")}</span><select className="rounded border p-2" onChange={(event) => setSelected(event.target.value)} required value={selected}><option value="">{t("carts", "chooseCart")}</option>{carts.map((cart) => <option key={cart.reference} value={cart.reference}>{cart.name}</option>)}</select></label>{modalError ? <p className="text-sm text-[var(--error)]" role="alert">{modalError}</p> : null}<div className="flex gap-3"><button className="button button-outline" disabled={loading} onClick={() => setOpen(false)} type="button">{t("carts", "cancel")}</button><button aria-busy={loading} className="button button-primary" disabled={!selected || loading} type="submit">{loading ? t("carts", "adding") : t("carts", "confirmTransfer")}</button></div></form></Modal> : null}</>;
}
