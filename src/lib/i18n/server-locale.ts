import "server-only";

import { cookies, headers } from "next/headers";
import { isLocale, localeCookieName, localeFromAcceptLanguage, type Locale } from "@/lib/i18n/locale";

/** Résout une locale au rendu serveur, avec le cookie avant Accept-Language. */
export async function resolveRequestLocale(): Promise<Locale> {
  const cookieValue = (await cookies()).get(localeCookieName)?.value;
  if (isLocale(cookieValue)) return cookieValue;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}
