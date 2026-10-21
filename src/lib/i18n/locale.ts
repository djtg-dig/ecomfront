export const localeCookieName = "ecommerce_locale";
export const supportedLocales = ["fr", "en"] as const;
export type Locale = (typeof supportedLocales)[number];
export const fallbackLocale: Locale = "fr";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && supportedLocales.includes(value as Locale);
}

export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return fallbackLocale;
  const candidates = header.split(",").map((part, order) => {
    const [rawLanguage, ...parameters] = part.trim().split(";");
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const q = quality ? Number(quality.trim().slice(2)) : 1;
    return { language: rawLanguage.toLowerCase().split("-")[0], q: Number.isFinite(q) ? q : 0, order };
  }).filter(({ q }) => q > 0).sort((left, right) => right.q - left.q || left.order - right.order);
  return candidates.find(({ language }) => isLocale(language))?.language as Locale | undefined ?? fallbackLocale;
}

export function localeCookieOptions() {
  return { httpOnly: false, secure: process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_FRONTEND_URL?.startsWith("https://") === true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365 };
}
