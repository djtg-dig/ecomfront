export type MoneyCurrency = { code: string; symbol?: string; decimal_places?: number };

const FALLBACKS: Record<string, Omit<MoneyCurrency, "code">> = {
  USD: { symbol: "$", decimal_places: 2 },
  CDF: { symbol: "FC", decimal_places: 2 },
  EUR: { symbol: "€", decimal_places: 2 },
};

function amount(value: string | number, currency: MoneyCurrency) {
  const places = currency.decimal_places ?? FALLBACKS[currency.code]?.decimal_places ?? 2;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return new Intl.NumberFormat("fr-CD", { minimumFractionDigits: places, maximumFractionDigits: places }).format(numeric);
}

export function formatMoney(value: string | number, input: MoneyCurrency | string) {
  const currency = typeof input === "string" ? { code: input, ...FALLBACKS[input] } : { ...FALLBACKS[input.code], ...input };
  const suffix = currency.symbol && currency.symbol !== currency.code ? `${currency.symbol} (${currency.code})` : currency.code;
  return `${amount(value, currency)} ${suffix}`;
}

export function formatPriceRange(minimum: string | number, maximum: string | number, currency: MoneyCurrency | string) {
  const min = String(minimum);
  const max = String(maximum);
  return min === max || Number(min) === Number(max) ? formatMoney(minimum, currency) : `${formatMoney(minimum, currency)} – ${formatMoney(maximum, currency)}`;
}
