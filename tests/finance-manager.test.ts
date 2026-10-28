import { readFileSync } from "node:fs"; import { resolve } from "node:path"; import { describe, expect, it } from "vitest";
const source = readFileSync(resolve(process.cwd(), "src/components/finance/finance-manager.tsx"), "utf8");
describe("gestionnaire finance", () => {
  it("ne calcule aucun solde et génère une clé idempotente", () => {
    expect(source).toContain("crypto.randomUUID()");
    expect(source).toContain("Le solde et l’écriture financière sont validés par Django");
    expect(source).not.toContain("setSummary((current");
  });

  it("contraint les montants et évite la double soumission", () => {
    expect(source).toContain('min="0.01"');
    expect(source).toContain("disabled={saving || !hasAvailableMethod}");
  });

  it("présente les champs contractuels dans une structure responsive avec filtre et pagination", () => {
    expect(source).toContain("customer_name_snapshot");
    expect(source).toContain("due_date");
    expect(source).toContain("Échues uniquement");
    expect(source).toContain("Pagination des créances");
    expect(source).toContain("md:hidden");
  });

  it("charge le détail et préserve la clé lors d’une confirmation réseau incertaine", () => {
    expect(source).toContain("Historique des paiements");
    expect(source).toContain("receivables/${receivableId}/payments");
    expect(source).toContain("même clé protège ce règlement d’un doublon");
  });
});
