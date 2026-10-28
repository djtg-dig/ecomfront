import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/businesses/business-settings-hub.tsx"), "utf8");

describe("hub des paramètres entreprise", () => {
  it("affiche uniquement les sections autorisées", () => {
    expect(source).toContain("MEMBER_VIEW");
    expect(source).toContain('includes("BUSINESS_UPDATE")');
    expect(source).toContain("Membres et accès");
    expect(source).toContain("Devises et paiements");
  });

  it("propose une navigation administrative responsive", () => {
    expect(source).toContain("Paramètres de l’entreprise");
    expect(source).toContain("sm:grid-cols-2");
    expect(source).toContain("xl:grid-cols-3");
    expect(source).toContain("Chargement des paramètres");
  });
});
