import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/catalog/product-catalog.tsx"), "utf8");

describe("composant catalogue", () => {
  it("présente uniquement les filtres pris en charge par Django", () => {
    expect(source).toContain('query.set("search", search)');
    expect(source).toContain('query.set("status", status)');
    expect(source).toContain('query.set("category", category)');
    expect(source).not.toContain('query.set("ordering"');
  });

  it("rend les attributs catégoriels requis et garde les axes pour les variantes", () => {
    expect(source).toContain("required: attribute.is_required");
    expect(source).toContain("!attribute.is_variant_axis");
    expect(source).toContain("Les axes de variantes ne sont pas des attributs de produit");
  });

  it("conserve la validation native des prix et la protection CSRF des mutations", () => {
    expect(source).toContain('min="0"');
    expect(source).toContain('"x-csrf-protection": "1"');
  });

  it("propose la suppression sans charger la liste des produits", () => {
    expect(source).toContain('permissions?.includes("PRODUCT_DELETE")');
    expect(source).toContain('method: "DELETE"');
    expect(source).toContain("Identifiant du produit");
  });
});
