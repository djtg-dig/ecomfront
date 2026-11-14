export type GeographicCountry = {
  id: number;
  name: string;
  iso2?: string;
  phone_code?: string;
};

export type GeographicAdministrativeArea = {
  id: number;
  name: string;
  code?: string;
  country?: GeographicCountry;
};

export type GeographicLocality = {
  id: number;
  name: string;
  code?: string;
  administrative_area?: GeographicAdministrativeArea;
};

/** Adresse renvoyée par l'API Business, avec les relations déjà développées. */
export type StructuredAddress = {
  id?: number;
  country?: GeographicCountry | null;
  administrative_area?: GeographicAdministrativeArea | null;
  locality?: GeographicLocality | null;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  street_number?: string;
  postal_code?: string;
  additional_information?: string;
  formatted_address?: string;
};

export type BusinessAddressDraft = {
  country_id: string;
  administrative_area_id: string;
  locality_id: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  street_number: string;
  postal_code: string;
  additional_information: string;
};

export type BusinessAddressFieldErrors = Partial<Record<keyof BusinessAddressDraft, string>>;

export type StructuredAddressPayload = {
  country_id: number;
  administrative_area_id: number | null;
  locality_id: number | null;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  street_number: string;
  postal_code: string;
  additional_information: string;
};

export const emptyBusinessAddressDraft = (): BusinessAddressDraft => ({
  country_id: "",
  administrative_area_id: "",
  locality_id: "",
  state: "",
  city: "",
  neighborhood: "",
  street: "",
  street_number: "",
  postal_code: "",
  additional_information: "",
});

/** Préserve les champs libres et complète les libellés des relations historiques. */
export function businessAddressDraftFromStructured(address: StructuredAddress | null | undefined): BusinessAddressDraft {
  if (!address) return emptyBusinessAddressDraft();
  return {
    country_id: address.country?.id ? String(address.country.id) : "",
    administrative_area_id: address.administrative_area?.id ? String(address.administrative_area.id) : "",
    locality_id: address.locality?.id ? String(address.locality.id) : "",
    state: address.state || address.administrative_area?.name || "",
    city: address.city || address.locality?.name || "",
    neighborhood: address.neighborhood || "",
    street: address.street || "",
    street_number: address.street_number || "",
    postal_code: address.postal_code || "",
    additional_information: address.additional_information || "",
  };
}

export function businessAddressHasContent(value: BusinessAddressDraft) {
  return Object.entries(value).some(([key, item]) => key !== "country_id" && Boolean(item.trim()));
}

export function validateBusinessAddress(value: BusinessAddressDraft, countryRequired: boolean): BusinessAddressFieldErrors {
  if ((countryRequired || businessAddressHasContent(value)) && !value.country_id) {
    return { country_id: "Sélectionnez le pays de l’entreprise." };
  }
  return {};
}

/** Accepte les erreurs DRF directes ou l'enveloppe d'erreurs du BFF. */
export function businessAddressErrorsFromResponse(body: unknown): BusinessAddressFieldErrors {
  if (!body || typeof body !== "object") return {};
  const root = body as Record<string, unknown>;
  const wrapped = root.errors && typeof root.errors === "object" ? root.errors as Record<string, unknown> : root;
  const source = wrapped.structured_address;
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};
  const fields: BusinessAddressFieldErrors = {};
  for (const key of ["country_id", "administrative_area_id", "locality_id", "state", "city", "neighborhood", "street", "street_number", "postal_code", "additional_information"] as const) {
    const value = (source as Record<string, unknown>)[key];
    const message = Array.isArray(value) ? value[0] : value;
    if (typeof message === "string") fields[key] = message;
  }
  return fields;
}

/** Ne crée pas d'adresse vide lors d'une mise à jour d'entreprise historique. */
export function structuredAddressPayload(value: BusinessAddressDraft): StructuredAddressPayload | null {
  const countryId = Number(value.country_id);
  if (!Number.isInteger(countryId) || countryId <= 0) return null;
  const identifier = (item: string) => {
    const parsed = Number(item);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };
  const text = (item: string) => item.trim();
  return {
    country_id: countryId,
    administrative_area_id: identifier(value.administrative_area_id),
    locality_id: identifier(value.locality_id),
    state: text(value.state),
    city: text(value.city),
    neighborhood: text(value.neighborhood),
    street: text(value.street),
    street_number: text(value.street_number),
    postal_code: text(value.postal_code),
    additional_information: text(value.additional_information),
  };
}

/** Affichage unique de l'adresse structurée, avant tout repli historique. */
export function formatStructuredAddress(address: StructuredAddress | null | undefined) {
  if (!address) return "";
  if (address.formatted_address?.trim()) return address.formatted_address.trim();
  return [
    [address.street, address.street_number].filter(Boolean).join(" "),
    address.neighborhood,
    address.locality?.name || address.city,
    address.administrative_area?.name || address.state,
    address.postal_code,
    address.country?.name,
    address.additional_information,
  ].filter(Boolean).join(", ");
}
