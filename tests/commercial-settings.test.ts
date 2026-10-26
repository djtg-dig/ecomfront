import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(resolve(process.cwd(), "src/components/businesses/commercial-settings.tsx"), "utf8");
const fields = readFileSync(resolve(process.cwd(), "src/components/businesses/business-commercial-fields.tsx"), "utf8");
const manager = readFileSync(resolve(process.cwd(), "src/components/businesses/business-manager.tsx"), "utf8");
const messages = readFileSync(resolve(process.cwd(), "src/lib/i18n/messages.ts"), "utf8");

describe("paramètres de fonctionnement commercial", () => {
  it("présente les choix exclusifs et les modalités multiples", () => {
    expect(fields).toContain('type="radio"');
    expect(fields).toContain('type="checkbox"');
    expect(fields).toContain('delivery_methods.includes');
  });

  it("précharge et enregistre les valeurs via le BFF", () => {
    expect(component).toContain('fetch(`/api/private/businesses/${businessId}`');
    expect(component).toContain('method: "PATCH"');
    expect(component).toContain('setBusiness((await response.json()');
  });

  it("déclare les libellés français et anglais", () => {
    expect(messages).toContain('commercialSettings: { title: "Fonctionnement commercial"');
    expect(messages).toContain('commercialSettings: { title: "Commercial operations"');
  });

  it("réutilise les champs dans la création avec validation client", () => {
    expect(manager).toContain("<BusinessCommercialFields");
    expect(manager).toContain("commercialRequired");
    expect(manager).toContain("...commercial");
    expect(component).toContain("<BusinessCommercialFields");
  });
});
