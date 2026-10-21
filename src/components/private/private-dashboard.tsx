"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";

export function PrivateDashboard() {
  const { t } = useLocale();
  return (
    <main>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{t("dashboard", "eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">{t("dashboard", "title")}</h1>
        </div>
        <Link className="button button-primary" href="/espace/entreprises">{t("dashboard", "businesses")}</Link>
      </div>
      <section className="content-panel mt-6 p-7"><h2 className="text-lg font-semibold">{t("dashboard", "activityTitle")}</h2><p className="mt-2 text-sm text-[var(--muted)]">{t("dashboard", "activityDescription")}</p><Link className="button button-outline mt-5" href="/espace/entreprises">{t("dashboard", "viewBusinesses")}</Link></section>
    </main>
  );
}
