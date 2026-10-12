import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/inventory/inventory-manager.tsx"), "utf8");

describe("gestionnaire de stocks", () => {
  it("n’expose que les trois mouvements manuels du contrat", () => {
    expect(source).toContain('type: "IN" | "OUT" | "ADJUSTMENT"');
    expect(source).not.toContain('<option value="TRANSFER">');
    expect(source).not.toContain('<option value="SALE">');
  });
  it("réinterroge Django après un mouvement et désactive la double soumission", () => {
    expect(source).toContain("onCreated={() => void loadDetail()}");
    expect(source).toContain("disabled={saving}");
    expect(source).toContain("calculés exclusivement par Django");
  });
  it("prend en charge le filtre stock faible réellement disponible", () => {
    expect(source).toContain('"?low_stock=true"');
    expect(source).toContain("is_low_stock");
  });
});
