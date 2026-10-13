import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const source = readFileSync(resolve(process.cwd(), "src/components/sales/sale-manager.tsx"), "utf8");
describe("gestionnaire de ventes", () => {
  it("demande une confirmation avant finalisation et ne calcule aucun stock", () => { expect(source).toContain("Finaliser cette vente"); expect(source).toContain("Django déduira le stock"); expect(source).not.toContain("available_quantity"); });
  it("utilise les contraintes du contrat pour lignes et paiements", () => { expect(source).toContain('min="0.001"'); expect(source).toContain('min="0"'); expect(source).toContain('amount_paid: paid'); expect(source).toContain("payment_method: method"); });
  it("limite les transitions présentées à complete et cancel", () => { expect(source).toContain("/complete"); expect(source).toContain("/cancel"); expect(source).not.toContain("/confirm"); });
});
