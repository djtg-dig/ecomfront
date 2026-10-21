"use client";

import Link from "next/link";
import { HomeAuthenticationAction } from "@/components/auth/home-authentication-action";
import { useLocale } from "@/components/i18n/locale-provider";

export function HomeContent() {
  const { t } = useLocale();
  return <section className="site-container grid min-h-[calc(100vh-9rem)] content-center gap-10 py-16 lg:grid-cols-[1.25fr_0.75fr]"><div className="max-w-2xl"><p className="eyebrow mb-4">{t("home", "eyebrow")}</p><h1 className="text-4xl font-semibold leading-tight text-[var(--brand-secondary)] sm:text-5xl">{t("home", "title")}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">{t("home", "description")}</p><Link className="button button-outline mt-8" href="/fonctionnalites">{t("home", "explore")}</Link><HomeAuthenticationAction /></div><aside className="content-panel accent-rule border-l-4 p-6 sm:p-8"><h2 className="text-sm font-semibold text-[var(--brand-secondary)]">{t("home", "accessTitle")}</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{t("home", "accessDescription")}</p></aside></section>;
}

export function InformationalPage({ page }: Readonly<{ page: "contact" | "pricing" | "terms" | "privacy" | "cookies" }>) {
  const { t } = useLocale();
  const keys = { contact: ["contactEyebrow", "contactTitle", "contactDescription"], pricing: ["pricingEyebrow", "pricingTitle", "pricingDescription"], terms: [undefined, "termsTitle", "termsDescription"], privacy: [undefined, "privacyTitle", "privacyDescription"], cookies: [undefined, "cookiesTitle", "cookiesDescription"] } as const;
  const [eyebrow, title, description] = keys[page];
  return <section className="site-container py-16 sm:py-20">{eyebrow ? <p className="eyebrow">{t("public", eyebrow)}</p> : null}<h1 className="mt-4 text-4xl font-semibold leading-tight text-[var(--brand-secondary)] sm:text-5xl">{t("public", title)}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">{t("public", description)}</p></section>;
}

export function FeaturesContent() {
  const { t } = useLocale();
  const capabilities = [["teamsTitle", "teamsDescription"], ["catalogTitle", "catalogDescription"], ["tradeTitle", "tradeDescription"], ["financeTitle", "financeDescription"]] as const;
  return <><section className="site-container py-16 sm:py-20"><p className="eyebrow">{t("public", "featuresEyebrow")}</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-[var(--brand-secondary)] sm:text-5xl">{t("public", "featuresTitle")}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">{t("public", "featuresDescription")}</p></section><section aria-labelledby="capabilities-title" className="border-y border-[var(--line)] bg-[var(--surface-raised)]"><div className="site-container py-12"><h2 id="capabilities-title" className="text-2xl font-semibold">{t("public", "scope")}</h2><ul className="mt-8 grid gap-7 sm:grid-cols-2">{capabilities.map(([title, description]) => <li key={title} className="accent-rule border-l-4 pl-5"><h3 className="text-lg font-semibold text-[var(--brand-secondary)]">{t("public", title)}</h3><p className="mt-2 leading-7 text-[var(--muted)]">{t("public", description)}</p></li>)}</ul></div></section></>;
}
