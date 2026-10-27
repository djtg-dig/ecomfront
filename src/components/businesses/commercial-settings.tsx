"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { commercialDeliveryOptions, commercialSalesChannelOptions, commercialSalesLocationOptions, type CommercialSettingsValue } from "@/components/businesses/business-commercial-fields";
import { useLocale } from "@/components/i18n/locale-provider";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";

type Business = CommercialSettingsValue;

async function problem(response: Response, fallback: string) {
  try { return ((await response.json()) as { detail?: string }).detail ?? fallback; } catch { return fallback; }
}

function Setting({ description, label, value }: { description: string; label: string; value: string | null }) {
  return <article className="rounded-md border p-4"><h2 className="font-semibold">{label}</h2><p className="mt-1 text-sm text-[var(--muted)]">{description}</p><p className="mt-3 text-sm">{value ?? <span className="text-[var(--muted)]">—</span>}</p></article>;
}

/** Consultation dédiée : aucune valeur locale n'est substituée aux données Business. */
export function CommercialSettings({ businessId }: { businessId: string }) {
  const { t } = useLocale();
  const permissions = useBusinessPermissions(businessId);
  const searchParams = useSearchParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; startTransition(() => { setBusiness(null); setError(null); void fetch(`/api/private/businesses/${businessId}`, { credentials: "same-origin", cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(await problem(response, t("commercialSettings", "loadError"))); if (active) setBusiness(((await response.json()) as { business: Business }).business); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : t("commercialSettings", "loadError")); }); }); return () => { active = false; }; }, [businessId, t]);
  if (!business) return <main><p className="text-sm text-[var(--muted)]" role={error ? "alert" : undefined}>{error ?? t("commercialSettings", "loading")}</p></main>;
  const location = commercialSalesLocationOptions.find(([code]) => code === business.sales_location_type);
  const channel = commercialSalesChannelOptions.find(([code]) => code === business.sales_channel);
  const deliveries = business.delivery_methods.map((method) => commercialDeliveryOptions.find(([code]) => code === method)).filter((option): option is (typeof commercialDeliveryOptions)[number] => Boolean(option));
  const configured = Boolean(location || channel || deliveries.length);
  return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/parametres`}>← {t("commercialSettings", "back")}</Link><div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">{t("commercialSettings", "eyebrow")}</p><h1 className="mt-2 text-3xl font-semibold text-[var(--brand-secondary)]">{t("commercialSettings", "title")}</h1><p className="mt-3 text-sm text-[var(--muted)]">{t("commercialSettings", "viewIntro")}</p></div>{permissions?.includes("BUSINESS_UPDATE") ? <Link className="button button-primary" href={`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial/modifier`}>{t("commercialSettings", "edit")}</Link> : null}</div>{searchParams.get("saved") === "1" ? <p className="mt-4 text-sm text-[var(--success)]" role="status">{t("commercialSettings", "saved")}</p> : null}{!configured ? <p className="content-panel mt-6 p-5 text-sm text-[var(--muted)]">{t("commercialSettings", "notConfigured")}</p> : <section className="content-panel mt-6 grid gap-4 p-5 md:grid-cols-2"><Setting description={t("commercialSettings", "salesLocationDescription")} label={t("commercialSettings", "salesLocation")} value={location ? t("commercialSettings", location[1]) : null} /><Setting description={t("commercialSettings", "salesChannelDescription")} label={t("commercialSettings", "salesChannel")} value={channel ? t("commercialSettings", channel[1]) : null} /><article className="rounded-md border p-4 md:col-span-2"><h2 className="font-semibold">{t("commercialSettings", "deliveryMethods")}</h2><p className="mt-1 text-sm text-[var(--muted)]">{t("commercialSettings", "deliveryMethodsDescription")}</p>{deliveries.length ? <ul className="mt-3 grid gap-2 sm:grid-cols-2">{deliveries.map(([, label, description]) => <li className="rounded border p-3 text-sm" key={label}><strong>{t("commercialSettings", label)}</strong><span className="mt-1 block text-[var(--muted)]">{t("commercialSettings", description)}</span></li>)}</ul> : <p className="mt-3 text-sm text-[var(--muted)]">{t("commercialSettings", "noDeliveryMethods")}</p>}</article></section>}</main>;
}
