"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";

export function ErrorContent({ reset }: Readonly<{ reset: () => void }>) {
  const { t } = useLocale();
  return <main className="page-shell grid place-items-center p-6 text-center"><div><h1 className="text-2xl font-semibold text-[var(--brand-secondary)]">{t("feedback", "errorTitle")}</h1><p className="mt-3 text-[var(--muted)]">{t("feedback", "errorDescription")}</p><button className="button button-primary mt-6" onClick={reset} type="button">{t("feedback", "retry")}</button></div></main>;
}

export function NotFoundContent() {
  const { t } = useLocale();
  return <main className="page-shell grid place-items-center p-6 text-center"><div><p className="eyebrow">404</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">{t("feedback", "notFoundTitle")}</h1><p className="mt-3 text-[var(--muted)]">{t("feedback", "notFoundDescription")}</p><Link className="button button-primary mt-6" href="/">{t("feedback", "returnHome")}</Link></div></main>;
}

export function LoadingContent() {
  const { t } = useLocale();
  return <main className="grid min-h-screen place-items-center bg-[var(--surface)]"><p className="text-sm font-medium text-[var(--muted)]">{t("feedback", "loading")}</p></main>;
}
