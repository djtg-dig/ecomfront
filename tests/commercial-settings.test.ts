import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const view = source("src/components/businesses/commercial-settings.tsx");
const editor = source("src/components/businesses/commercial-settings-editor.tsx");
const fields = source("src/components/businesses/business-commercial-fields.tsx");
const messages = source("src/lib/i18n/messages.ts");
const page = source("src/app/(private)/espace/entreprises/[businessId]/parametres/fonctionnement-commercial/modifier/page.tsx");

describe("consultation et modification du fonctionnement commercial", () => {
  it("affiche les valeurs enregistrées sans champs modifiables dans la consultation", () => {
    expect(view).toContain('fetch(`/api/private/businesses/${businessId}`');
    expect(view).toContain("commercialSalesLocationOptions");
    expect(view).toContain("commercialSalesChannelOptions");
    expect(view).toContain("commercialDeliveryOptions");
    expect(view).not.toContain("<BusinessCommercialFields");
  });

  it("n’affiche le lien Modifier que pour BUSINESS_UPDATE", () => {
    expect(view).toContain('permissions?.includes("BUSINESS_UPDATE")');
    expect(view).toContain("fonctionnement-commercial/modifier");
  });

  it("refuse la route d’édition sans permission et préremplit seulement le brouillon commercial", () => {
    expect(editor).toContain('permissions?.includes("BUSINESS_UPDATE")');
    expect(editor).toContain('t("commercialSettings", "editForbidden")');
    expect(editor).toContain("commercialSettingsFromBusiness");
    expect(editor).toContain("setInitial(value); setValue(value);");
    expect(editor).toContain("<BusinessCommercialFields");
  });

  it("sérialise exactement les trois champs commerciaux", () => {
    expect(editor).toContain("commercialSettingsPayload");
    expect(editor).toContain("sales_location_type: value.sales_location_type");
    expect(editor).toContain("sales_channel: value.sales_channel");
    expect(editor).toContain("delivery_methods: value.delivery_methods");
    expect(editor).not.toContain("body: JSON.stringify(value)");
  });

  it("gère les configurations historiques et refuse les champs obligatoires absents", () => {
    expect(editor).toContain('sales_location_type as CommercialSettingsValue["sales_location_type"] : ""');
    expect(editor).toContain('sales_channel as CommercialSettingsValue["sales_channel"] : ""');
    expect(editor).toContain("deliveries.has(value)) : []");
    expect(editor).toContain("validateCommercialSettings");
    expect(editor).toContain("deliveryMethodsRequired");
  });

  it("affiche les erreurs de validation Django sous les champs", () => {
    expect(editor).toContain("responseProblem");
    expect(editor).toContain("setFieldErrors(issue.fields)");
    expect(editor).toContain("errors={fieldErrors}");
  });

  it("annule sans PATCH, protège les brouillons et redirige après sauvegarde", () => {
    expect(editor).toContain('window.addEventListener("beforeunload", warn)');
    expect(editor).toContain('window.confirm(t("commercialSettings", "discardConfirm"))');
    expect(editor).toContain('method: "PATCH"');
    expect(editor).toContain("?saved=1");
    expect(editor).toContain("disabled={saving}");
  });

  it("autorise le rendu bloquant explicite de la route dynamique Next.js", () => {
    expect(page).toContain("export const instant = false");
    expect(page).toContain("await params");
  });

  it("conserve les choix exclusifs, multiples et les traductions FR/EN", () => {
    expect(fields).toContain('type="radio"');
    expect(fields).toContain('type="checkbox"');
    expect(fields).toContain("commercialDeliveryOptions");
    expect(messages).toContain("commercialSettingsExtras");
    expect(messages).toContain('edit: "Modifier"');
    expect(messages).toContain('edit: "Edit"');
    expect(messages).toContain("commercialSettingsValidationMessages");
  });
});
