import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const view = source("src/components/businesses/commercial-settings.tsx");
const editor = source("src/components/businesses/commercial-settings-editor.tsx");
const fields = source("src/components/businesses/business-commercial-fields.tsx");
const messages = source("src/lib/i18n/messages.ts");

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

  it("refuse la route d’édition sans permission et préremplit le formulaire", () => {
    expect(editor).toContain('permissions?.includes("BUSINESS_UPDATE")');
    expect(editor).toContain('t("commercialSettings", "editForbidden")');
    expect(editor).toContain("setInitial(business); setValue(business);");
    expect(editor).toContain("<BusinessCommercialFields");
  });

  it("annule sans PATCH, protège les brouillons et redirige après sauvegarde", () => {
    expect(editor).toContain('window.addEventListener("beforeunload", warn)');
    expect(editor).toContain('window.confirm(t("commercialSettings", "discardConfirm"))');
    expect(editor).toContain('method: "PATCH"');
    expect(editor).toContain("?saved=1");
    expect(editor).toContain("saving || !dirty");
  });

  it("conserve les choix exclusifs, multiples et les traductions FR/EN", () => {
    expect(fields).toContain('type="radio"');
    expect(fields).toContain('type="checkbox"');
    expect(fields).toContain("commercialDeliveryOptions");
    expect(messages).toContain("commercialSettingsExtras");
    expect(messages).toContain('edit: "Modifier"');
    expect(messages).toContain('edit: "Edit"');
  });
});
