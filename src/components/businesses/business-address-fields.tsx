"use client";

import { useEffect, useRef, useState } from "react";

import {
  type BusinessAddressDraft,
  type BusinessAddressFieldErrors,
  type GeographicAdministrativeArea,
  type GeographicCountry,
  type GeographicLocality,
} from "@/lib/businesses/address";

type CollectionResponse<T> = { countries?: T[]; administrative_areas?: T[]; localities?: T[]; detail?: string };

let cachedCountries: GeographicCountry[] | null = null;
const cachedAreas = new Map<string, GeographicAdministrativeArea[]>();
const cachedLocalities = new Map<string, GeographicLocality[]>();

async function collection<T>(url: string, property: "countries" | "administrative_areas" | "localities", signal: AbortSignal) {
  const response = await fetch(url, { credentials: "same-origin", signal });
  const body = await response.json() as CollectionResponse<T>;
  if (!response.ok) throw new Error(body.detail || "Le référentiel géographique est indisponible.");
  return body[property] ?? [];
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  return message ? <p className="mt-1 text-sm text-[var(--error)]" id={id} role="alert">{message}</p> : null;
}

/** Champs d'adresse internationaux réutilisés par la création et la modification. */
export function BusinessAddressFields({
  value,
  onChange,
  errors = {},
  countryRequired,
}: {
  value: BusinessAddressDraft;
  onChange: (value: BusinessAddressDraft) => void;
  errors?: BusinessAddressFieldErrors;
  countryRequired: boolean;
}) {
  const [countries, setCountries] = useState<GeographicCountry[]>(cachedCountries ?? []);
  const [countrySearch, setCountrySearch] = useState("");
  const [areas, setAreas] = useState<GeographicAdministrativeArea[]>(cachedAreas.get(value.country_id) ?? []);
  const [localities, setLocalities] = useState<GeographicLocality[]>(cachedLocalities.get(value.administrative_area_id) ?? []);
  const [countriesError, setCountriesError] = useState<string | null>(null);
  const [areasError, setAreasError] = useState<string | null>(null);
  const [localitiesError, setLocalitiesError] = useState<string | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(!cachedCountries);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingLocalities, setLoadingLocalities] = useState(false);
  const countryRequest = useRef(0);
  const areaRequest = useRef(0);
  const localityRequest = useRef(0);

  useEffect(() => {
    if (cachedCountries) return;
    const controller = new AbortController();
    const request = ++countryRequest.current;
    void collection<GeographicCountry>("/api/private/geography/countries", "countries", controller.signal)
      .then((items) => {
        if (request !== countryRequest.current) return;
        const sorted = [...items].sort((left, right) => left.name.localeCompare(right.name, "fr"));
        cachedCountries = sorted;
        setCountries(sorted);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (request === countryRequest.current) setCountriesError(reason instanceof Error ? reason.message : "Impossible de charger les pays.");
      })
      .finally(() => { if (request === countryRequest.current) setLoadingCountries(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!value.country_id) { setAreas([]); setAreasError(null); setLoadingAreas(false); return; }
    const cached = cachedAreas.get(value.country_id);
    if (cached) { setAreas(cached); setAreasError(null); setLoadingAreas(false); return; }
    const controller = new AbortController();
    const request = ++areaRequest.current;
    setAreas([]); setAreasError(null); setLoadingAreas(true);
    void collection<GeographicAdministrativeArea>(`/api/private/geography/administrative-areas?country_id=${encodeURIComponent(value.country_id)}`, "administrative_areas", controller.signal)
      .then((items) => {
        if (request !== areaRequest.current) return;
        const sorted = [...items].sort((left, right) => left.name.localeCompare(right.name, "fr"));
        cachedAreas.set(value.country_id, sorted);
        setAreas(sorted);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (request === areaRequest.current) setAreasError(reason instanceof Error ? reason.message : "Impossible de charger les subdivisions.");
      })
      .finally(() => { if (request === areaRequest.current) setLoadingAreas(false); });
    return () => controller.abort();
  }, [value.country_id]);

  useEffect(() => {
    if (!value.administrative_area_id) { setLocalities([]); setLocalitiesError(null); setLoadingLocalities(false); return; }
    const cached = cachedLocalities.get(value.administrative_area_id);
    if (cached) { setLocalities(cached); setLocalitiesError(null); setLoadingLocalities(false); return; }
    const controller = new AbortController();
    const request = ++localityRequest.current;
    setLocalities([]); setLocalitiesError(null); setLoadingLocalities(true);
    void collection<GeographicLocality>(`/api/private/geography/localities?administrative_area_id=${encodeURIComponent(value.administrative_area_id)}`, "localities", controller.signal)
      .then((items) => {
        if (request !== localityRequest.current) return;
        const sorted = [...items].sort((left, right) => left.name.localeCompare(right.name, "fr"));
        cachedLocalities.set(value.administrative_area_id, sorted);
        setLocalities(sorted);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        if (request === localityRequest.current) setLocalitiesError(reason instanceof Error ? reason.message : "Impossible de charger les localités.");
      })
      .finally(() => { if (request === localityRequest.current) setLoadingLocalities(false); });
    return () => controller.abort();
  }, [value.administrative_area_id]);

  const set = <K extends keyof BusinessAddressDraft>(key: K, next: BusinessAddressDraft[K]) => onChange({ ...value, [key]: next });
  const selectedArea = areas.find((item) => String(item.id) === value.administrative_area_id);
  const selectedLocality = localities.find((item) => String(item.id) === value.locality_id);
  const visibleCountries = countries.filter((country) => `${country.name} ${country.iso2 ?? ""}`.toLocaleLowerCase("fr").includes(countrySearch.trim().toLocaleLowerCase("fr")));

  return <section aria-labelledby="business-address-title" className="grid gap-5">
    <div>
      <h2 className="text-xl font-semibold" id="business-address-title">Adresse de l’entreprise</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Indiquez l’emplacement principal de votre activité commerciale.</p>
    </div>

    <label>Rechercher un pays
      <input className="mt-1 w-full rounded-md border px-3 py-2" onChange={(event) => setCountrySearch(event.target.value)} placeholder="Nom ou code ISO" type="search" value={countrySearch} />
    </label>
    <label>Pays
      <select aria-describedby={errors.country_id ? "business-country-error" : undefined} className="mt-1 w-full rounded-md border px-3 py-2" disabled={loadingCountries} onChange={(event) => onChange({ ...value, country_id: event.target.value, administrative_area_id: "", locality_id: "" })} required={countryRequired} value={value.country_id}>
        <option value="">{loadingCountries ? "Chargement des pays…" : "Sélectionnez un pays"}</option>
        {visibleCountries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
      </select>
      <FieldError id="business-country-error" message={errors.country_id} />
      {countriesError ? <p className="mt-1 text-sm text-[var(--error)]" role="alert">{countriesError}</p> : null}
    </label>

    <div className="grid gap-5 md:grid-cols-2">
      <label>Province / Région / État
        <select className="mt-1 w-full rounded-md border px-3 py-2" disabled={!value.country_id || loadingAreas} onChange={(event) => {
          const next = event.target.value;
          const area = areas.find((item) => String(item.id) === next);
          onChange({ ...value, administrative_area_id: next, locality_id: "", state: area?.name ?? value.state });
        }} value={value.administrative_area_id}>
          <option value="">{loadingAreas ? "Chargement des subdivisions…" : areas.length ? "Saisie libre ou sélection" : "Aucune subdivision disponible"}</option>
          {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
        </select>
        {areasError ? <p className="mt-1 text-sm text-[var(--error)]" role="alert">{areasError}</p> : null}
        <input className="mt-2 w-full rounded-md border px-3 py-2" disabled={Boolean(selectedArea)} onChange={(event) => set("state", event.target.value)} placeholder="Ex. Kinshasa" value={selectedArea?.name ?? value.state} />
        <FieldError message={errors.administrative_area_id ?? errors.state} />
      </label>
      <label>Ville / Localité
        <select className="mt-1 w-full rounded-md border px-3 py-2" disabled={!value.administrative_area_id || loadingLocalities} onChange={(event) => {
          const next = event.target.value;
          const locality = localities.find((item) => String(item.id) === next);
          onChange({ ...value, locality_id: next, city: locality?.name ?? value.city });
        }} value={value.locality_id}>
          <option value="">{loadingLocalities ? "Chargement des localités…" : localities.length ? "Saisie libre ou sélection" : "Aucune localité disponible"}</option>
          {localities.map((locality) => <option key={locality.id} value={locality.id}>{locality.name}</option>)}
        </select>
        {localitiesError ? <p className="mt-1 text-sm text-[var(--error)]" role="alert">{localitiesError}</p> : null}
        <input className="mt-2 w-full rounded-md border px-3 py-2" disabled={Boolean(selectedLocality)} onChange={(event) => set("city", event.target.value)} placeholder="Ex. Kinshasa" value={selectedLocality?.name ?? value.city} />
        <FieldError message={errors.locality_id ?? errors.city} />
      </label>
    </div>

    <div className="grid gap-5 md:grid-cols-2">
      <label>Commune / Quartier<input className="mt-1 w-full rounded-md border px-3 py-2" onChange={(event) => set("neighborhood", event.target.value)} placeholder="Ex. Lemba" value={value.neighborhood} /><FieldError message={errors.neighborhood} /></label>
      <label>Avenue / Rue<span className="mt-1 block text-xs text-[var(--muted)]">Voie ou axe principal de l’activité.</span><input className="mt-1 w-full rounded-md border px-3 py-2" onChange={(event) => set("street", event.target.value)} placeholder="Ex. Université" value={value.street} /><FieldError message={errors.street} /></label>
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      <label>Numéro<input className="mt-1 w-full rounded-md border px-3 py-2" onChange={(event) => set("street_number", event.target.value)} placeholder="Ex. 12" value={value.street_number} /><FieldError message={errors.street_number} /></label>
      <label>Code postal<input className="mt-1 w-full rounded-md border px-3 py-2" onChange={(event) => set("postal_code", event.target.value)} placeholder="Ex. 1000" value={value.postal_code} /><FieldError message={errors.postal_code} /></label>
    </div>
    <label>Informations complémentaires<textarea className="mt-1 min-h-24 w-full rounded-md border px-3 py-2" onChange={(event) => set("additional_information", event.target.value)} placeholder="Point de repère, accès ou précision utile" value={value.additional_information} /><FieldError message={errors.additional_information} /></label>
  </section>;
}
