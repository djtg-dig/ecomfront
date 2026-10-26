"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BusinessCommercialFields, type CommercialSettingsValue } from "@/components/businesses/business-commercial-fields";
import { useLocale } from "@/components/i18n/locale-provider";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";

type Business = CommercialSettingsValue;
const equal = (left: CommercialSettingsValue, right: CommercialSettingsValue) => left.sales_location_type === right.sales_location_type && left.sales_channel === right.sales_channel && left.delivery_methods.join(",") === right.delivery_methods.join(",");
async function problem(response: Response, fallback: string) { try { const data = await response.json() as { detail?: string; sales_location_type?: string[]; sales_channel?: string[]; delivery_methods?: string[] }; return data.detail ?? data.sales_location_type?.[0] ?? data.sales_channel?.[0] ?? data.delivery_methods?.[0] ?? fallback; } catch { return fallback; } }

/** L'autorisation UI améliore l'expérience ; le BFF et Django restent l'autorité. */
export function CommercialSettingsEditor({ businessId }: { businessId: string }) {
  const { t } = useLocale();
  const router = useRouter();
  const permissions = useBusinessPermissions(businessId);
  const allowed = permissions?.includes("BUSINESS_UPDATE") ?? false;
  const [initial, setInitial] = useState<Business | null>(null);
  const [value, setValue] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => Boolean(initial && value && !equal(initial, value)), [initial, value]);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  useEffect(() => { if (!allowed) return; let active = true; setError(null); void fetch(`/api/private/businesses/${businessId}`, { credentials: "same-origin", cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(await problem(response, t("commercialSettings", "loadError"))); const business = ((await response.json()) as { business: Business }).business; if (active) { setInitial(business); setValue(business); } }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : t("commercialSettings", "loadError")); }); return () => { active = false; }; }, [allowed, businessId, t]);
  const leave = () => { if (!dirty || window.confirm(t("commercialSettings", "discardConfirm"))) router.push(`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial`); };
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!value || saving) return; setSaving(true); setError(null); try { const response = await fetch(`/api/private/businesses/${businessId}`, { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify(value) }); if (!response.ok) throw new Error(await problem(response, t("commercialSettings", "updateError"))); router.push(`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial?saved=1`); } catch (reason) { setError(reason instanceof Error ? reason.message : t("commercialSettings", "updateError")); } finally { setSaving(false); } }
  if (permissions === null) return <main><p className="text-sm text-[var(--muted)]">{t("commercialSettings", "checkingPermission")}</p></main>;
  if (!allowed) return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial`}>← {t("commercialSettings", "back")}</Link><p className="content-panel mt-6 p-5" role="alert">{t("commercialSettings", "editForbidden")}</p></main>;
  if (!value) return <main><p className="text-sm text-[var(--muted)]" role={error ? "alert" : undefined}>{error ?? t("commercialSettings", "loading")}</p></main>;
  return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial`} onClick={(event) => { if (dirty && !window.confirm(t("commercialSettings", "discardConfirm"))) event.preventDefault(); }}>← {t("commercialSettings", "back")}</Link><form className="content-panel mt-6 grid gap-6 p-6" onSubmit={save}><BusinessCommercialFields onChange={setValue} value={value} />{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<div className="flex flex-wrap gap-3"><button className="button button-outline" disabled={saving} onClick={leave} type="button">{t("commercialSettings", "cancel")}</button><button aria-busy={saving} className="button button-primary" disabled={saving || !dirty} type="submit">{saving ? t("commercialSettings", "saving") : t("commercialSettings", "saveChanges")}</button></div></form></main>;
}
