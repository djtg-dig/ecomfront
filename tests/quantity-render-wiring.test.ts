import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("rendus de quantités", () => {
  it("raccorde le détail de vente, la facture et le retour au formateur", () => {
    const sales = source("src/components/sales/sale-manager.tsx");
    expect(sales).toContain("formatQuantityWithUnit(line.quantity, locale, line.allows_decimal_quantity, line.unit_symbol_snapshot)");
    expect(sales).toContain("formatQuantity(returned.toFixed(3), locale, !pcs)");
    expect(sales).toContain("formatQuantityWithUnit(item.available_quantity, locale, item.allows_decimal_quantity, item.unit_symbol)");
    expect(sales).not.toContain("const pcs = line.unit_symbol_snapshot === \"PCS\"");
  });

  it("raccorde les achats, stocks et mouvements au formateur", () => {
    expect(source("src/components/purchases/purchase-manager.tsx")).toContain("formatQuantityWithUnit(line.quantity, \"fr\", line.allows_decimal_quantity, line.unit_symbol)");
    const inventory = source("src/components/inventory/inventory-manager.tsx");
    expect(inventory).toContain("formatQuantityWithUnit(movement.quantity, \"fr\", movement.allows_decimal_quantity, movement.unit_symbol)");
    expect(inventory).toContain("formatQuantityWithUnit(entry.available_quantity, \"fr\", entry.allows_decimal_quantity, entry.unit_symbol)");
  });

  it("sépare la valeur POS éditable de la quantité interne normalisée", () => {
    const pos = source("src/components/sales/pos-checkout.tsx");
    expect(pos).toContain("const editableQuantity");
    expect(pos).toContain("const normalizeEditableQuantity");
    expect(pos).toContain('inputMode="decimal"');
    expect(pos).toContain('type="text" value={editableQuantity(line.quantity, line.allows_decimal_quantity, locale)}');
    expect(pos).toContain("const normalizedQuantity = normalizeEditableQuantity(quantity, locale)");
  });
});
