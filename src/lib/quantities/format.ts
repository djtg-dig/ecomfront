/**
 * Formats an API decimal quantity for display only. Invalid values are kept
 * intact so the UI never silently rounds or changes a business quantity.
 */
export function formatQuantity(value: string | number, locale: string, allowsDecimalQuantity: boolean) {
  const raw = String(value);
  const match = raw.match(/^(-?)(\d+)(?:\.(\d{1,3}))?$/);
  if (!match) return raw;

  const [, sign, rawInteger, rawFraction = ""] = match;
  const fraction = rawFraction.replace(/0+$/, "");
  if (!allowsDecimalQuantity && fraction) return raw;

  const integer = rawInteger.replace(/^0+(?=\d)/, "");
  const group = locale.toLowerCase().startsWith("fr") ? " " : ",";
  const decimal = locale.toLowerCase().startsWith("fr") ? "," : ".";
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  return `${sign}${grouped}${fraction ? `${decimal}${fraction}` : ""}`;
}

/** Formats a displayed quantity with its presentation unit without changing the API value. */
export function formatQuantityWithUnit(
  value: string | number,
  locale: string,
  allowsDecimalQuantity: boolean,
  unitSymbol: string,
): string {
  const quantity = formatQuantity(value, locale, allowsDecimalQuantity);
  const unit = unitSymbol.trim();
  if (!unit) return quantity;

  if (["PCS", "PCE"].includes(unit.toUpperCase())) {
    const singular = Number(value) === 1;
    if (locale.toLowerCase().startsWith("fr")) return `${quantity} ${singular ? "pce" : "pces"}`;
    return `${quantity} ${singular ? "piece" : "pieces"}`;
  }

  return `${quantity} ${unit.toLowerCase()}`;
}
