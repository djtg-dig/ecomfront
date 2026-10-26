"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { BusinessCommercialFields, type CommercialSettingsValue } from "@/components/businesses/business-commercial-fields";

type Business = CommercialSettingsValue;
async function detail(response: Response, fallback: string) { try { const payload = await response.json() as { detail?: string; delivery_methods?: string[] }; return payload.detail ?? payload.delivery_methods?.[0] ?? fallback; } catch { return fallback; } }

export function CommercialSettings({ businessId }: { businessId: string }) {
  const { t } = useLocale(); const [business, setBusiness] = useState<Business | null>(null); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null); const [saving, setSaving] = useState(false);
  useEffect(() => { let active = true; void fetch(`/api/private/businesses/${businessId}`, { credentials: "same-origin", cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(await detail(response, t("commercialSettings", "loadError"))); if (active) setBusiness((await response.json() as { business: Business }).business); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : t("commercialSettings", "loadError")); }); return () => { active = false; }; }, [businessId, t]);
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!business || saving) return; setSaving(true); setError(null); setNotice(null); try { const payload = { sales_location_type: business.sales_location_type, sales_channel: business.sales_channel, ...(business.delivery_methods.length ? { delivery_methods: business.delivery_methods } : {}) }; const response = await fetch(`/api/private/businesses/${businessId}`, { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(await detail(response, t("commercialSettings", "updateError"))); setBusiness((await response.json() as { business: Business }).business); setNotice(t("commercialSettings", "saved")); } catch (reason) { setError(reason instanceof Error ? reason.message : t("commercialSettings", "updateError")); } finally { setSaving(false); } }
  if (!business) return <main><p className="text-sm text-[var(--muted)]" role={error ? "alert" : undefined}>{error ?? t("common", "saving")}</p></main>;
  return <main><form className="content-panel grid gap-6 p-6" onSubmit={save}><BusinessCommercialFields onChange={setBusiness} value={business} />{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}{notice ? <p className="text-sm text-[var(--success)]" role="status">{notice}</p> : null}<button className="button button-primary w-fit" disabled={saving} type="submit">{saving ? t("commercialSettings", "saving") : t("commercialSettings", "save")}</button></form></main>;
}
