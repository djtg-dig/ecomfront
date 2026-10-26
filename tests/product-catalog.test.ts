import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  categoryPayload,
  filterRegistryCategories,
  initialAttributeValues,
  legacyAttributes,
  normalizeProductAttributes,
  registryAttributes,
  type DynamicAttribute,
  type RegistryCategoryDetail,
  type RegistryCategorySummary,
} from "@/lib/catalog/product-registry";
import { formatPriceRange } from "@/lib/money/format";
import { messages } from "@/lib/i18n/messages";

const source = readFileSync(resolve(process.cwd(), "src/components/catalog/product-catalog.tsx"), "utf8");

function category(code: string, attributes: RegistryCategoryDetail["attributes"] = []): RegistryCategoryDetail {
  return { code, label: code, parent: "test", description: "", attributes };
}

function attribute(overrides: Partial<RegistryCategoryDetail["attributes"][number]> = {}): RegistryCategoryDetail["attributes"][number] {
  return { code: "field", label: "Champ", type: "string", required: false, unit: "", options: [], min_value: null, max_value: null, variant: false, ...overrides };
}

describe("registre produits", () => {
  it("charge et recherche une liste de 32 catégories sans catalogue codé en dur", () => {
    const categories: RegistryCategorySummary[] = Array.from({ length: 32 }, (_, index) => ({ code: `category_${index}`, label: index === 7 ? "Téléviseurs" : `Catégorie ${index}`, parent: index % 2 ? "electronics" : "home", description: "" }));
    expect(filterRegistryCategories(categories, "télé")).toEqual([categories[7]]);
    expect(filterRegistryCategories(categories, "electronics")).toHaveLength(16);
    expect(source).toContain('fetch("/api/private/catalog/registry"');
    expect(source).not.toContain('code: "televisions"');
  });

  it("adapte tous les types, options, unités, bornes et axes de variantes", () => {
    const schema = registryAttributes(category("televisions", [
      attribute({ code: "name", type: "string", required: true }),
      attribute({ code: "ports", type: "integer", min_value: "0", max_value: "20" }),
      attribute({ code: "screen", type: "decimal", unit: "inch" }),
      attribute({ code: "smart", type: "boolean" }),
      attribute({ code: "resolution", type: "select", options: ["4K", "8K"] }),
      attribute({ code: "connectivity", type: "multi_select", options: ["wifi", "bluetooth"] }),
      attribute({ code: "storage", type: "integer", variant: true }),
    ]));
    expect(schema.map((item) => item.kind)).toEqual(["string", "integer", "decimal", "boolean", "select", "multi_select", "integer"]);
    expect(schema[1]).toMatchObject({ minimum: "0", maximum: "20" });
    expect(schema[2].unit).toBe("inch");
    expect(schema[4].options).toEqual([{ value: "4K", label: "4K" }, { value: "8K", label: "8K" }]);
    expect(schema[6].variant).toBe(true);
  });

  it("valide les champs obligatoires, nombres, bornes et options", () => {
    const schema: DynamicAttribute[] = registryAttributes(category("televisions", [
      attribute({ code: "screen_size", label: "Taille", type: "decimal", required: true, min_value: "1", max_value: "200" }),
      attribute({ code: "ports", label: "Ports", type: "integer", min_value: "0" }),
      attribute({ code: "resolution", label: "Résolution", type: "select", options: ["4K"] }),
    ]));
    expect(normalizeProductAttributes(schema, {}).errors.screen_size).toContain("obligatoire");
    expect(normalizeProductAttributes(schema, { screen_size: "0" }).errors.screen_size).toContain("supérieur");
    expect(normalizeProductAttributes(schema, { screen_size: "55", ports: "1.5" }).errors.ports).toContain("entier");
    expect(normalizeProductAttributes(schema, { screen_size: "55", resolution: "8K" }).errors.resolution).toContain("invalide");
  });

  it.each([
    ["televisions", [attribute({ code: "screen_size", type: "decimal", required: true })], { screen_size: "43" }, { screen_size: "43" }],
    ["smartphones", [attribute({ code: "ram", type: "integer" })], { ram: "8" }, { ram: 8 }],
    ["shoes", [attribute({ code: "size", type: "decimal", variant: true })], {}, {}],
    ["air_conditioners", [attribute({ code: "inverter", type: "boolean" })], { inverter: "true" }, { inverter: true }],
  ])("construit les attributs de %s", (code, definitions, values, expected) => {
    const result = normalizeProductAttributes(registryAttributes(category(code, definitions)), values);
    expect(result.errors).toEqual({});
    expect(result.attributes).toEqual(expected);
  });

  it("construit une seule source de catégorie dans le payload", () => {
    expect(categoryPayload("registry", "televisions")).toEqual({ category_code: "televisions" });
    expect(categoryPayload("registry", "televisions")).not.toHaveProperty("category");
    expect(categoryPayload("legacy", "TELEVISIONS")).toEqual({ category: "TELEVISIONS" });
    expect(categoryPayload("legacy", "TELEVISIONS")).not.toHaveProperty("category_code");
  });

  it("préserve les attributs historiques et les valeurs existantes", () => {
    const schema = legacyAttributes([{ code: "released", name: "Sortie", data_type: "date", unit: "", is_required: false, is_variant_axis: false }]);
    expect(schema[0].kind).toBe("date");
    expect(initialAttributeValues({ released: "2026-10-16", sizes: ["M", "L"], active: false })).toEqual({ released: "2026-10-16", sizes: ["M", "L"], active: "false" });
    expect(source).toContain("Catégories historiques");
  });
});

describe("interface catalogue dynamique", () => {
  it("affiche une fourchette compacte sans dupliquer une borne égale", () => {
    expect(formatPriceRange("150", "200", "USD")).toContain("–");
    expect(formatPriceRange("150", "150", "USD")).not.toContain("–");
    expect(formatPriceRange("150", "200", "USD")).toContain("USD");
  });
  it("avertit avant un changement de catégorie et préremplit une modification", () => {
    expect(source).toContain("Changer de catégorie supprimera du formulaire");
    expect(source).toContain("sameCategory ? product.attributes");
    expect(source).toContain("preservedUnknownAttributes");
  });

  it("utilise une fourchette, la devise entreprise et la séparation des variantes", () => {
    for (const name of ["min_price", "max_price", "cost_price", "internal_reference", "status"]) expect(source).toContain(`name=\"${name}\"`);
    expect(source).not.toContain('name="currency"');
    expect(source).toContain("Devise de l’entreprise");
    expect(source).toContain("formatPriceRange");
    expect(source).toContain("Aucun stock ni aucune variante n’est créé automatiquement");
    expect(source).toContain("attribute.variant");
  });

  it("conserve permissions, CSRF et erreurs accessibles", () => {
    expect(source).toContain('permissions?.includes("PRODUCT_CREATE")');
    expect(source).toContain('permissions?.includes("PRODUCT_UPDATE")');
    expect(source).toContain('"x-csrf-protection": "1"');
    expect(source).toContain('role="alert"');
    expect(source).toContain('htmlFor="product-category"');
  });

  it("préserve les filtres réellement pris en charge par Django", () => {
    expect(source).toContain('query.set("search", values.search)');
    expect(source).toContain('query.set("status", values.status)');
    expect(source).toContain('query.set("category", values.category)');
    expect(source).not.toContain('query.set("ordering"');
  });

  it("synchronise la pagination avec l’URL et conserve les filtres", () => {
    expect(source).toContain("useSearchParams");
    expect(source).toContain("query.set(\"page\", String(nextPage))");
    expect(source).toContain("router.push(catalogUrl(1))");
    expect(source).toContain('aria-label={t("catalog", "products")}');
    expect(source).toContain('formatMessage(t("catalog", "pagination")');
    expect(messages.fr.catalog.pagination).toContain("Affichage de");
    expect(messages.en.catalog.pagination).toContain("Showing");
    expect(source).toContain("disabled={page === 1}");
    expect(source).toContain("disabled={page >= totalPages}");
    expect(source).toContain("productsResponse?.status === 404 && page > 1");
  });

  it("affiche la miniature principale ou un remplacement accessible dans la liste", () => {
    expect(source).toContain("primary_image_url: string | null");
    expect(source).toContain("function ProductThumbnail");
    expect(source).toContain('aria-label={t("catalog", "unavailablePhoto")}');
    expect(messages.fr.catalog.unavailablePhoto).toBe("Aucune photo disponible");
    expect(messages.en.catalog.unavailablePhoto).toBe("No photo available");
    expect(source).toContain("src={product.primary_image_url}");
    expect(source).toContain("<ProductThumbnail product={item} />");
  });
});
