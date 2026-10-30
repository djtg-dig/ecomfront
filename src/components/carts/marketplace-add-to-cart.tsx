"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";

type Cart = { reference: string; business: string; name: string; status: "DRAFT" | "LOCKED" };

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/private/carts/${path}`, { credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, ...init });
  if (response.status === 401) return { unauthenticated: true };
  const payload = await response.json().catch(() => ({})) as { detail?: string; code?: string; results?: Cart[] };
  if (!response.ok) throw new Error(payload.code === "CART_LOCKED" ? "Panier verrouillé." : payload.detail ?? "Le panier est indisponible.");
  return payload;
}

export function MarketplaceAddToCart({ business, product, unit }: { business: string; product: string; unit: string }) {
  const [open, setOpen] = useState(false); const [carts, setCarts] = useState<Cart[]>([]); const [selected, setSelected] = useState(""); const [quantity, setQuantity] = useState("1"); const [loading, setLoading] = useState(false); const [message, setMessage] = useState("");
  const login = () => { window.location.assign(`/connexion?retour=${encodeURIComponent(`/produits/${product}?ajouter_panier=1`)}`); };
  async function start() { setLoading(true); setMessage(""); try { const data = await api("") as { unauthenticated?: boolean; results?: Cart[] }; if (data.unauthenticated) return login(); const drafts = (data.results ?? []).filter((cart) => cart.business === business && cart.status === "DRAFT"); if (!drafts.length) { const added = await api("items", { method: "POST", body: JSON.stringify({ product, quantity }) }); if ((added as { unauthenticated?: boolean }).unauthenticated) return login(); setMessage("Produit ajouté au panier."); return; } setCarts(drafts); setSelected(drafts.length === 1 ? drafts[0].reference : ""); setOpen(true); } catch (error) { setMessage(error instanceof Error ? error.message : "Service temporairement indisponible."); } finally { setLoading(false); } }
  async function confirm() { if (!selected || loading) return; setLoading(true); setMessage(""); try { const result = await api(`${selected}/items`, { method: "POST", body: JSON.stringify({ product, quantity }) }); if ((result as { unauthenticated?: boolean }).unauthenticated) return login(); setOpen(false); setMessage("Produit ajouté au panier."); } catch (error) { setMessage(error instanceof Error ? error.message : "Service temporairement indisponible."); } finally { setLoading(false); } }
  return <><button aria-busy={loading} className="button button-primary mt-7" disabled={loading} onClick={() => void start()} type="button">{loading ? "Ajout…" : "Ajouter au panier"}</button>{message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}{open ? <Modal onClose={() => setOpen(false)} title="Choisir un panier"><div className="grid gap-4"><p className="text-sm text-[var(--muted)]">Quantité ({unit})</p><input className="rounded border p-2" min="0.001" onChange={(event) => setQuantity(event.target.value)} step="0.001" type="number" value={quantity}/><label className="grid gap-1 text-sm">Panier<select className="rounded border p-2" onChange={(event) => setSelected(event.target.value)} value={selected}><option value="">Choisir un panier</option>{carts.map((cart) => <option key={cart.reference} value={cart.reference}>{cart.name}</option>)}</select></label><div className="flex gap-3"><button className="button button-outline" onClick={() => setOpen(false)} type="button">Annuler</button><button className="button button-primary" disabled={!selected || loading} onClick={() => void confirm()} type="button">{loading ? "Ajout…" : "Ajouter"}</button></div></div></Modal> : null}</>;
}
