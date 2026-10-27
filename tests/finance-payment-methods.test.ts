import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  activePaymentMethodOptions,
  canCreateInvoicePayment,
  paymentMethodsForBusiness,
  type Method,
} from "@/components/finance/finance-manager";

const method = (overrides: Partial<Method> = {}): Method => ({
  public_id: "method-cash",
  name: "Caisse principale",
  category: "CASH",
  is_active: true,
  ...overrides,
});

describe("moyens de paiement des règlements de factures", () => {
  it("conserve une méthode active en affichant son nom et en envoyant sa catégorie", () => {
    expect(activePaymentMethodOptions([method()])).toEqual([
      { key: "method-cash", label: "Caisse principale", value: "CASH" },
    ]);
  });

  it("exclut les méthodes désactivées", () => {
    expect(activePaymentMethodOptions([
      method({ is_active: false }),
      method({ public_id: "method-mobile", name: "Mobile entreprise", category: "MOBILE_MONEY" }),
    ])).toEqual([
      { key: "method-mobile", label: "Mobile entreprise", value: "MOBILE_MONEY" },
    ]);
  });

  it("retourne une liste vide lorsqu'aucune méthode active n'est disponible", () => {
    expect(activePaymentMethodOptions([])).toEqual([]);
    expect(activePaymentMethodOptions([method({ is_active: false })])).toEqual([]);
  });

  it("garde le formulaire sous INVOICE_PAYMENT_CREATE et le désactive sans méthode", () => {
    expect(canCreateInvoicePayment(["RECEIVABLE_VIEW"])).toBe(false);
    expect(canCreateInvoicePayment(["RECEIVABLE_PAYMENT_CREATE"])).toBe(false);
    expect(canCreateInvoicePayment(["INVOICE_PAYMENT_CREATE"])).toBe(true);
    const source = readFileSync(resolve(process.cwd(), "src/components/finance/finance-manager.tsx"), "utf8");
    expect(source).toContain('disabled={!hasAvailableMethod}');
    expect(source).toContain('payment_method: data.get("payment_method")');
    expect(source).toContain('"idempotency-key": key');
  });

  it("ne réutilise pas les méthodes d'une autre entreprise", () => {
    const businessAMethods = [method()];
    const businessBMethods = [method({ public_id: "method-bank", name: "Banque B", category: "BANK_TRANSFER" })];
    const methodsByBusiness = { businessA: businessAMethods, businessB: businessBMethods };
    expect(paymentMethodsForBusiness(methodsByBusiness, "businessB")).toBe(businessBMethods);
    expect(paymentMethodsForBusiness(methodsByBusiness, "businessC")).toEqual([]);
  });
});
