export type QuantityRules = { allowsDecimalQuantity: boolean };

export type ValidQuantity = { valid: true; value: string };
export type InvalidQuantity = { valid: false; error: "required" | "invalid" | "integer" | "precision" };
export type QuantityValidation = ValidQuantity | InvalidQuantity;

const maximumIntegerPart = 99_999_999_999;

/** Validates a cart quantity before it crosses the BFF boundary. Django remains authoritative. */
export function validateCartQuantity(input: string, rules: QuantityRules): QuantityValidation {
  const raw = input.trim();
  if (!raw) return { valid: false, error: "required" };
  if (raw.includes(",") && raw.includes(".")) return { valid: false, error: "invalid" };
  const value = raw.replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(value)) return { valid: false, error: "invalid" };
  const [integerPart, decimalPart = ""] = value.split(".");
  const integer = Number(integerPart);
  if (!Number.isSafeInteger(integer) || integer > maximumIntegerPart) return { valid: false, error: "invalid" };
  if (decimalPart.length > 3) return { valid: false, error: "precision" };
  if (!rules.allowsDecimalQuantity && decimalPart.length > 0 && /[1-9]/.test(decimalPart)) return { valid: false, error: "integer" };
  if (integer === 0 && !/[1-9]/.test(decimalPart)) return { valid: false, error: "invalid" };
  return { valid: true, value: decimalPart ? `${integerPart}.${decimalPart}` : integerPart };
}

export function quantityInputAttributes(rules: QuantityRules) {
  return rules.allowsDecimalQuantity ? { min: "0.001", step: "0.001" } : { min: "1", step: "1" };
}

export function displayCartQuantity(value: string, rules: QuantityRules, locale: string) {
  const validation = validateCartQuantity(value, rules);
  if (!validation.valid) return value;
  const [integer, decimal = ""] = validation.value.split(".");
  const fraction = decimal.replace(/0+$/, "");
  const normalized = fraction ? `${integer}.${fraction}` : integer;
  return new Intl.NumberFormat(locale === "en" ? "en" : "fr-CD", {
    maximumFractionDigits: rules.allowsDecimalQuantity ? 3 : 0,
  }).format(Number(normalized));
}
