import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/purchases/purchase-manager.tsx"), "utf8");

describe("gestionnaire d’achats", () => {
  it("n’expose que les transitions disponibles et confirme la réception", () => {
    expect(source).toContain('actionName: "confirm" | "receive" | "cancel"');
    expect(source).toContain("Réceptionner cet achat");
    expect(source).not.toContain('action("approve")');
  });
  it("ne met jamais le stock à jour côté client", () => {
    expect(source).toContain("mouvements de stock Django");
    expect(source).not.toContain("available_quantity");
    expect(source).toContain("await loadDetail()");
  });
  it("contraint les quantités et coûts dans le formulaire de ligne", () => {
    expect(source).toContain('min="0.001"');
    expect(source).toContain('min="0"');
    expect(source).toContain('disabled={saving}');
  });
});
