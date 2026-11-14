import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  businessAddressDraftFromStructured,
  businessAddressErrorsFromResponse,
  emptyBusinessAddressDraft,
  formatStructuredAddress,
  structuredAddressPayload,
  validateBusinessAddress,
} from "@/lib/businesses/address";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("adresse internationale d’entreprise", () => {
  it("préremplit les relations structurées et ne remplace jamais une adresse historique par un payload vide", () => {
    expect(businessAddressDraftFromStructured({
      country: { id: 1, name: "République démocratique du Congo" },
      administrative_area: { id: 2, name: "Kinshasa" },
      locality: { id: 3, name: "Gombe" },
    })).toMatchObject({ country_id: "1", administrative_area_id: "2", locality_id: "3", state: "Kinshasa", city: "Gombe" });
    expect(structuredAddressPayload(emptyBusinessAddressDraft())).toBeNull();
  });

  it("envoie les identifiants compatibles avec Django et conserve les champs libres", () => {
    const draft = { ...emptyBusinessAddressDraft(), country_id: "1", state: "Kinshasa", city: "Kinshasa", street_number: "12B" };
    expect(structuredAddressPayload(draft)).toEqual(expect.objectContaining({ country_id: 1, administrative_area_id: null, locality_id: null, state: "Kinshasa", street_number: "12B" }));
    expect(validateBusinessAddress(emptyBusinessAddressDraft(), true).country_id).toContain("Sélectionnez");
    expect(validateBusinessAddress({ ...emptyBusinessAddressDraft(), city: "Lubumbashi" }, false).country_id).toContain("Sélectionnez");
  });

  it("privilégie l’adresse structurée et extrait les erreurs DRF imbriquées", () => {
    expect(formatStructuredAddress({ country: { id: 1, name: "Congo" }, city: "Kinshasa", street: "Université", street_number: "12" })).toBe("Université 12, Kinshasa, Congo");
    expect(businessAddressErrorsFromResponse({ errors: { structured_address: { country_id: ["Ce champ est obligatoire."] } } })).toEqual({ country_id: "Ce champ est obligatoire." });
  });

  it("charge les référentiels via le BFF et protège les sélections dépendantes contre les réponses obsolètes", () => {
    const fields = source("src/components/businesses/business-address-fields.tsx");
    expect(fields).toContain('"/api/private/geography/countries"');
    expect(fields).toContain("administrative-areas?country_id=");
    expect(fields).toContain("localities?administrative_area_id=");
    expect(fields).toContain("AbortController");
    expect(fields).toContain("cachedAreas");
    expect(fields).toContain("administrative_area_id: \"\", locality_id: \"\"");
    expect(fields).toContain("locality_id: \"\"");
  });

  it("place l’adresse entre les informations générales et le fonctionnement commercial", () => {
    const create = source("src/components/businesses/business-manager.tsx");
    expect(create.indexOf("Informations générales")).toBeLessThan(create.indexOf("<BusinessAddressFields"));
    expect(create.indexOf("<BusinessAddressFields")).toBeLessThan(create.indexOf("<BusinessCommercialFields"));
    expect(create).toContain("structured_address: structuredAddressPayload(address)");
  });
});
