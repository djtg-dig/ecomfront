"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";

export function ContactSeller({ business }: { business: string }) {
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  async function contact() {
    setBusy(true);
    const sellers = await fetch(`/api/private/messaging/sellers/${business}`).then((response) => response.ok ? response.json() : null).catch(() => null);
    if (!sellers?.length) { window.location.href = `/connexion?retour=${encodeURIComponent(window.location.pathname)}`; return; }
    const conversation = await fetch("/api/private/messaging/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business, seller: sellers[0].reference }) }).then((response) => response.ok ? response.json() : null).catch(() => null);
    setBusy(false);
    if (conversation?.reference) window.location.href = `/messages?conversation=${conversation.reference}`;
  }
  return <button className="button-secondary mt-4 inline-flex items-center gap-2" disabled={busy} onClick={contact} type="button"><MessageCircle size={16} />{locale === "en" ? "Contact seller" : "Contacter le vendeur"}</button>;
}
