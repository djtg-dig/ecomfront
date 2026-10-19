export type Currency = { code: string; name: string; symbol: string; decimal_places: number };

export function matchesCurrency(currency: Currency, query: string) {
  const normalized = query.trim().toLocaleLowerCase("fr");
  return !normalized || `${currency.code} ${currency.name} ${currency.symbol}`.toLocaleLowerCase("fr").includes(normalized);
}
