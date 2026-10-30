import { describe, expect, it } from "vitest";

import { displayCartQuantity, quantityInputAttributes, validateCartQuantity } from "@/lib/carts/quantity";

describe("quantités des paniers", () => {
  const pieces = { allowsDecimalQuantity: false };
  const kilograms = { allowsDecimalQuantity: true };

  it("accepte exclusivement des entiers strictement positifs pour une unité indivisible", () => {
    expect(validateCartQuantity("1", pieces)).toEqual({ valid: true, value: "1" });
    expect(validateCartQuantity("10", pieces)).toEqual({ valid: true, value: "10" });
    expect(validateCartQuantity("1.5", pieces)).toMatchObject({ valid: false, error: "integer" });
    expect(validateCartQuantity("0", pieces)).toMatchObject({ valid: false });
    expect(validateCartQuantity("-1", pieces)).toMatchObject({ valid: false });
    expect(validateCartQuantity("1e2", pieces)).toMatchObject({ valid: false });
  });

  it("accepte les fractions jusqu’à trois décimales pour une unité fractionnable", () => {
    expect(validateCartQuantity("0,5", kilograms)).toEqual({ valid: true, value: "0.5" });
    expect(validateCartQuantity("1.25", kilograms)).toEqual({ valid: true, value: "1.25" });
    expect(validateCartQuantity("2.755", kilograms)).toEqual({ valid: true, value: "2.755" });
    expect(validateCartQuantity("2.7555", kilograms)).toMatchObject({ valid: false, error: "precision" });
  });

  it("expose les attributs HTML et le format d’affichage cohérents", () => {
    expect(quantityInputAttributes(pieces)).toEqual({ min: "1", step: "1" });
    expect(quantityInputAttributes(kilograms)).toEqual({ min: "0.001", step: "0.001" });
    expect(displayCartQuantity("2.000", pieces, "fr")).toBe("2");
    expect(displayCartQuantity("1.250", kilograms, "en")).toBe("1.25");
  });
});
