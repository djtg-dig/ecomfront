"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState, type FormEvent } from "react";
import { BusinessAddressFields } from "@/components/businesses/business-address-fields";
import { BusinessCommercialFields, commercialDeliveryOptions, commercialSalesChannelOptions, commercialSalesLocationOptions, type CommercialFieldErrors, type CommercialSettingsValue } from "@/components/businesses/business-commercial-fields";
import { useLocale } from "@/components/i18n/locale-provider";
import { useBusinessPermissions } from "@/components/private/use-business-permissions";
import { businessAddressDraftFromStructured, businessAddressErrorsFromResponse, structuredAddressPayload, validateBusinessAddress, type BusinessAddressDraft, type BusinessAddressFieldErrors, type StructuredAddress } from "@/lib/businesses/address";

type BusinessResponse = Partial<CommercialSettingsValue> & { structured_address?: StructuredAddress | null; address?: string | null };
type BusinessSettingsValue = { commercial: CommercialSettingsValue; address: BusinessAddressDraft };
const locations = new Set(commercialSalesLocationOptions.map(([value]) => value));
const channels = new Set(commercialSalesChannelOptions.map(([value]) => value));
const deliveries = new Set(commercialDeliveryOptions.map(([value]) => value));
const equal = (left: BusinessSettingsValue, right: BusinessSettingsValue) => left.commercial.sales_location_type === right.commercial.sales_location_type && left.commercial.sales_channel === right.commercial.sales_channel && left.commercial.delivery_methods.join(",") === right.commercial.delivery_methods.join(",") && JSON.stringify(left.address) === JSON.stringify(right.address);

/** Transforme explicitement la réponse Business historique en brouillon éditable. */
export function commercialSettingsFromBusiness(business: BusinessResponse): CommercialSettingsValue {
  return {
    sales_location_type: typeof business.sales_location_type === "string" && locations.has(business.sales_location_type) ? business.sales_location_type as CommercialSettingsValue["sales_location_type"] : "",
    sales_channel: typeof business.sales_channel === "string" && channels.has(business.sales_channel) ? business.sales_channel as CommercialSettingsValue["sales_channel"] : "",
    delivery_methods: Array.isArray(business.delivery_methods) ? business.delivery_methods.filter((value): value is CommercialSettingsValue["delivery_methods"][number] => typeof value === "string" && deliveries.has(value)) : [],
  };
}

export function businessSettingsFromBusiness(business: BusinessResponse): BusinessSettingsValue {
  return { commercial: commercialSettingsFromBusiness(business), address: businessAddressDraftFromStructured(business.structured_address) };
}

/** Le PATCH commercial ne transporte jamais les autres champs de Business. */
export function commercialSettingsPayload(value: CommercialSettingsValue) {
  return { sales_location_type: value.sales_location_type, sales_channel: value.sales_channel, delivery_methods: value.delivery_methods };
}

/** N'envoie l'adresse que lorsqu'une adresse structurée existe ou est intentionnellement renseignée. */
export function businessSettingsPayload(value: BusinessSettingsValue) {
  const address = structuredAddressPayload(value.address);
  return { ...commercialSettingsPayload(value.commercial), ...(address ? { structured_address: address } : {}) };
}

export function validateCommercialSettings(value: CommercialSettingsValue, required: Record<keyof CommercialSettingsValue, string>): CommercialFieldErrors {
  return {
    ...(value.sales_location_type ? {} : { sales_location_type: required.sales_location_type }),
    ...(value.sales_channel ? {} : { sales_channel: required.sales_channel }),
    ...(value.delivery_methods.length ? {} : { delivery_methods: required.delivery_methods }),
  };
}

async function responseProblem(response: Response, fallback: string): Promise<{ detail: string; commercialFields: CommercialFieldErrors; addressFields: BusinessAddressFieldErrors }> {
  try {
    const data = await response.json() as { detail?: string; errors?: Record<string, unknown>; sales_location_type?: string[]; sales_channel?: string[]; delivery_methods?: string[] };
    const source = data.errors ?? data;
    const commercialFields: CommercialFieldErrors = {
      ...(Array.isArray(source.sales_location_type) && typeof source.sales_location_type[0] === "string" ? { sales_location_type: source.sales_location_type[0] } : {}),
      ...(Array.isArray(source.sales_channel) && typeof source.sales_channel[0] === "string" ? { sales_channel: source.sales_channel[0] } : {}),
      ...(Array.isArray(source.delivery_methods) && typeof source.delivery_methods[0] === "string" ? { delivery_methods: source.delivery_methods[0] } : {}),
    };
    const addressFields = businessAddressErrorsFromResponse(data);
    return { detail: data.detail ?? Object.values(commercialFields)[0] ?? Object.values(addressFields)[0] ?? fallback, commercialFields, addressFields };
  } catch { return { detail: fallback, commercialFields: {}, addressFields: {} }; }
}

/** L'autorisation UI améliore l'expérience ; le BFF et Django restent l'autorité. */
export function CommercialSettingsEditor({ businessId }: { businessId: string }) {
  const { t } = useLocale(); const router = useRouter(); const permissions = useBusinessPermissions(businessId);
  const allowed = permissions?.includes("BUSINESS_UPDATE") ?? false;
  const [initial, setInitial] = useState<BusinessSettingsValue | null>(null); const [value, setValue] = useState<BusinessSettingsValue | null>(null);
  const [legacyAddress, setLegacyAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); const [fieldErrors, setFieldErrors] = useState<CommercialFieldErrors>({}); const [addressErrors, setAddressErrors] = useState<BusinessAddressFieldErrors>({}); const [saving, setSaving] = useState(false);
  const dirty = useMemo(() => Boolean(initial && value && !equal(initial, value)), [initial, value]);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  useEffect(() => { if (!allowed) return; let active = true; startTransition(() => { setError(null); setFieldErrors({}); setAddressErrors({}); void fetch(`/api/private/businesses/${businessId}`, { credentials: "same-origin", cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error((await responseProblem(response, t("commercialSettings", "loadError"))).detail); const business = ((await response.json()) as { business: BusinessResponse }).business; const value = businessSettingsFromBusiness(business); if (active) { setInitial(value); setValue(value); setLegacyAddress(!business.structured_address && typeof business.address === "string" && business.address.trim() ? business.address : null); } }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : t("commercialSettings", "loadError")); }); }); return () => { active = false; }; }, [allowed, businessId, t]);
  const leave = () => { if (!dirty || window.confirm(t("commercialSettings", "discardConfirm"))) router.push(`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial`); };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!value || saving) return;
    const required = { sales_location_type: t("commercialSettings", "salesLocationRequired"), sales_channel: t("commercialSettings", "salesChannelRequired"), delivery_methods: t("commercialSettings", "deliveryMethodsRequired") };
    const validation = validateCommercialSettings(value.commercial, required); const nextAddressErrors = validateBusinessAddress(value.address, false); setFieldErrors(validation); setAddressErrors(nextAddressErrors); if (Object.keys(validation).length || Object.keys(nextAddressErrors).length) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/private/businesses/${businessId}`, { method: "PATCH", credentials: "same-origin", headers: { "content-type": "application/json", "x-csrf-protection": "1" }, body: JSON.stringify(businessSettingsPayload(value)) });
      if (!response.ok) { const issue = await responseProblem(response, t("commercialSettings", "updateError")); setFieldErrors(issue.commercialFields); setAddressErrors(issue.addressFields); throw new Error(issue.detail); }
      router.push(`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial?saved=1`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : t("commercialSettings", "updateError")); } finally { setSaving(false); }
  }
  if (permissions === null) return <main><p className="text-sm text-[var(--muted)]">{t("commercialSettings", "checkingPermission")}</p></main>;
  if (!allowed) return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial`}>← {t("commercialSettings", "back")}</Link><p className="content-panel mt-6 p-5" role="alert">{t("commercialSettings", "editForbidden")}</p></main>;
  if (!value) return <main><p className="text-sm text-[var(--muted)]" role={error ? "alert" : undefined}>{error ?? t("commercialSettings", "loading")}</p></main>;
  return <main><Link className="nav-link text-sm" href={`/espace/entreprises/${businessId}/parametres/fonctionnement-commercial`} onClick={(event) => { if (dirty && !window.confirm(t("commercialSettings", "discardConfirm"))) event.preventDefault(); }}>← {t("commercialSettings", "back")}</Link><form className="content-panel mt-6 grid gap-6 p-6" onSubmit={save}>{legacyAddress ? <p className="rounded-md border p-3 text-sm text-[var(--muted)]">Adresse historique enregistrée : {legacyAddress}. Elle est conservée sans modification tant qu’une adresse structurée n’est pas renseignée.</p> : null}<BusinessAddressFields countryRequired={false} errors={addressErrors} onChange={(address) => { setValue({ ...value, address }); setAddressErrors({}); }} value={value.address} /><BusinessCommercialFields errors={fieldErrors} onChange={(commercial) => setValue({ ...value, commercial })} value={value.commercial} />{error ? <p className="text-sm text-[var(--error)]" role="alert">{error}</p> : null}<div className="flex flex-wrap gap-3"><button className="button button-outline" disabled={saving} onClick={leave} type="button">{t("commercialSettings", "cancel")}</button><button aria-busy={saving} className="button button-primary" disabled={saving} type="submit">{saving ? t("commercialSettings", "saving") : t("commercialSettings", "saveChanges")}</button></div></form></main>;
}
