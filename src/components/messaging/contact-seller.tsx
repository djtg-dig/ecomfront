"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, UserCircle, X } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

type Seller = { reference: string; first_name: string; display_name: string; avatar: string | null };

export function ContactSeller({ business }: { business: string }) {
  const { locale } = useLocale();
  const router = useRouter();
  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const english = locale === "en";
  const text = english ? { question: "Have a question about this product?", description: "Chat directly with a seller from this store.", contact: "Contact a seller", member: "You are a member of this business. You cannot contact its sellers as a buyer.", unavailable: "No seller is currently available to receive new conversations.", network: "The seller list could not be loaded. Please try again.", choose: "Choose a seller", close: "Close", retry: "Try again" } : { question: "Une question sur ce produit ?", description: "Discutez directement avec un vendeur de cette boutique.", contact: "Contacter un vendeur", member: "Vous êtes membre de cette entreprise. Vous ne pouvez pas contacter ses vendeurs en tant qu’acheteur.", unavailable: "Aucun vendeur n’est actuellement disponible pour recevoir de nouvelles conversations.", network: "La liste des vendeurs n’a pas pu être chargée. Réessayez.", choose: "Choisissez un vendeur", close: "Fermer", retry: "Réessayer" };
  async function loadSellers() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/private/messaging/sellers/${business}`);
      if (response.status === 401) { window.location.href = `/connexion?retour=${encodeURIComponent(window.location.pathname)}`; return; }
      const body = await response.json().catch(() => null);
      if (response.status === 403 && body?.code === "BUSINESS_MEMBER_CANNOT_CONTACT_SELLER") { setMessage(text.member); return; }
      if (!response.ok) { setMessage(text.network); return; }
      setSellers(body ?? []); if (!body?.length) setMessage(text.unavailable);
    } catch { setMessage(text.network); }
    finally { setBusy(false); }
  }
  async function choose(seller: Seller) {
    setBusy(true);
    try {
      const response = await fetch("/api/private/messaging/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business, seller: seller.reference }) });
      const body = await response.json().catch(() => null);
      if (response.status === 403 && body?.code === "BUSINESS_MEMBER_CANNOT_CONTACT_SELLER") setMessage(text.member);
      else if (!response.ok) setMessage(text.network);
      else if (body?.reference) router.push(`/messages?conversation=${encodeURIComponent(body.reference)}`);
    } catch { setMessage(text.network); }
    finally { setBusy(false); }
  }
  return <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><div className="flex items-start gap-3"><MessageCircle className="mt-0.5 text-[var(--accent)]" size={20} /><div><h2 className="font-semibold text-[var(--ink)]">{text.question}</h2><p className="mt-1 text-sm text-[var(--muted)]">{text.description}</p></div></div><button className="button-secondary mt-4 inline-flex items-center gap-2" disabled={busy} onClick={loadSellers} type="button">{text.contact}</button>{message ? <div className="mt-3 flex items-start justify-between gap-3 text-sm text-[var(--muted)]" role="status"><span>{message}</span>{message === text.network ? <button className="font-medium text-[var(--accent)]" onClick={loadSellers} type="button">{text.retry}</button> : null}</div> : null}{sellers?.length ? <div aria-label={text.choose} className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl bg-black/30 p-4"><div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{text.choose}</h3><button aria-label={text.close} onClick={() => setSellers(null)} type="button"><X size={18} /></button></div><div className="mt-4 grid gap-2">{sellers.map((seller) => <button className="flex min-h-14 items-center gap-3 rounded-xl border border-[var(--line)] p-3 text-left hover:border-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]" disabled={busy} key={seller.reference} onClick={() => choose(seller)} type="button"><UserCircle className="shrink-0 text-[var(--muted)]" size={24} /><span>{seller.first_name}</span></button>)}</div></div></div></div> : null}</div>;
}
