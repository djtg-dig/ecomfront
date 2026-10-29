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
