"use client";

import Link from "next/link";
import { LanguageSelector } from "@/components/i18n/language-selector";
import { useLocale } from "@/components/i18n/locale-provider";

export function PrivateSettings() {
  const { t } = useLocale();
  return <main><p className="eyebrow">{t("settings", "account")}</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">{t("settings", "title")}</h1><section className="content-panel mt-6 p-6"><h2 className="text-xl font-semibold">{t("settings", "interfaceLanguage")}</h2><p className="mt-3 text-sm text-[var(--muted)]">{t("settings", "interfaceLanguageDescription")}</p><div className="mt-5"><LanguageSelector persistPreference /></div></section><section className="content-panel mt-6 p-6"><h2 className="text-xl font-semibold">{t("settings", "personalAccount")}</h2><p className="mt-3 text-sm text-[var(--muted)]">{t("settings", "personalDescription")}</p></section><section className="content-panel mt-6 p-6"><h2 className="text-xl font-semibold">{t("settings", "workspaces")}</h2><p className="mt-3 text-sm text-[var(--muted)]">{t("settings", "workspacesDescription")}</p><Link className="button button-outline mt-5" href="/espace/entreprises">{t("navigation", "businesses")}</Link></section></main>;
}
