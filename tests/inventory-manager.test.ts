import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/inventory/inventory-manager.tsx"), "utf8");

describe("gestionnaire de stocks", () => {
  it("n’expose que les trois mouvements manuels du contrat", () => {
    expect(source).toContain('type: "IN" | "OUT" | "ADJUSTMENT"');
    expect(source).toContain('allowedTypes.includes("IN")');
    expect(source).toContain('allowedTypes.includes("OUT")');
    expect(source).toContain('allowedTypes.includes("ADJUSTMENT")');
    expect(source).not.toContain('setType(event.target.value as "SALE"');
  });
  it("réinterroge Django après un mouvement et désactive la double soumission", () => {
    expect(source).toContain("await Promise.all([loadList(), loadSummary(), loadHistory()])");
    expect(source).toContain("disabled={saving}");
    expect(source).toContain("if (saving) return");
    expect(source).toContain('"idempotency-key": idempotencyKey');
  });
  it("affiche le tableau, les indicateurs et les filtres réels", () => {
    expect(source).toContain("Produits suivis");
    expect(source).toContain("OUT_OF_STOCK");
    expect(source).toContain("Historique des mouvements");
    expect(source).toContain("Produit ou référence");
  });
  it("n’affiche les formulaires que dans des modales autorisées", () => {
    expect(source).toContain('permissions?.includes("INVENTORY_INITIALIZE")');
    expect(source).toContain('permissions?.includes("INVENTORY_ADJUST")');
    expect(source).toContain('<Modal onClose={() => setModal(null)} title="Nouveau mouvement">');
    expect(source).toContain('<Modal onClose={() => setModal(null)} title="Initialiser un stock">');
  });
});
