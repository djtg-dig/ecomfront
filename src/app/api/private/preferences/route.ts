import { NextResponse } from "next/server";
import { privateFailure, privateJson } from "@/lib/api/private-route";
import { authenticatedBackendRequest, readPrivateSession } from "@/lib/auth/private-session";
import { isSameOriginMutation } from "@/lib/auth/security";
import { getServerConfig } from "@/lib/config/server";
import { isLocale } from "@/lib/i18n/locale";

type Preferences = { preferred_language: "" | "fr" | "en" };

export async function GET(request: Request) {
  try {
    const result = await authenticatedBackendRequest<Preferences>("/api/v1/auth/me/preferences/", readPrivateSession(request));
    return privateJson(result, result.data);
  } catch (error) { return privateFailure(error); }
}

export async function PATCH(request: Request) {
  try {
    if (!isSameOriginMutation(request, getServerConfig())) return NextResponse.json({ code: "csrf_rejected", detail: "La modification de langue n’est pas autorisée." }, { status: 403 });
    const body = await request.json() as { preferred_language?: unknown };
    if (!isLocale(body.preferred_language)) return NextResponse.json({ code: "invalid_locale", detail: "Langue non prise en charge." }, { status: 400 });
    const result = await authenticatedBackendRequest<Preferences>("/api/v1/auth/me/preferences/", readPrivateSession(request), { method: "PATCH", json: { preferred_language: body.preferred_language } });
    return privateJson(result, result.data);
  } catch (error) { return privateFailure(error); }
}
