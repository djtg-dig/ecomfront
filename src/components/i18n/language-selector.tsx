"use client";

import { useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import type { Locale } from "@/lib/i18n/locale";

export function LanguageSelector({ persistPreference = false }: Readonly<{ persistPreference?: boolean }>) {
  const { locale, setVisitorLocale, t } = useLocale();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  async function changeLanguage(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextLocale = event.target.value as Locale;
    if (nextLocale === locale || pending) return;
    setPending(true); setFailed(false);
    try {
      if (persistPreference) {
        const response = await fetch("/api/private/preferences", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify({ preferred_language: nextLocale }) });
        if (!response.ok) throw new Error("preference_update_failed");
      }
      await setVisitorLocale(nextLocale);
    } catch { setFailed(true); } finally { setPending(false); }
  }
  return <label className="inline-flex items-center gap-2 text-sm"><span aria-hidden="true">🌐</span><span className="sr-only">{t("common", "language")}</span><select aria-label={t("common", "language")} className="rounded border border-[var(--line)] bg-transparent px-2 py-1" disabled={pending} onChange={changeLanguage} value={locale}><option value="fr">{t("common", "french")}</option><option value="en">{t("common", "english")}</option></select>{failed ? <span className="text-xs text-[var(--error)]" role="alert">{t("settings", "updateError")}</span> : null}</label>;
}
