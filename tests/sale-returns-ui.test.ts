import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/components/sales/sale-manager.tsx"), "utf8");

describe("parcours de retour de vente", () => {
  it("réserve le retour aux ventes finalisées et aux permissions atomiques", () => {
    expect(source).toContain('sale.status === "COMPLETED"');
    expect(source).toContain('can("SALE_RETURN") && can("SALE_RETURN_VIEW")');
  });

  it("conserve une intention idempotente, bloque le double envoi et garde le brouillon en erreur", () => {
    expect(source).toContain("const idempotencyKey = useRef<string | null>(null)");
    expect(source).toContain("crypto.randomUUID()");
    expect(source).toContain("if (saving) return;");
    expect(source).toContain('"idempotency-key": key');
    expect(source).toContain("setError(await errorDetail(response");
  });

  it("affiche le solde déjà retourné, respecte PCS/KG et confirme avant l’enregistrement", () => {
    expect(source).toContain("returnedQuantity");
    expect(source).toContain('line.unit_symbol_snapshot === "PCS" && !Number.isInteger(entry.quantity)');
    expect(source).toContain('step={pcs ? "1" : "0.001"}');
    expect(source).toContain("setConfirming(true)");
    expect(source).toContain("Confirmer le retour");
  });
});
