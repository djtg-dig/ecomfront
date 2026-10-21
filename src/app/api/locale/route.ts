import { NextResponse } from "next/server";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { isLocale, localeCookieName, localeCookieOptions } from "@/lib/i18n/locale";

export async function POST(request: Request) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "La modification de langue n’est pas autorisée." }, { status: 403 });
    const body = await request.json() as { locale?: unknown };
    if (!isLocale(body.locale)) return NextResponse.json({ code: "invalid_locale", detail: "Langue non prise en charge." }, { status: 400 });
    const response = NextResponse.json({ locale: body.locale });
    response.cookies.set(localeCookieName, body.locale, localeCookieOptions());
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch {
    return NextResponse.json({ code: "invalid_locale_request", detail: "La modification de langue est indisponible." }, { status: 400 });
  }
}
