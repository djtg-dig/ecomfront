import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("séparation caisse, ventes et factures", () => {
  const manager = source("src/components/sales/sale-manager.tsx");

  it("réserve la caisse aux ventes directes et oriente la création depuis les ventes", () => {
    expect(source("src/components/sales/pos-checkout.tsx")).toContain('operation_type: "DIRECT_SALE"');
    expect(manager).toContain('scope === "invoices" ? "INVOICE" : "DIRECT_SALE"');
    expect(manager).toContain('href={`/espace/entreprises/${businessId}/caisse`}');
  });

  it("présente des routes de listes et détails dédiées aux factures", () => {
    expect(source("src/app/(private)/espace/entreprises/[businessId]/factures/page.tsx")).toContain('scope="invoices"');
    expect(source("src/app/(private)/espace/entreprises/[businessId]/factures/[saleId]/page.tsx")).toContain('scope="invoices"');
    expect(manager).toContain('scope === "legacy" && sale.operation_type === "INVOICE"');
    expect(manager).toContain('factures/${sale.public_id}');
  });

  it("autorise l’édition uniquement des brouillons et les règlements via Finance", () => {
    const editor = source("src/components/sales/invoice-draft-editor.tsx");
    expect(editor).toContain('nextInvoice.operation_type !== "INVOICE" || nextInvoice.status !== "DRAFT"');
    expect(editor).toContain('permissions?.includes("INVOICE_UPDATE")');
    expect(editor).toContain('method: "PATCH"');
    expect(manager).toContain('operationPermission("INVOICE", "paymentCreate")');
    expect(manager).toContain('finance?receivable=${encodeURIComponent(sale.receivable)}#reglement-client');
  });
});
