import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/partners/partner-directory.tsx"), "utf8");

describe("répertoire des partenaires commerciaux", () => {
  it("affiche les listes avant les formulaires et ouvre les créations en modale", () => {
    expect(source).toContain("Partenaires commerciaux");
    expect(source).toContain("Ajouter un ${config[kind].singular}");
    expect(source).toContain("createOpen ? <Modal");
    expect(source).toContain("editing ? <Modal");
  });

  it("respecte les permissions effectives pour chaque répertoire", () => {
    expect(source).toContain('permissions?.includes("CUSTOMER_VIEW")');
    expect(source).toContain('permissions?.includes("SUPPLIER_VIEW")');
    expect(source).toContain('permission: "CUSTOMER_UPDATE"');
    expect(source).toContain('permission: "SUPPLIER_UPDATE"');
  });

  it("préserve les saisies, bloque les doubles soumissions et recharge après succès", () => {
    expect(source).toContain("if (saving) return");
    expect(source).toContain("disabled={saving}");
    expect(source).toContain("void load()");
    expect(source).toContain("setError(await responseMessage(response))");
  });

  it("présente les historiques et les données financières seulement si fournies", () => {
    expect(source).toContain("Historique des");
    expect(source).toContain("profile?.financial_summary ?");
    expect(source).toContain("overflow-x-auto");
  });
});
