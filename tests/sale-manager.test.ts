import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { operationPermission } from "@/lib/sales/operation-permissions";
const source = readFileSync(resolve(process.cwd(), "src/components/sales/sale-manager.tsx"), "utf8");
describe("gestionnaire de ventes", () => {
  it("utilise deux formulaires indépendants et des payloads de type non modifiables", () => { expect(source).toContain("function DirectSaleEditor"); expect(source).toContain("function InvoiceEditor"); expect(source).toContain('createOperation(businessId, "DIRECT_SALE", form)'); expect(source).toContain('createOperation(businessId, "INVOICE", form)'); expect(source).not.toContain("setOperation(\"DIRECT_SALE\")"); });
  it("utilise les contraintes du contrat pour lignes et paiements", () => { expect(source).toContain('min="0.001"'); expect(source).toContain('min="0"'); expect(source).toContain('amount_paid: amount || "0"'); expect(source).toContain("payment_method: method"); expect(source).toContain("finance?receivable="); });
  it("limite les transitions présentées à complete et cancel", () => { expect(source).toContain("/complete"); expect(source).toContain("/cancel"); expect(source).not.toContain("/confirm"); });
  it("sépare toutes les permissions de vente et de facture", () => { expect(operationPermission("DIRECT_SALE", "create")).toBe("SALE_CREATE"); expect(operationPermission("INVOICE", "create")).toBe("INVOICE_CREATE"); expect(operationPermission("DIRECT_SALE", "lineCreate")).toBe("SALE_LINE_CREATE"); expect(operationPermission("INVOICE", "lineCreate")).toBe("INVOICE_UPDATE"); expect(operationPermission("DIRECT_SALE", "issue")).toBe("SALE_COMPLETE"); expect(operationPermission("INVOICE", "issue")).toBe("INVOICE_ISSUE"); expect(operationPermission("DIRECT_SALE", "cancel")).toBe("SALE_CANCEL"); expect(operationPermission("INVOICE", "cancel")).toBe("INVOICE_CANCEL"); expect(operationPermission("INVOICE", "paymentCreate")).toBe("INVOICE_PAYMENT_CREATE"); });
  it("sépare les listes directes et factures avec des présentations responsive", () => {
    expect(source).toContain('scope === "invoices" ? "INVOICE" : "DIRECT_SALE"');
    expect(source).toContain('hidden overflow-x-auto md:block');
    expect(source).toContain('grid gap-3 md:hidden');
    expect(source).toContain("function OperationListView");
    expect(source).toContain("function SaleDetailView");
  });
  it("présente le détail facture sans modifier les actions autorisées", () => {
    expect(source).toContain("Informations générales");
    expect(source).toContain("Récapitulatif financier");
    expect(source).toContain("<InvoicePayments");
    expect(source).toContain("<LineEditor");
    expect(source).toContain("<PaymentEditor");
  });
});
