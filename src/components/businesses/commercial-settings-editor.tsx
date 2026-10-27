"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState, type FormEvent } from "react";
import { BusinessCommercialFields, commercialDeliveryOptions, commercialSalesChannelOptions, commercialSalesLocationOptions, type CommercialFieldErrors, type CommercialSettingsValue } from "@/components/businesses/business-commercial-fields";
import { useLocale } from "@/components/i18n/locale-provider";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";

type BusinessResponse = Partial<CommercialSettingsValue> & Record<string, unknown>;
const locations = new Set(commercialSalesLocationOptions.map(([value]) => value));
const channels = new Set(commercialSalesChannelOptions.map(([value]) => value));
const deliveries = new Set(commercialDeliveryOptions.map(([value]) => value));
const equal = (left: CommercialSettingsValue, right: CommercialSettingsValue) => left.sales_location_type === right.sales_location_type && left.sales_channel === right.sales_channel && left.delivery_methods.join(",") === right.delivery_methods.join(",");

/** Transforme explicitement la réponse Business historique en brouillon éditable. */
export function commercialSettingsFromBusiness(business: BusinessResponse): CommercialSettingsValue {
  return {
    sales_location_type: typeof business.sales_location_type === "string" && locations.has(business.sales_location_type) ? business.sales_location_type as CommercialSettingsValue["sales_location_type"] : "",
    sales_channel: typeof business.sales_channel === "string" && channels.has(business.sales_channel) ? business.sales_channel as CommercialSettingsValue["sales_channel"] : "",
    delivery_methods: Array.isArray(business.delivery_methods) ? business.delivery_methods.filter((value): value is CommercialSettingsValue["delivery_methods"][number] => typeof value === "string" && deliveries.has(value)) : [],
  };
}

/** Le PATCH commercial ne transporte jamais les autres champs de Business. */
export function commercialSettingsPayload(value: CommercialSettingsValue) {
  return { sales_location_type: value.sales_location_type, sales_channel: value.sales_channel, delivery_methods: value.delivery_methods };
}

export function validateCommercialSettings(value: CommercialSettingsValue, required: Record<keyof CommercialSettingsValue, string>): CommercialFieldErrors {
  return {
    ...(value.sales_location_type ? {} : { sales_location_type: required.sales_location_type }),
    ...(value.sales_channel ? {} : { sales_channel: required.sales_channel }),
    ...(value.delivery_methods.length ? {} : { delivery_methods: required.delivery_methods }),
  };
}

async function responseProblem(response: Response, fallback: string): Promise<{ detail: string; fields: CommercialFieldErrors }> {
  try {
    const data = await response.json() as { detail?: string; sales_location_type?: string[]; sales_channel?: string[]; delivery_methods?: string[] };
    const fields: CommercialFieldErrors = {
      ...(data.sales_location_type?.[0] ? { sales_location_type: data.sales_location_type[0] } : {}),
      ...(data.sales_channel?.[0] ? { sales_channel: data.sales_channel[0] } : {}),
      ...(data.delivery_methods?.[0] ? { delivery_methods: data.delivery_methods[0] } : {}),
    };
    return { detail: data.detail ?? Object.values(fields)[0] ?? fallback, fields };
  } catch { return { detail: fallback, fields: {} }; }
}

/** L'autorisation UI améliore l'expérience ; le BFF et Django restent l'autorité. */
export function CommercialSettingsEditor({ businessId }: { businessId: string }) {
  const { t } = useLocale(); const router = useRouter(); const permissions = useBusinessPermissions(businessId);
  const allowed = permissions?.includes("BUSINESS_UPDATE") ?? false;
  const [initial, setInitial] = useState<CommercialSettingsValue | null>(null); const [value, setValue] = useState<CommercialSettingsValue | null>(null);
  const [error, setError] = useState<string | null>(null); const [fieldErrors, setFieldErrors] = useState<CommercialFieldErrors>({}); const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => Boolean(initial && value && !equal(initial, value)), [initial, value]);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  useEffect(() => { if (!allowed) return; let active = true; startTransition(() => { setError(null); setFieldErrors({}); void fetch(`/api/private/businesses/${businessId}`, { credentials: "same-origin", cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error((await responseProblem(response, t("commercialSettings", "loadError"))).detail); const value = commercialSettingsFromBusiness(((await response.json()) as { business: BusinessResponse }).business); if (active) { setInitial(value); setValue(value); } }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : t("commercialSettings", "loadError")); }); }); return () => { active = false; }; }, [allowed, businessId, t]);
  const leave = () => { if (!dirty || window.confirm(t("commercialSettings", "discardConfirm"))) router.push(`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial`); };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!value || saving) return;
    const required = { sales_location_type: t("commercialSettings", "salesLocationRequired"), sales_channel: t("commercialSettings", "salesChannelRequired"), delivery_methods: t("commercialSettings", "deliveryMethodsRequired") };
    const validation = validateCommercialSettings(value, required); setFieldErrors(validation); if (Object.keys(validation).length) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}`, { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify(commercialSettingsPayload(value)) });
      if (!response.ok) { const issue = await responseProblem(response, t("commercialSettings", "updateError")); setFieldErrors(issue.fields); throw new Error(issue.detail); }
      router.push(`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial?saved=1`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("commercialSettings", "updateError")); } finally { setSaving(false); }
  }
  if (permissions === null) return <main><p className="text-sm text-[var(--muted)]">{t("commercialSettings", "checkingPermission")}</p></main>;
  if (!allowed) return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial`}>← {t("commercialSettings", "back")}</Link><p className="content-panel mt-6 p-5" role="alert">{t("commercialSettings", "editForbidden")}</p></main>;
  if (!value) return <main><p className="text-sm text-[var(--muted)]" role={error ? "alert" : undefined}>{error ?? t("commercialSettings", "loading")}</p></main>;
  return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial`} onClick={(event) => { if (dirty && !window.confirm(t("commercialSettings", "discardConfirm"))) event.preventDefault(); }}>← {t("commercialSettings", "back")}</Link><form className="content-panel mt-6 grid gap-6 p-6" onSubmit={save}><BusinessCommercialFields errors={fieldErrors} onChange={setValue} value={value} />{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<div className="flex flex-wrap gap-3"><button className="button button-outline" disabled={saving} onClick={leave} type="button">{t("commercialSettings", "cancel")}</button><button aria-busy={saving} className="button button-primary" disabled={saving} type="submit">{saving ? t("commercialSettings", "saving") : t("commercialSettings", "saveChanges")}</button></div></form></main>;
}
