import { NextResponse, type NextRequest } from "next/server";
import { isLocale, localeCookieName, localeCookieOptions, localeFromAcceptLanguage } from "@/lib/i18n/locale";

/**
 * Persiste la détection serveur du premier visiteur sans modifier ses URLs.
 * Les API sont exclues : leurs réponses ne doivent jamais changer une locale.
 */
export function proxy(request: NextRequest) {
  if (isLocale(request.cookies.get(localeCookieName)?.value)) return NextResponse.next();
  const response = NextResponse.next();
  response.cookies.set(localeCookieName, localeFromAcceptLanguage(request.headers.get("accept-language")), localeCookieOptions());
  return response;
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)"] };
