"use client";

import { useLocale } from "@/components/i18n/locale-provider";

export type CommercialSettingsValue = {
  sales_location_type: "HOME_BASED" | "MARKET_STALL" | "PHYSICAL_STORE" | "";
  sales_channel: "IN_PERSON" | "ONLINE" | "BOTH" | "";
  delivery_methods: ("HOME_DELIVERY" | "PICKUP")[];
};

type FieldErrors = Partial<Record<keyof CommercialSettingsValue, string>>;
type Option = readonly [string, string, string];

const locations: readonly Option[] = [["HOME_BASED", "homeBased", "homeBasedDescription"], ["MARKET_STALL", "marketStall", "marketStallDescription"], ["PHYSICAL_STORE", "physicalStore", "physicalStoreDescription"]];
const channels: readonly Option[] = [["IN_PERSON", "inPerson", "inPersonDescription"], ["ONLINE", "online", "onlineDescription"], ["BOTH", "both", "bothDescription"]];
const deliveries: readonly Option[] = [["HOME_DELIVERY", "homeDelivery", "homeDeliveryDescription"], ["PICKUP", "pickup", "pickupDescription"]];

/** Champs contrôlés réutilisables ; chaque écran conserve sa soumission propre. */
export function BusinessCommercialFields({ value, onChange, errors = {} }: { value: CommercialSettingsValue; onChange: (value: CommercialSettingsValue) => void; errors?: FieldErrors }) {
  const { t } = useLocale();
  const set = <K extends keyof CommercialSettingsValue>(key: K, next: CommercialSettingsValue[K]) => onChange({ ...value, [key]: next });
  const radios = (options: readonly Option[], field: "sales_location_type" | "sales_channel") => <div className="mt-3 grid gap-3">{options.map(([option, label, description]) => <label className="rounded-md border p-3" key={option}><input checked={value[field] === option} className="mr-2" name={field} onChange={() => set(field, option as CommercialSettingsValue[typeof field])} type="radio" value={option} /><strong>{t("commercialSettings", label)}</strong><span className="mt-1 block pl-6 text-sm text-[var(--muted)]">{t("commercialSettings", description)}</span></label>)}</div>;
  return <section className="grid gap-8" aria-labelledby="commercial-settings-title"><div><h2 className="text-xl font-semibold" id="commercial-settings-title">{t("commercialSettings", "title")}</h2><p className="mt-2 text-sm text-[var(--muted)]">{t("commercialSettings", "intro")}</p></div><fieldset><legend className="font-semibold">{t("commercialSettings", "salesLocation")}</legend>{radios(locations, "sales_location_type")}{errors.sales_location_type ? <p className="mt-2 text-sm text-[var(--error)]" role="alert">{errors.sales_location_type}</p> : null}</fieldset><fieldset><legend className="font-semibold">{t("commercialSettings", "salesChannel")}</legend>{radios(channels, "sales_channel")}{errors.sales_channel ? <p className="mt-2 text-sm text-[var(--error)]" role="alert">{errors.sales_channel}</p> : null}</fieldset><fieldset><legend className="font-semibold">{t("commercialSettings", "deliveryMethods")}</legend><div className="mt-3 grid gap-3">{deliveries.map(([option, label, description]) => <label className="rounded-md border p-3" key={option}><input checked={value.delivery_methods.includes(option as CommercialSettingsValue["delivery_methods"][number])} className="mr-2" onChange={() => set("delivery_methods", value.delivery_methods.includes(option as CommercialSettingsValue["delivery_methods"][number]) ? value.delivery_methods.filter((item) => item !== option) : [...value.delivery_methods, option as CommercialSettingsValue["delivery_methods"][number]])} type="checkbox" value={option} /><strong>{t("commercialSettings", label)}</strong><span className="mt-1 block pl-6 text-sm text-[var(--muted)]">{t("commercialSettings", description)}</span></label>)}</div>{errors.delivery_methods ? <p className="mt-2 text-sm text-[var(--error)]" role="alert">{errors.delivery_methods}</p> : null}</fieldset></section>;
}
