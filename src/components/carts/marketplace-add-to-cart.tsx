"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/components/i18n/locale-provider";

type Cart = { reference: string; business: string; name: string; status: "DRAFT" | "LOCKED" };
type Payload = { unauthenticated?: boolean; results?: Cart[]; reference?: string; detail?: string; code?: string };

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/private/carts/${path}`, { credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, ...init });
  if (response.status === 401) return { unauthenticated: true } as Payload;
  const payload = await response.json().catch(() => ({})) as Payload;
  if (!response.ok) throw new Error(payload.code === "CART_LOCKED" ? "CART_LOCKED" : payload.detail ?? "cart_unavailable");
  return payload;
}

export function MarketplaceAddToCart({ business, product, unit }: { business: string; product: string; unit: string }) {
  const { t } = useLocale(); const [open, setOpen] = useState(false); const [carts, setCarts] = useState<Cart[]>([]); const [selected, setSelected] = useState(""); const [quantity, setQuantity] = useState("1"); const [loading, setLoading] = useState(false); const [message, setMessage] = useState(""); const [cartReference, setCartReference] = useState("");
  const login = () => { window.location.assign(`/connexion?retour=${encodeURIComponent(`/produits/${product}?ajouter_panier=1`)}`); };
  const fail = (error: unknown) => setMessage(error instanceof Error && error.message === "CART_LOCKED" ? t("carts", "cartLocked") : t("carts", "productUnavailable"));
  async function start() { setLoading(true); setMessage(""); setCartReference(""); try { const data = await api(""); if (data.unauthenticated) return login(); const drafts = (data.results ?? []).filter((cart) => cart.business === business && cart.status === "DRAFT"); if (!drafts.length) { const added = await api("items", { method: "POST", body: JSON.stringify({ product, quantity }) }); if (added.unauthenticated) return login(); setCartReference(added.reference ?? ""); setMessage(t("carts", "addSuccess")); return; } setCarts(drafts); setSelected(drafts.length === 1 ? drafts[0]!.reference : ""); setOpen(true); } catch (error) { fail(error); } finally { setLoading(false); } }
  async function confirm() { if (!selected || loading) return; setLoading(true); setMessage(""); try { const result = await api(`${selected}/items`, { method: "POST", body: JSON.stringify({ product, quantity }) }); if (result.unauthenticated) return login(); setCartReference(result.reference ?? selected); setOpen(false); setMessage(t("carts", "addSuccess")); } catch (error) { fail(error); } finally { setLoading(false); } }
  return <><button aria-busy={loading} className="button button-primary mt-7" disabled={loading} onClick={() => void start()} type="button">{loading ? t("carts", "adding") : t("carts", "addToCart")}</button>{message ? <p className="mt-3 text-sm" role="status">{message}{cartReference ? <> <Link className="underline" href={`/compte/paniers/${encodeURIComponent(cartReference)}`}>{t("carts", "viewMyCart")}</Link></> : null}</p> : null}{open ? <Modal confirmOnClose={false} footer={null} onClose={() => setOpen(false)} title={t("carts", "chooseCartTitle")}><div className="grid gap-4"><label className="grid gap-1 text-sm"><span>{t("carts", "quantity")} ({unit})</span><input className="rounded border p-2" min="0.001" onChange={(event) => setQuantity(event.target.value)} step="0.001" type="number" value={quantity} /></label><label className="grid gap-1 text-sm"><span>{t("carts", "title")}</span><select className="rounded border p-2" onChange={(event) => setSelected(event.target.value)} value={selected}><option value="">{t("carts", "chooseCart")}</option>{carts.map((cart) => <option key={cart.reference} value={cart.reference}>{cart.name}</option>)}</select></label><div className="flex gap-3"><button className="button button-outline" onClick={() => setOpen(false)} type="button">{t("carts", "cancel")}</button><button className="button button-primary" disabled={!selected || loading} onClick={() => void confirm()} type="button">{loading ? t("carts", "adding") : t("carts", "addToCart")}</button></div></div></Modal> : null}</>;
}
